import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  AgeBand,
  Gender,
  LookingFor,
  MatchEvent,
  MatchEventKind,
  MatchPair,
  PersonRecord,
  RecordType,
  ScreenId,
  SiteId
} from '../types';
import { getMeta, siteDb, type SiteDatabase } from '../db/database';
import { recordCode, uuid } from '../sites';
import { serverReachable, syncOnce } from '../sync';

// Fields filled from the voice server (or empty when typing). `unsure` lists
// the server's field names that the volunteer should check.
export interface VoiceDraft {
  transcript: string;
  name: string;
  gender: Gender;
  ageBand: AgeBand | null;
  village: string;
  relativeName: string;
  relativeRelation: string;
  clothingMarks: string;
  foundWhere: string;
  lookingFor: LookingFor[];
  unsure: string[];
  notice: string;
}

export const emptyDraft: VoiceDraft = {
  transcript: '',
  name: '',
  gender: 'unknown',
  ageBand: null,
  village: '',
  relativeName: '',
  relativeRelation: '',
  clothingMarks: '',
  foundWhere: '',
  lookingFor: [],
  unsure: [],
  notice: ''
};

export type NewPerson = Omit<PersonRecord, 'id' | 'code' | 'site' | 'type' | 'created_at' | 'registered_by'>;

export type SyncStatus = 'offline' | 'syncing' | 'synced';

const SYNC_EVERY_MS = 15000;
const SITE_KEY = 'reunite.site';
const VOLUNTEER_KEY = 'reunite.volunteer';

const stored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
};

interface AppContextType {
  currentScreen: ScreenId;
  navigateTo: (screen: ScreenId) => void;
  goBack: () => void;
  canGoBack: boolean;
  site: SiteId;
  db: SiteDatabase;
  chooseSite: (site: SiteId, volunteer: string) => void;
  volunteerName: string;
  registrationType: RecordType;
  setRegistrationType: (type: RecordType) => void;
  syncStatus: SyncStatus;
  waitingCount: number;
  bytesSent: number;
  syncNow: () => Promise<void>;
  voiceDraft: VoiceDraft;
  setVoiceDraft: React.Dispatch<React.SetStateAction<VoiceDraft>>;
  lastSavedId: string | null;
  saveNewPerson: (person: NewPerson) => Promise<PersonRecord>;
  addEvent: (kind: MatchEventKind, foundId: string, seekingId: string, reason?: string) => Promise<void>;
  selectedSuggestionId: string | null;
  setSelectedSuggestionId: (id: string | null) => void;
  selectedMatch: MatchPair | null;
  setSelectedMatch: (match: MatchPair | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSite = stored(SITE_KEY) as SiteId | null;
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([initialSite ? 'register_choose_type' : 'choose_site']);
  const [site, setSite] = useState<SiteId>(initialSite ?? 'camp-a');
  const [volunteerName, setVolunteerName] = useState<string>(stored(VOLUNTEER_KEY) ?? '');
  const [registrationType, setRegistrationType] = useState<RecordType>('found');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft>(emptyDraft);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchPair | null>(null);

  const db = siteDb(site);
  const waitingCount = useLiveQuery(() => db.outbox.count(), [db], 0);
  const bytesSent = useLiveQuery(() => getMeta(db, 'bytes_sent', 0), [db], 0);

  // Remove the database from the old prototype (fake seed data).
  useEffect(() => {
    Dexie.delete('ReuniteReliefDB').catch(() => {});
  }, []);

  const syncing = useRef(false);
  const syncNow = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      if (!(await serverReachable())) {
        setSyncStatus('offline');
        return;
      }
      setSyncStatus('syncing');
      await syncOnce(db, site);
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Sync failed', err);
      setSyncStatus('offline');
    } finally {
      syncing.current = false;
    }
  }, [db, site]);

  useEffect(() => {
    syncNow();
    const timer = window.setInterval(syncNow, SYNC_EVERY_MS);
    return () => clearInterval(timer);
  }, [syncNow]);

  const currentScreen = screenHistory[screenHistory.length - 1];

  const navigateTo = (screen: ScreenId) => setScreenHistory(prev => [...prev, screen]);

  const goBack = () => {
    if (screenHistory.length > 1) setScreenHistory(prev => prev.slice(0, prev.length - 1));
  };

  const chooseSite = (next: SiteId, volunteer: string) => {
    // The status shown so far belonged to the previous site.
    if (next !== site) setSyncStatus('syncing');
    setSite(next);
    setVolunteerName(volunteer);
    store(SITE_KEY, next);
    store(VOLUNTEER_KEY, volunteer);
    setLastSavedId(null);
    setSelectedSuggestionId(null);
    setScreenHistory(['register_choose_type']);
  };

  const saveNewPerson = async (person: NewPerson) => {
    const record: PersonRecord = {
      ...person,
      id: uuid(),
      code: recordCode(site),
      site,
      type: registrationType,
      created_at: new Date().toISOString(),
      registered_by: volunteerName
    };
    await db.transaction('rw', db.records, db.outbox, async () => {
      await db.records.add(record);
      await db.outbox.add({ id: record.id, kind: 'record', payload: record });
    });
    setLastSavedId(record.id);
    syncNow();
    return record;
  };

  const addEvent = async (kind: MatchEventKind, foundId: string, seekingId: string, reason?: string) => {
    const event: MatchEvent = {
      id: uuid(),
      kind,
      found_id: foundId,
      seeking_id: seekingId,
      site,
      officer: volunteerName,
      reason: reason?.trim() || null,
      created_at: new Date().toISOString()
    };
    await db.transaction('rw', db.events, db.outbox, async () => {
      await db.events.add(event);
      await db.outbox.add({ id: event.id, kind: 'event', payload: event });
    });
    syncNow();
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        goBack,
        canGoBack: screenHistory.length > 1,
        site,
        db,
        chooseSite,
        volunteerName,
        registrationType,
        setRegistrationType,
        syncStatus,
        waitingCount,
        bytesSent,
        syncNow,
        voiceDraft,
        setVoiceDraft,
        lastSavedId,
        saveNewPerson,
        addEvent,
        selectedSuggestionId,
        setSelectedSuggestionId,
        selectedMatch,
        setSelectedMatch
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
