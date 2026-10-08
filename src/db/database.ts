import Dexie, { type Table } from 'dexie';
import type { PersonRecord, MatchPair, SiteInfo } from '../types';

export class ReuniteDatabase extends Dexie {
  records!: Table<PersonRecord, number>;
  matches!: Table<MatchPair, number>;
  sites!: Table<SiteInfo, number>;

  constructor() {
    super('ReuniteReliefDB');
    this.version(1).stores({
      records: '++id, syncId, type, name, village, status, synced, isUrgent, createdAt',
      matches: '++id, matchId, status, step, score',
      sites: '++id, id, name, organization'
    });
  }
}

export const db = new ReuniteDatabase();

// Seed initial disaster camp data if database is new
export async function seedInitialData() {
  const count = await db.records.count();
  if (count > 0) return;

  // Initial Sites
  await db.sites.bulkAdd([
    { id: 'camp-a', name: 'Camp A – Govt. High School', organization: 'Organization A', activeCount: 142 },
    { id: 'camp-b', name: 'Camp B – Velankanni Relief Center', organization: 'Organization B', activeCount: 98 },
    { id: 'camp-c', name: 'Camp C – Kilvelur Primary School', organization: 'Organization A', activeCount: 72 }
  ]);

  // Seed records for the demo screens
  await db.records.bulkAdd([
    {
      syncId: 'rec-1',
      type: 'found',
      name: 'Meenakshi K.',
      gender: 'Female',
      ageBand: '19–59',
      approxAge: 42,
      village: 'Thirukkuvalai',
      relativeName: 'Kuppusamy',
      clothingMarks: 'Green saree with yellow border',
      hasMissingFamily: true,
      status: 'Possible match',
      site: 'Camp A – Govt. High School',
      registeredBy: 'Sundaram',
      createdAt: Date.now() - 3600000 * 5,
      synced: false
    },
    {
      syncId: 'rec-2',
      type: 'found',
      name: 'Meenakshi R.',
      gender: 'Female',
      ageBand: '19–59',
      approxAge: 19,
      village: 'Velankanni',
      relativeName: 'Ravi',
      clothingMarks: 'Blue churidar',
      hasMissingFamily: false,
      status: 'Registered',
      site: 'General Hospital Ward 4',
      registeredBy: 'Priya',
      createdAt: Date.now() - 3600000 * 12,
      synced: true
    },
    {
      syncId: 'rec-3',
      type: 'found',
      name: 'Meenakshi Ammal',
      gender: 'Female',
      ageBand: '60+',
      approxAge: 68,
      village: 'Sirkazhi',
      relativeName: 'Narayanan',
      clothingMarks: 'White and red cotton saree',
      hasMissingFamily: false,
      status: 'Reunited',
      site: 'Camp A – Govt. High School',
      registeredBy: 'Sundaram',
      createdAt: Date.now() - 3600000 * 48,
      synced: true
    },
    {
      syncId: 'rec-4',
      type: 'found',
      name: 'Aravind',
      gender: 'Male',
      ageBand: 'Under 12',
      approxAge: 7,
      village: 'Nagapattinam Coast',
      relativeName: 'Unknown',
      clothingMarks: 'Yellow t-shirt, blue shorts',
      hasMissingFamily: true,
      status: 'Registered',
      site: 'Camp A – Govt. High School',
      registeredBy: 'Sundaram',
      createdAt: Date.now() - 3600000 * 8,
      synced: false,
      isUrgent: true,
      urgentReason: 'Child alone'
    },
    {
      syncId: 'rec-5',
      type: 'found',
      name: 'Unknown Male',
      gender: 'Male',
      ageBand: '19–59',
      approxAge: 45,
      village: 'Unknown',
      relativeName: 'Cannot recall',
      clothingMarks: 'Grey shirt, injured arm bandage',
      hasMissingFamily: true,
      status: 'Registered',
      site: 'Camp A – Govt. High School',
      registeredBy: 'Sundaram',
      createdAt: Date.now() - 3600000 * 16,
      synced: false,
      isUrgent: true,
      urgentReason: 'Not identified'
    },
    {
      syncId: 'rec-6',
      type: 'found',
      name: 'Lakshmi Narayanan',
      gender: 'Male',
      ageBand: '60+',
      approxAge: 71,
      village: 'Kilvelur South',
      relativeName: 'Parvathi',
      clothingMarks: 'White dhoti, spectacles',
      hasMissingFamily: true,
      status: 'Registered',
      site: 'Camp B – Velankanni Relief Center',
      registeredBy: 'Sundaram',
      createdAt: Date.now() - 3600000 * 26,
      synced: true,
      isUrgent: true,
      urgentReason: 'No match after 24 hours'
    }
  ]);

  // Seed suggested matches for the Matches and Review screens
  await db.matches.bulkAdd([
    {
      matchId: 'match-1',
      foundPerson: {
        name: 'Kavitha R.',
        age: 8,
        photoUrl: '',
        village: 'Kilvelur',
        relativeName: 'Rajan',
        site: 'Camp A – Govt. High School'
      },
      searchedPerson: {
        name: 'Kavitha Rajan',
        age: 8,
        photoUrl: '',
        village: 'Kilvelur',
        relativeName: 'Rajan',
        site: 'Camp B – Velankanni'
      },
      score: 87,
      scoreLabel: '87% Strong match',
      reasons: [
        'Names sound alike',
        'Same village (Kilvelur)',
        'Father\'s name matches'
      ],
      step: 2, // Step 2 is active: "2. Officer at other site confirms"
      status: 'pending'
    },
    {
      matchId: 'match-2',
      foundPerson: {
        name: 'Senthil Kumar',
        age: 35,
        photoUrl: '',
        village: 'Nagapattinam',
        relativeName: 'Muthu',
        site: 'Camp A – Govt. High School'
      },
      searchedPerson: {
        name: 'Senthil K.',
        age: 36,
        photoUrl: '',
        village: 'Nagore',
        relativeName: 'Muthu K.',
        site: 'Camp C – Kilvelur'
      },
      score: 72,
      scoreLabel: '72% Possible match',
      reasons: [
        'Same name and age',
        'Phonetic match'
      ],
      step: 1,
      status: 'pending'
    }
  ]);
}
