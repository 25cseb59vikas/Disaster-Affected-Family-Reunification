import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AgeBand, Gender, LookingFor, MatchEventKind, PersonRecord, RecordType, ScreenId, SiteId } from '../types';
import { getMeta, siteDb, type SiteDatabase } from '../db/database';
import { AUTHORITY, FAMILY_APP, PHONE_LINE, SITES } from '../sites';
import { serverHealth, syncOnce } from '../sync';
import { saveEvent, saveRecord, type NewPerson } from '../records';

export type { NewPerson };

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

export type SyncStatus = 'offline' | 'syncing' | 'synced';

const SYNC_EVERY_MS = 15000;
const SITE_KEY = 'reunite.site';
const EPOCH_KEY = 'reunite.demoEpoch';
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
  lastBytesSent: number;
  syncNow: () => Promise<void>;
  voiceDraft: VoiceDraft;
  setVoiceDraft: React.Dispatch<React.SetStateAction<VoiceDraft>>;
  lastSavedId: string | null;
  saveNewPerson: (person: NewPerson, type?: RecordType) => Promise<PersonRecord>;
  addEvent: (kind: MatchEventKind, foundId: string, seekingId: string, reason?: string) => Promise<void>;
  selectedSuggestionId: string | null;
  setSelectedSuggestionId: (id: string | null) => void;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Every local database a demo reset clears.
const ALL_LOCAL = [...SITES.map(s => s.id), PHONE_LINE.id, AUTHORITY.id, FAMILY_APP.id];

interface AppProviderProps {
  children: React.ReactNode;
  /** Pin to one site (the authority console); the remembered field-app site is then left alone. */
  fixedSite?: SiteId;
  /** Name stored on records and decisions when the site is pinned. */
  officer?: string;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, fixedSite, officer }) => {
  const initialSite = fixedSite ?? (stored(SITE_KEY) as SiteId | null);
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([initialSite ? 'register_choose_type' : 'choose_site']);
  const [site, setSite] = useState<SiteId>(initialSite ?? 'camp-a');
  const [volunteerName, setVolunteerName] = useState<string>(officer ?? stored(VOLUNTEER_KEY) ?? '');
  useEffect(() => {
    if (officer !== undefined) setVolunteerName(officer);
  }, [officer]);
  const [registrationType, setRegistrationType] = useState<RecordType>('found');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft>(emptyDraft);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const db = siteDb(site);
  const waitingCount = useLiveQuery(() => db.outbox.count(), [db], 0);
  const lastBytesSent = useLiveQuery(() => getMeta(db, 'last_bytes_sent', 0), [db], 0);

  // Remove the database from the old prototype (fake seed data).
  useEffect(() => {
    Dexie.delete('ReuniteReliefDB').catch(() => {});
  }, []);

  // One sync at a time per site. A sync still running for a site we switched away from
  // must neither block the new site's sync nor overwrite its status.
  // A request made while that site is syncing runs again afterwards, even after switching away,
  // so a confirmation tapped just before "Switch" is still sent.
  const syncingSites = useRef(new Set<SiteId>());
  const pendingSites = useRef(new Set<SiteId>());
  const currentSite = useRef(site);
  currentSite.current = site;
  const runSync = useRef(async (targetDb: SiteDatabase, target: SiteId): Promise<void> => {
    if (syncingSites.current.has(target)) {
      pendingSites.current.add(target);
      return;
    }
    syncingSites.current.add(target);
    const setStatus = (s: SyncStatus) => {
      if (currentSite.current === target) setSyncStatus(s);
    };
    try {
      const health = await serverHealth();
      if (!health) {
        setStatus('offline');
        return;
      }
      // "Reset demo" on /sim: clear both sites' local data before pushing anything old.
      const seen = stored(EPOCH_KEY);
      if (health.demo_epoch && seen && seen !== health.demo_epoch) {
        store(EPOCH_KEY, health.demo_epoch);
        await Promise.all(ALL_LOCAL.map(id => siteDb(id).delete()));
        location.reload();
        return;
      }
      if (health.demo_epoch && !seen) store(EPOCH_KEY, health.demo_epoch);
      setStatus('syncing');
      await syncOnce(targetDb, target);
      setStatus('synced');
    } catch (err) {
      console.warn('Sync failed', err);
      setStatus('offline');
    } finally {
      syncingSites.current.delete(target);
      if (pendingSites.current.delete(target)) runSync.current(targetDb, target);
    }
  });
  const syncNow = useCallback(() => runSync.current(db, site), [db, site]);

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

  const saveNewPerson = async (person: NewPerson, type: RecordType = registrationType) => {
    const record = await saveRecord(db, site, type, volunteerName, person);
    setLastSavedId(record.id);
    syncNow();
    return record;
  };

  const addEvent = async (kind: MatchEventKind, foundId: string, seekingId: string, reason?: string) => {
    await saveEvent(db, site, volunteerName, kind, foundId, seekingId, reason);
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
        lastBytesSent,
        syncNow,
        voiceDraft,
        setVoiceDraft,
        lastSavedId,
        saveNewPerson,
        addEvent,
        selectedSuggestionId,
        setSelectedSuggestionId,
        selectedRecordId,
        setSelectedRecordId
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
