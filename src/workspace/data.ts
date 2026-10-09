import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../context/AppContext';
import { eventsByPair, pairState, requiredFor, type PairState } from '../matchStatus';
import type { MatchEvent, PersonRecord, Suggestion } from '../types';

export interface ConsoleData {
  records: PersonRecord[];
  byId: Map<string, PersonRecord>;
  suggestions: Suggestion[];
  events: Map<string, MatchEvent[]>;
  states: Map<string, PairState>;
}

/** Everything the console has pulled from all sites, plus each pair's state. Undefined while loading. */
export function useConsoleData(): ConsoleData | undefined {
  const { db } = useApp();
  return useLiveQuery(async () => {
    const [records, suggestions, events] = await Promise.all([
      db.records.orderBy('created_at').reverse().toArray(),
      db.suggestions.toArray(),
      db.events.toArray()
    ]);
    const byPair = eventsByPair(events);
    const byId = new Map(records.map(r => [r.id, r]));
    return {
      records,
      byId,
      suggestions,
      events: byPair,
      states: new Map(suggestions.map(s => [s.id, pairState(byPair.get(s.id) ?? [], requiredFor(s.id, byId))]))
    };
  }, [db]);
}

export const personLabel = (r?: PersonRecord) => (r ? r.name ?? `Name not known (${r.code})` : 'Not synced yet');
