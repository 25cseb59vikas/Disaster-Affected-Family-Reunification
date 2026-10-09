export type ScreenId =
  | 'choose_site'
  | 'register_choose_type'
  | 'register_speak'
  | 'verify_details'
  | 'saved'
  | 'notifications'
  | 'record_detail'
  | 'suggested_matches'
  | 'match_review'
  | 'search_records'
  | 'priority_cases';

// Officer sites: camp-a, hospital-b. The others register records but never count as a site confirmation:
// phone-line (simulated phone registrations), authority (the console's desk), family-app (families on their own phone).
export type SiteId = 'camp-a' | 'hospital-b' | 'phone-line' | 'authority' | 'family-app';
export type RecordType = 'found' | 'seeking';
export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type AgeBand = 'Under 12' | '12–18' | '19–59' | '60+';

export interface LookingFor {
  relation: string;
  name: string | null;
}

/**
 * One registered person, in the same shape on the device and the server.
 * Found: the fields describe the person found here.
 * Seeking: name, gender, age band and clothing describe the missing person;
 * relative_name is the person searching and relative_relation their relation to the missing person.
 */
export interface PersonRecord {
  id: string; // UUID made on the device
  code: string; // short code to read out or write down, e.g. "A-7K3Q"
  site: SiteId;
  type: RecordType;
  created_at: string; // ISO time
  registered_by: string;
  name: string | null;
  gender: Gender;
  age_band: AgeBand | null;
  village: string | null;
  relative_name: string | null;
  relative_relation: string | null;
  clothing_marks: string | null;
  found_where: string | null;
  last_seen?: string | null; // seeking only: where the family last saw them
  contact_phone?: string | null; // seeking only: the searching relative's phone
  source?: 'app' | 'phone' | 'family'; // phone = the simulated phone line; family = the family app
  private_detail?: string | null; // found only: for the family check; never shown to searchers or on /status
  household_id: string | null;
  has_missing_family: boolean;
  looking_for: LookingFor[];
  transcript: string | null;
  photo: string | null; // small JPEG data URL
}

export interface OutboxItem {
  id: string;
  kind: 'record' | 'event';
  payload: PersonRecord | MatchEvent;
}

export type MatchEventKind = 'confirm' | 'rule_out' | 'need_info' | 'family_match' | 'family_mismatch';

/** An officer's decision on a suggested pair. Synced like records. */
export interface MatchEvent {
  id: string;
  kind: MatchEventKind;
  found_id: string;
  seeking_id: string;
  site: SiteId;
  officer: string;
  reason: string | null;
  created_at: string;
}

/** A suggested found/seeking pair, computed on the server. */
export interface Suggestion {
  id: string; // `${found_id}:${seeking_id}`
  found_id: string;
  seeking_id: string;
  hidden?: boolean; // the server no longer suggests this pair
  score: number;
  band: 'Strong' | 'Possible';
  ambiguous: boolean;
  reasons_for: string[];
  reasons_against: string[];
  unknown: string[];
  ask_next: string | null;
  nameless?: boolean; // found record has no name: matched on description only
}

/** Something the volunteer at this site should look at. seen/toasted are 0/1 so they can be indexed. */
export interface AppNotification {
  id: string; // e.g. "match:<pair>", "confirm:<event id>", "verified:<pair>"
  // match: a new suggestion; confirm: the other site confirmed; authority: the authority accepted;
  // rejected: the match was ruled out; verified: the family check passed.
  kind: 'match' | 'confirm' | 'authority' | 'rejected' | 'verified';
  suggestion_id: string;
  text: string;
  created_at: string;
  seen: 0 | 1;
  toasted: 0 | 1;
}

export interface MetaRow {
  key: string;
  value: number | string;
}
