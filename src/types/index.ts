export type ScreenId =
  | 'choose_site'
  | 'register_choose_type'
  | 'register_speak'
  | 'verify_details'
  | 'suggested_matches'
  | 'match_review'
  | 'family_status_portal'
  | 'search_records'
  | 'priority_cases';

export type RegistrationType = 'found' | 'missing';

export type Gender = 'Male' | 'Female' | 'Other' | 'Unknown';
export type AgeBand = 'Under 12' | '12–18' | '19–59' | '60+';

export interface LookingFor {
  relation: string;
  name: string | null;
}

export interface PersonRecord {
  id?: number;
  syncId: string;
  type: RegistrationType; // 'found' (Person found here) or 'missing' (Looking for someone)
  name: string;
  gender: Gender;
  ageBand: AgeBand | null;
  approxAge?: number;
  village: string;
  relativeName: string; // Father / spouse
  relativeRelation?: string;
  foundWhere?: string;
  lookingFor?: LookingFor[];
  relativeNeedsCheck?: boolean; // Amber highlight "Please check"
  clothingMarks: string;
  hasMissingFamily: boolean;
  photoUrl?: string;
  status: 'Registered' | 'Possible match' | 'Reunited' | 'Under Review';
  site: string;
  registeredBy: string;
  transcript?: string;
  createdAt: number;
  synced: boolean;
  isUrgent?: boolean;
  urgentReason?: string; // 'Child alone', 'Not identified', 'No match after 24 hours'
}

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
  score: number; // e.g. 87 or 72
  scoreLabel: string; // "87% Strong match", "72% Possible match"
  reasons: string[];
  step: 1 | 2 | 3 | 4; // 1: officer 1 done, 2: officer 2 pending, 3: family verification, 4: reunited
  status: 'pending' | 'reviewing' | 'verified' | 'dismissed';
}

export interface SiteInfo {
  id: string;
  name: string;
  organization: string;
  activeCount: number;
}
