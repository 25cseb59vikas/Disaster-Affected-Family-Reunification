import type { SiteDatabase } from './db/database';
import type { MatchEvent, MatchEventKind, PersonRecord, RecordType, SiteId } from './types';
import { recordCode, uuid } from './sites';

export type NewPerson = Omit<PersonRecord, 'id' | 'code' | 'site' | 'type' | 'created_at' | 'registered_by'>;

/** Saves a new record on this device and queues it for sync, in one transaction. */
export async function saveRecord(db: SiteDatabase, site: SiteId, type: RecordType, registeredBy: string, person: NewPerson) {
  const record: PersonRecord = {
    ...person,
    id: uuid(),
    code: recordCode(site),
    site,
    type,
    created_at: new Date().toISOString(),
    registered_by: registeredBy
  };
  // Every missing person becomes an independent, matchable search, linked to the
  // person who arrived. Keep the legacy looking_for array for older clients.
  const linked: PersonRecord[] = type === 'found'
    ? (record.looking_for || []).filter(p => p.name?.trim() || p.clothing_marks?.trim()).map(p => ({
        id: uuid(), code: recordCode(site), site, type: 'seeking' as const,
        created_at: record.created_at, registered_by: registeredBy,
        name: p.name?.trim() || null, gender: p.gender || 'unknown',
        age_band: p.age_band || null, village: record.village,
        relative_name: record.name, relative_relation: p.relation || null,
        clothing_marks: p.clothing_marks || null, found_where: null,
        last_seen: p.last_seen || null, contact_phone: record.contact_phone || null,
        source: record.source || 'app', private_detail: null,
        household_id: record.household_id || record.id, searcher_id: record.id,
        has_missing_family: false, looking_for: [], transcript: null, photo: null
      }))
    : [];
  if (linked.length && !record.household_id) record.household_id = record.id;
  await db.transaction('rw', db.records, db.outbox, async () => {
    for (const item of [record, ...linked]) {
      await db.records.add(item);
      await db.outbox.add({ id: item.id, kind: 'record', payload: item });
    }
  });
  return record;
}

/** Stores an officer's decision on a pair and queues it for sync. */
export async function saveEvent(
  db: SiteDatabase,
  site: SiteId,
  officer: string,
  kind: MatchEventKind,
  foundId: string,
  seekingId: string,
  reason?: string
) {
  const event: MatchEvent = {
    id: uuid(),
    kind,
    found_id: foundId,
    seeking_id: seekingId,
    site,
    officer,
    reason: reason?.trim() || null,
    created_at: new Date().toISOString()
  };
  await db.transaction('rw', db.events, db.outbox, async () => {
    await db.events.add(event);
    await db.outbox.add({ id: event.id, kind: 'event', payload: event });
  });
  return event;
}
