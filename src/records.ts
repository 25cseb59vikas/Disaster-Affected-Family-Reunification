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
  await db.transaction('rw', db.records, db.outbox, async () => {
    await db.records.add(record);
    await db.outbox.add({ id: record.id, kind: 'record', payload: record });
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
