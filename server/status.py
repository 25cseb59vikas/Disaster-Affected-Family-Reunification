"""Public family status by record code: one status sentence, no names, no location until verified.
Never returns record fields, so the private detail cannot leak here."""
from fastapi import APIRouter, HTTPException

from . import store

# Officer sites. A pair needs a confirmation from each officer site where its two records were registered
# (one site when both are at the same site). The authority desk can register people and accept a match;
# its acceptance counts only when neither record is at an officer site. Same rule as requiredSites() in the app.
OFFICER_SITES = {"camp-a", "hospital-b"}
SITE_NAMES = {"camp-a": "Camp A", "hospital-b": "Hospital B", "authority": "Authority desk"}

router = APIRouter()


def required_sites(found: dict | None, seeking: dict | None) -> set[str]:
    if found is None or seeking is None:
        return set(OFFICER_SITES)
    sites = {found.get("site"), seeking.get("site")} & OFFICER_SITES
    return sites or {"authority"}


def verified(events: list[dict], required: set[str] = OFFICER_SITES) -> bool:
    """Same rules as the app: every required site confirms, then the family answer matches.
    A family answer that does not match clears the confirmations."""
    if any(e["kind"] == "rule_out" for e in events):
        return False
    confirmed: set[str] = set()
    for e in sorted(events, key=lambda e: e.get("created_at") or ""):
        if e["kind"] == "confirm":
            confirmed.add(e["site"])
        elif e["kind"] == "family_mismatch":
            confirmed.clear()
        elif e["kind"] == "family_match" and confirmed >= required:
            return True
    return False


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

    by_id = {r["id"]: r for r in store.all_records()}
    for (found_id, seeking_id), events in pairs.items():
        if verified(events, required_sites(by_id.get(found_id), by_id.get(seeking_id))):
            found = by_id.get(found_id, record)
            return {"status": "found", "help_desk": SITE_NAMES.get(found["site"], found["site"])}

    ruled_out = {k for k, evs in pairs.items() if any(e["kind"] == "rule_out" for e in evs)}
    checking = any(s[side] == rid and (s["found_id"], s["seeking_id"]) not in ruled_out
                   for s in store.visible_suggestions())
    # Until a match is confirmed, only the site where this record was registered is shown.
    return {"status": "checking" if checking else "searching",
            # None for records from the phone line or family app, which have no help desk of their own.
            "help_desk": SITE_NAMES.get(record["site"])}
