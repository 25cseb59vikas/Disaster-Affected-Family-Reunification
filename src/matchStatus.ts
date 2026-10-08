import type { MatchEvent, SiteId } from './types';
import { SITES } from './sites';

export type PairStatus = 'ruled_out' | 'confirmed' | 'partly_confirmed' | 'open';

export interface PairState {
  status: PairStatus;
  confirmedBy: Partial<Record<SiteId, MatchEvent>>;
  ruledOut: MatchEvent | null;
  needInfo: MatchEvent[];
}

export const pairKey = (foundId: string, seekingId: string) => `${foundId}:${seekingId}`;

/** A pair is confirmed once an officer at every site has confirmed it; any rule-out ends it. */
export function pairState(events: MatchEvent[]): PairState {
  const confirmedBy: PairState['confirmedBy'] = {};
  let ruledOut: MatchEvent | null = null;
  const needInfo: MatchEvent[] = [];
  for (const e of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (e.kind === 'confirm') confirmedBy[e.site] ??= e;
    else if (e.kind === 'rule_out') ruledOut ??= e;
    else needInfo.push(e);
  }
  const confirmedCount = SITES.filter(s => confirmedBy[s.id]).length;
  const status: PairStatus = ruledOut
    ? 'ruled_out'
    : confirmedCount === SITES.length
      ? 'confirmed'
      : confirmedCount > 0
        ? 'partly_confirmed'
        : 'open';
  return { status, confirmedBy, ruledOut, needInfo };
}

export function eventsByPair(events: MatchEvent[]): Map<string, MatchEvent[]> {
  const map = new Map<string, MatchEvent[]>();
  for (const e of events) {
    const k = pairKey(e.found_id, e.seeking_id);
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  return map;
}
