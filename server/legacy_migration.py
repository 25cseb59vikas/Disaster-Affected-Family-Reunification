"""Idempotent conversion of older found-record looking_for arrays into linked searches.

This never creates a second search if a newer client already supplied linked ones.
"""
from uuid import UUID, uuid5


def linked_searches(records: list[dict]) -> list[dict]:
    linked_ids = {r.get('searcher_id') for r in records if r.get('type') == 'seeking' and r.get('searcher_id')}
    result = []
    for person in records:
        if person.get('type') != 'found' or person.get('id') in linked_ids:
            continue
        for index, missing in enumerate(person.get('looking_for') or []):
            if not isinstance(missing, dict) or not (missing.get('name') or missing.get('clothing_marks')):
                continue
            # Stable identifier across server restarts and repeated synchronization.
            identifier = str(uuid5(UUID('f8e9f9b0-5290-49a6-b923-9e90d1db1038'), f"{person['id']}:{index}"))
            result.append({
                'id': identifier, 'code': f"{person.get('code', 'L')}-L{index + 1}",
                'site': person.get('site'), 'type': 'seeking',
                'created_at': person.get('created_at'), 'registered_by': person.get('registered_by', 'migration'),
                'name': missing.get('name'), 'gender': missing.get('gender') or 'unknown',
                'age_band': missing.get('age_band'), 'village': person.get('village'),
                'relative_name': person.get('name'), 'relative_relation': missing.get('relation'),
                'clothing_marks': missing.get('clothing_marks'), 'last_seen': missing.get('last_seen'),
                'found_where': None, 'contact_phone': person.get('contact_phone'),
                'household_id': person.get('household_id') or person['id'], 'searcher_id': person['id'],
                'source': person.get('source', 'app'), 'private_detail': None,
                'has_missing_family': False, 'looking_for': [], 'transcript': None, 'photo': None,
            })
    return result


def migrate_stored_records(store) -> int:
    """Safe to run repeatedly. Preserve original records and their reference codes."""
    current = store.all_records()
    generated = linked_searches(current)
    if generated:
        store.add_records(generated, origin='legacy-migration')
    return len(generated)
