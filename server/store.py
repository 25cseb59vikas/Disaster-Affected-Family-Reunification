"""SQLite storage for synced records, officer events and match suggestions.

Every insert or change gets the next value of one global sequence number, so a
client can pull "everything after seq N" from all three tables with one cursor.
"""
import json
import os
import sqlite3
import threading
from pathlib import Path

DB_PATH = Path(os.getenv("REUNITE_DB", Path(__file__).parent / "data" / "reunite.db"))

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY, code TEXT, site TEXT, type TEXT, origin TEXT,
    created_at TEXT, seq INTEGER, data TEXT);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, kind TEXT, found_id TEXT, seeking_id TEXT, site TEXT, origin TEXT,
    created_at TEXT, seq INTEGER, data TEXT);
CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY, found_id TEXT, seeking_id TEXT, seq INTEGER, data TEXT);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS records_seq ON records(seq);
CREATE INDEX IF NOT EXISTS records_code ON records(code);
CREATE INDEX IF NOT EXISTS events_seq ON events(seq);
CREATE INDEX IF NOT EXISTS suggestions_seq ON suggestions(seq);
"""


def conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.executescript(SCHEMA)
    return _conn


def _next_seq(c: sqlite3.Connection) -> int:
    row = c.execute("SELECT value FROM meta WHERE key = 'seq'").fetchone()
    seq = (int(row["value"]) if row else 0) + 1
    c.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('seq', ?)", (str(seq),))
    return seq


def get_meta(key: str) -> str | None:
    row = conn().execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_meta(key: str, value: str) -> None:
    with _lock:
        c = conn()
        c.execute("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", (key, value))
        c.commit()


def current_seq() -> int:
    row = conn().execute("SELECT value FROM meta WHERE key = 'seq'").fetchone()
    return int(row["value"]) if row else 0


def add_records(records: list[dict], origin: str) -> list[str]:
    """Stores new records; ids already stored are left alone. Returns every id now safely stored."""
    accepted = []
    with _lock:
        c = conn()
        for r in records:
            if not isinstance(r, dict) or not r.get("id") or r.get("type") not in ("found", "seeking"):
                continue
            if c.execute("SELECT 1 FROM records WHERE id = ?", (r["id"],)).fetchone() is None:
                c.execute(
                    "INSERT INTO records (id, code, site, type, origin, created_at, seq, data) VALUES (?,?,?,?,?,?,?,?)",
                    (r["id"], r.get("code"), r.get("site"), r["type"], origin, r.get("created_at"),
                     _next_seq(c), json.dumps(r)))
            accepted.append(r["id"])
        c.commit()
    return accepted


def add_events(events: list[dict], origin: str) -> list[str]:
    accepted = []
    with _lock:
        c = conn()
        for e in events:
            if not isinstance(e, dict) or not e.get("id") or not e.get("kind"):
                continue
            if c.execute("SELECT 1 FROM events WHERE id = ?", (e["id"],)).fetchone() is None:
                c.execute(
                    "INSERT INTO events (id, kind, found_id, seeking_id, site, origin, created_at, seq, data) "
                    "VALUES (?,?,?,?,?,?,?,?,?)",
                    (e["id"], e["kind"], e.get("found_id"), e.get("seeking_id"), e.get("site"), origin,
                     e.get("created_at"), _next_seq(c), json.dumps(e)))
            accepted.append(e["id"])
        c.commit()
    return accepted


def all_records() -> list[dict]:
    return [json.loads(r["data"]) for r in conn().execute("SELECT data FROM records ORDER BY seq")]


def all_events() -> list[dict]:
    return [json.loads(r["data"]) for r in conn().execute("SELECT data FROM events ORDER BY seq")]


def record_by_code(code: str) -> dict | None:
    row = conn().execute("SELECT data FROM records WHERE upper(code) = upper(?)", (code,)).fetchone()
    return json.loads(row["data"]) if row else None


def replace_suggestions(suggestions: list[dict]) -> int:
    """Makes the stored set equal to `suggestions`. Changed or new rows get a new seq; rows that
    disappeared are kept as {"hidden": true} so clients pulling later remove them. Returns rows changed."""
    changed = 0
    with _lock:
        c = conn()
        current = {r["id"]: r["data"] for r in c.execute("SELECT id, data FROM suggestions")}
        wanted = {s["id"]: json.dumps(s, sort_keys=True) for s in suggestions}
        for sid, data in wanted.items():
            if current.get(sid) != data:
                s = json.loads(data)
                c.execute("INSERT OR REPLACE INTO suggestions (id, found_id, seeking_id, seq, data) VALUES (?,?,?,?,?)",
                          (sid, s["found_id"], s["seeking_id"], _next_seq(c), data))
                changed += 1
        for sid, data in current.items():
            if sid not in wanted and not json.loads(data).get("hidden"):
                old = json.loads(data)
                hidden = json.dumps({"id": sid, "found_id": old["found_id"], "seeking_id": old["seeking_id"],
                                     "hidden": True}, sort_keys=True)
                c.execute("UPDATE suggestions SET seq = ?, data = ? WHERE id = ?", (_next_seq(c), hidden, sid))
                changed += 1
        c.commit()
    return changed


def visible_suggestions() -> list[dict]:
    rows = (json.loads(r["data"]) for r in conn().execute("SELECT data FROM suggestions"))
    return [s for s in rows if not s.get("hidden")]


def pull(since: int, site: str) -> dict:
    """Everything changed after `since`, except records this site pushed itself."""
    c = conn()
    with _lock:
        cursor = current_seq()
        records = [json.loads(r["data"]) for r in c.execute(
            "SELECT data FROM records WHERE seq > ? AND seq <= ? AND origin != ? ORDER BY seq", (since, cursor, site))]
        events = [json.loads(r["data"]) for r in c.execute(
            "SELECT data FROM events WHERE seq > ? AND seq <= ? ORDER BY seq", (since, cursor))]
        suggestions = [json.loads(r["data"]) for r in c.execute(
            "SELECT data FROM suggestions WHERE seq > ? AND seq <= ? ORDER BY seq", (since, cursor))]
    return {"cursor": cursor, "records": records, "events": events, "suggestions": suggestions}


def reset() -> None:
    with _lock:
        c = conn()
        # The sequence is kept so client cursors stay valid.
        c.executescript("DELETE FROM records; DELETE FROM events; DELETE FROM suggestions;")
        c.commit()
