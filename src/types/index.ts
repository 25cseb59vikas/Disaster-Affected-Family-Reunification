export type ScreenId =
  | 'choose_site'
  | 'register_choose_type'
  | 'register_speak'
  | 'verify_details'
  | 'saved'
  | 'suggested_matches'
  | 'match_review'
  | 'family_status_portal'
  | 'search_records'
  | 'priority_cases';

export type SiteId = 'camp-a' | 'hospital-b';
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

export type MatchEventKind = 'confirm' | 'rule_out' | 'need_info';

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
}

export interface MetaRow {
  key: string;
  value: number | string;
}

// Legacy shape still used by the Review and Priority screens until they move to suggestions.
export interface MatchPair {
  id?: number;
  matchId: string;
  foundPerson: {
    name: string;
    age: number | string;
    photoUrl: string;
    village: string;
    relativeName: string;
    site: string;
  };
  searchedPerson: {
    name: string;
    age: number | string;
    photoUrl: string;
    village: string;
    relativeName: string;
    site: string;
  };
  score: number;
  scoreLabel: string;
  reasons: string[];
  step: 1 | 2 | 3 | 4;
  status: 'pending' | 'reviewing' | 'verified' | 'dismissed';
}
