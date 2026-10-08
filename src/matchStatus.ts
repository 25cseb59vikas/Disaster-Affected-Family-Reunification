import type { MatchEvent, SiteId } from './types';
import { SITES } from './sites';

/**
 * open → partly_confirmed (one site) → confirmed (both officers) → verified (family answer matches).
 * A family answer that does not match sends the pair back to open; officers confirm again.
 */
export type PairStatus = 'ruled_out' | 'verified' | 'confirmed' | 'partly_confirmed' | 'open';

export interface PairState {
  status: PairStatus;
  confirmedBy: Partial<Record<SiteId, MatchEvent>>;
  ruledOut: MatchEvent | null;
  needInfo: MatchEvent[];
  verifiedBy: MatchEvent | null;
  lastMismatch: MatchEvent | null;
}

export const pairKey = (foundId: string, seekingId: string) => `${foundId}:${seekingId}`;

export function pairState(events: MatchEvent[]): PairState {
  let confirmedBy: PairState['confirmedBy'] = {};
  let ruledOut: MatchEvent | null = null;
  let verifiedBy: MatchEvent | null = null;
  let lastMismatch: MatchEvent | null = null;
  const needInfo: MatchEvent[] = [];
  const bothConfirmed = () => SITES.every(s => confirmedBy[s.id]);

  for (const e of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (e.kind === 'confirm') confirmedBy[e.site] ??= e;
    else if (e.kind === 'rule_out') ruledOut ??= e;
    else if (e.kind === 'family_match' && bothConfirmed()) verifiedBy ??= e;
    else if (e.kind === 'family_mismatch' && !verifiedBy) {
      lastMismatch = e;
      confirmedBy = {};
    } else if (e.kind === 'need_info') needInfo.push(e);
  }

  const confirmedCount = SITES.filter(s => confirmedBy[s.id]).length;
  const status: PairStatus = ruledOut
    ? 'ruled_out'
    : verifiedBy
      ? 'verified'
      : confirmedCount === SITES.length
        ? 'confirmed'
        : confirmedCount > 0
          ? 'partly_confirmed'
          : 'open';
  return { status, confirmedBy, ruledOut, needInfo, verifiedBy, lastMismatch };
}

export function eventsByPair(events: MatchEvent[]): Map<string, MatchEvent[]> {
  const map = new Map<string, MatchEvent[]>();
  for (const e of events) {
    const k = pairKey(e.found_id, e.seeking_id);
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  return map;
}

/** A question for the family about the found person's private detail, without giving the answer away. */
export function familyQuestion(detail: string): string {
  const d = detail.toLowerCase();
  if (/scar|mole|birthmark|birth mark|tattoo|burn|mark/.test(d)) return 'Does the person have a scar, mole, birthmark or tattoo? Where is it?';
  if (/pocket|carry|carried|wallet|purse|bag|card|key|letter|photo/.test(d)) return 'What did the person have in their pocket or bag?';
  if (/ring|chain|bangle|earring|necklace|anklet|thread|jewel/.test(d)) return 'What jewellery or thread does the person usually wear?';
  if (/tooth|teeth/.test(d)) return "Is there anything noticeable about the person's teeth?";
  return 'Describe something about the person that only the family would know.';
}
