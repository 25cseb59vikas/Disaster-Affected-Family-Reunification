"""One fictional case for demonstrations: a boy found at Hospital B and his father's search at Camp A.
Adapted from the teammate's "Load fictional demo family". Fixed ids, so loading it twice adds nothing."""
from datetime import datetime, timezone

from . import matching, store

DEMO_BY = "Demo family (fictional)"
FOUND_ID = "d3e0f000-0000-4000-8000-00000000f001"
SEEKING_ID = "d3e0f000-0000-4000-8000-00000000f002"


def records() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    common = {"created_at": now, "registered_by": DEMO_BY, "gender": "male", "age_band": "Under 12",
              "village": "Kilvelur", "relative_name": "Ravi Kumar", "relative_relation": "father",
              "household_id": None, "transcript": None, "photo": None, "source": "app"}
    return [
        {**common, "id": FOUND_ID, "code": "B-DMFY", "site": "hospital-b", "type": "found", "name": "Arunkumar",
         "clothing_marks": "Blue school shirt, khaki shorts", "found_where": "Near the bridge", "last_seen": None,
         "contact_phone": None, "private_detail": "Small scar on the left knee", "has_missing_family": True,
         "looking_for": [{"relation": "father", "name": "Ravi Kumar"}]},
        {**common, "id": SEEKING_ID, "code": "A-DMFY", "site": "camp-a", "type": "seeking", "name": "Arun Kumar",
         "clothing_marks": "Blue shirt", "found_where": None, "last_seen": "Near the bridge, separated during the flood",
         "contact_phone": "00000 00000 (fictional)", "private_detail": None, "has_missing_family": False,
         "looking_for": []},
    ]


def load() -> int:
    """Adds the two records if they are not there yet. Returns how many were new."""
    new = [r for r in records() if store.record_by_code(r["code"]) is None]
    store.add_records(new, origin="loader")
    matching.update_suggestions()
    return len(new)
