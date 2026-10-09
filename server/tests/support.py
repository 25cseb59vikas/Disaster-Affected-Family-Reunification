"""Shared set-up for the server tests: a temporary database (set before any server module is imported),
a test client for the sync and status routes, and helpers that build records the way the apps do."""
import os
import tempfile
import uuid
import warnings

os.environ["REUNITE_DB"] = os.path.join(tempfile.mkdtemp(prefix="reunite-unit-"), "unit.db")
os.environ["LINK_DELAY_MS"] = "0"
warnings.filterwarnings("ignore", category=DeprecationWarning)

from fastapi.testclient import TestClient  # noqa: E402

from server import store  # noqa: E402
from server.testserver import make_app  # noqa: E402

client = TestClient(make_app())
_codes = iter(range(1000, 100000))
_clock = iter(range(100000))


def reset() -> None:
    store.reset()


def record(site: str, type_: str, **fields) -> dict:
    prefix = {"camp-a": "A", "hospital-b": "B", "camp-c": "C", "family-app": "F", "phone-line": "P", "authority": "D"}.get(site, "X")
    r = dict(id=str(uuid.uuid4()), code=f"{prefix}-{next(_codes)}", site=site, type=type_,
             created_at="2026-10-09T10:00:00Z", registered_by="test", name=None, gender="unknown", age_band=None,
             village=None, relative_name=None, relative_relation=None, clothing_marks=None, found_where=None,
             household_id=None, has_missing_family=False, looking_for=[], transcript=None, photo=None)
    if site == "family-app":
        r["source"] = "family"
    elif site == "phone-line":
        r["source"] = "phone"
    r.update(fields)
    return r


def push(site: str, records=(), events=()) -> dict:
    res = client.post("/sync/push", json={"site": site, "records": list(records), "events": list(events)})
    assert res.status_code == 200, res.text
    return res.json()


def pull(site: str, since: int = 0) -> dict:
    return client.get(f"/sync/pull?since={since}&site={site}").json()


def status(code: str) -> dict:
    return client.get(f"/status/{code}").json()


def suggestions() -> list[dict]:
    return store.visible_suggestions()


def pair(found: dict, seeking: dict) -> dict | None:
    return next((s for s in suggestions() if s["found_id"] == found["id"] and s["seeking_id"] == seeking["id"]), None)


def event(kind: str, found: dict, seeking: dict, site: str, officer: str = "test") -> dict:
    return dict(id=str(uuid.uuid4()), kind=kind, found_id=found["id"], seeking_id=seeking["id"], site=site,
                officer=officer, reason=None, created_at=_stamp())


def _stamp() -> str:
    n = next(_clock)  # increasing, so the order of events is the order they were made
    return f"2026-10-09T{11 + n // 3600:02d}:{n // 60 % 60:02d}:{n % 60:02d}Z"
