import { siteName } from './sites';
import { eventsByPair, pairState, requiredFor } from './matchStatus';
import type { PersonRecord, SiteId, Suggestion } from './types';

// Priority rules for the authority console (the volunteer app no longer has a Priority list).
export interface Case {
  key: string;
  rank: number;
  title: string;
  reason: string;
  reasonColor: string;
  detail: string;
  created_at: string;
  suggestionId?: string;
  recordId?: string; // the record the case is about
}

// Simple rules, most urgent first. Each case says why it is on the list.
// site = null: every site (the authority console).
export function buildCases(site: SiteId | null, records: PersonRecord[], suggestions: Suggestion[], events: ReturnType<typeof eventsByPair>) {
  const byId = new Map(records.map(r => [r.id, r]));
  const states = new Map(suggestions.map(s => [s.id, pairState(events.get(s.id) ?? [], requiredFor(s.id, byId))]));
  const reunited = new Set<string>();
  const bestFor = new Map<string, Suggestion>();
  for (const s of suggestions) {
    const st = states.get(s.id)!;
    if (st.status === 'verified') reunited.add(s.found_id).add(s.seeking_id);
    if (st.status === 'ruled_out') continue;
    if ((bestFor.get(s.found_id)?.score ?? -1) < s.score) bestFor.set(s.found_id, s);
  }

  const cases: Case[] = [];
  for (const r of records) {
    if (r.type !== 'found' || (site && r.site !== site) || reunited.has(r.id)) continue;
    const detail = [r.age_band, r.clothing_marks].filter(Boolean).join(' · ') || r.code;
    if (r.age_band === 'Under 12') {
      cases.push({ key: `child-${r.id}`, rank: 0, title: r.name ?? 'Child, name not known', reason: 'Child, no family located yet',
        reasonColor: 'text-urgent', detail, created_at: r.created_at, suggestionId: bestFor.get(r.id)?.id, recordId: r.id });
    } else if (!r.name) {
      cases.push({ key: `noname-${r.id}`, rank: 1, title: `Person ${r.code}`, reason: 'No name recorded',
        reasonColor: 'text-pending', detail, created_at: r.created_at, suggestionId: bestFor.get(r.id)?.id, recordId: r.id });
    }
  }
  for (const s of suggestions) {
    const st = states.get(s.id)!;
    const familyCheck = st.status === 'confirmed';
    const waiting =
      familyCheck || ((st.status === 'partly_confirmed' || (st.status === 'open' && s.band === 'Strong')) && !(site && st.confirmedBy[site]));
    if (!waiting) continue;
    const f = byId.get(s.found_id);
    const required = requiredFor(s.id, byId);
    const other = required.find(x => st.confirmedBy[x]) ?? '';
    const missing = required.filter(x => !st.confirmedBy[x]).map(siteName).join(' and ');
    cases.push({
      key: `confirm-${s.id}`,
      rank: 2,
      title: f?.name ?? `Person ${f?.code ?? ''}`,
      reason: familyCheck
        ? 'Sites confirmed: ask the family question'
        : st.status === 'partly_confirmed'
          ? `Confirmed at ${siteName(other)}, waiting for ${site ? 'you' : missing}`
          : 'Strong match waiting for confirmation',
      reasonColor: 'text-civilBlue',
      detail: `Match score ${s.score}`,
      created_at: f?.created_at ?? '',
      suggestionId: s.id,
      recordId: f?.id
    });
  }
  cases.sort((a, b) => a.rank - b.rank || a.created_at.localeCompare(b.created_at));
  return { cases, reunitedPairs: [...states.values()].filter(s => s.status === 'verified').length, reunited };
}
