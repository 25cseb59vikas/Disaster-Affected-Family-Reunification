"""Public family status by record code: one status sentence, no names, no location until confirmed."""
from fastapi import APIRouter, HTTPException

from . import store

SITE_NAMES = {"camp-a": "Camp A", "hospital-b": "Hospital B"}

router = APIRouter()


def confirmed(events: list[dict]) -> bool:
    if any(e["kind"] == "rule_out" for e in events):
        return False
    return {e["site"] for e in events if e["kind"] == "confirm"} >= set(SITE_NAMES)


@router.get("/status/{code}")
def family_status(code: str):
    record = store.record_by_code(code.strip())
    if record is None:
        raise HTTPException(404, "No record with that code")
    rid = record["id"]
    side = "found_id" if record["type"] == "found" else "seeking_id"

    pairs: dict[tuple[str, str], list[dict]] = {}
    for e in store.all_events():
        if e.get(side) == rid:
            pairs.setdefault((e["found_id"], e["seeking_id"]), []).append(e)

    for (found_id, _), events in pairs.items():
        if confirmed(events):
            found = next((r for r in store.all_records() if r["id"] == found_id), record)
            return {"status": "found", "help_desk": SITE_NAMES.get(found["site"], found["site"])}

    ruled_out = {k for k, evs in pairs.items() if any(e["kind"] == "rule_out" for e in evs)}
    checking = any(s[side] == rid and (s["found_id"], s["seeking_id"]) not in ruled_out
                   for s in store.visible_suggestions())
    # Until a match is confirmed, only the site where this record was registered is shown.
    return {"status": "checking" if checking else "searching",
            "help_desk": SITE_NAMES.get(record["site"], record["site"])}
