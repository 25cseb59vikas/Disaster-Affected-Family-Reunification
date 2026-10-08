import type { SiteId } from './types';

// Officer sites. Every one of them confirms a match; the phone line is not one of them.
export const SITES: Array<{ id: SiteId; name: string; helper: string; codePrefix: string }> = [
  { id: 'camp-a', name: 'Camp A', helper: 'Relief camp', codePrefix: 'A' },
  { id: 'hospital-b', name: 'Hospital B', helper: 'Hospital', codePrefix: 'B' }
];

export const PHONE_LINE = { id: 'phone-line' as SiteId, name: 'Phone line', codePrefix: 'P' };
// The authority console registers at its own desk and can endorse matches, but is not one of the two officer sites.
export const AUTHORITY = { id: 'authority' as SiteId, name: 'Authority desk', codePrefix: 'D' };
// Families reporting on their own phone. Push only: this source never downloads other records.
export const FAMILY_APP = { id: 'family-app' as SiteId, name: 'Family app', codePrefix: 'F' };

const OTHER_SOURCES = [PHONE_LINE, AUTHORITY, FAMILY_APP];

export const siteName = (id: string) => SITES.find(s => s.id === id)?.name ?? OTHER_SOURCES.find(s => s.id === id)?.name ?? id;

/** RFC 4122 v4 UUID. crypto.randomUUID needs HTTPS, so build it from getRandomValues (works on plain HTTP too). */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// No 0/O, 1/I/L: easy to read out loud and write down.
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function recordCode(site: SiteId): string {
  const prefix = [...SITES, ...OTHER_SOURCES].find(s => s.id === site)?.codePrefix ?? 'X';
  const r = crypto.getRandomValues(new Uint8Array(4));
  return `${prefix}-${[...r].map(x => CODE_CHARS[x % CODE_CHARS.length]).join('')}`;
}
