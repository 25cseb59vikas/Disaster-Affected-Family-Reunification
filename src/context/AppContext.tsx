import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ScreenId, RegistrationType, MatchPair, PersonRecord } from '../types';
import { db, seedInitialData } from '../db/database';

interface VoiceDraft {
  transcript: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  ageBand: 'Under 12' | '12–18' | '19–59' | '60+';
  approxAge?: number;
  village: string;
  relativeName: string;
  relativeNeedsCheck: boolean;
  clothingMarks: string;
  hasMissingFamily: boolean;
  photoUrl?: string;
}

interface AppContextType {
  currentScreen: ScreenId;
  navigateTo: (screen: ScreenId) => void;
  goBack: () => void;
  canGoBack: boolean;
  currentSite: string;
  setCurrentSite: (site: string) => void;
  currentOrg: string;
  setCurrentOrg: (org: string) => void;
  volunteerName: string;
  setVolunteerName: (name: string) => void;
  registrationType: RegistrationType;
  setRegistrationType: (type: RegistrationType) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  offlineCount: number;
  syncOfflineQueue: () => Promise<void>;
  voiceDraft: VoiceDraft;
  setVoiceDraft: React.Dispatch<React.SetStateAction<VoiceDraft>>;
  resetVoiceDraft: () => void;
  selectedMatch: MatchPair | null;
  setSelectedMatch: (match: MatchPair | null) => void;
  saveNewPerson: (person: Partial<PersonRecord>) => Promise<number>;
}

const defaultDraft: VoiceDraft = {
  transcript: "Transcript: Murugan, around 35 years old, male, from Kilvelur, father Ramasamy, wearing blue shirt and black pants",
  name: "Murugan",
  gender: "Male",
  ageBand: "19–59",
  approxAge: 35,
  village: "Kilvelur",
  relativeName: "Ramasamy",
  relativeNeedsCheck: true, // System is unsure about father's name, amber check
  clothingMarks: "Blue shirt, black pants, scar on left eyebrow",
  hasMissingFamily: false,
  photoUrl: ""
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['choose_site']);
  const [currentSite, setCurrentSite] = useState<string>('Camp A – Govt. High School');
  const [currentOrg, setCurrentOrg] = useState<string>('Organization A');
  const [volunteerName, setVolunteerName] = useState<string>('Sundaram');
  const [registrationType, setRegistrationType] = useState<RegistrationType>('found');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [offlineCount, setOfflineCount] = useState<number>(12);
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft>(defaultDraft);
  const [selectedMatch, setSelectedMatch] = useState<MatchPair | null>(null);

  useEffect(() => {
    seedInitialData();
  }, []);

  const currentScreen = screenHistory[screenHistory.length - 1];

  const navigateTo = (screen: ScreenId) => {
    setScreenHistory(prev => [...prev, screen]);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      setScreenHistory(prev => prev.slice(0, prev.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const canGoBack = screenHistory.length > 1;

  const resetVoiceDraft = () => {
    setVoiceDraft({
      transcript: "",
      name: "",
      gender: "Male",
      ageBand: "19–59",
      approxAge: undefined,
      village: "",
      relativeName: "",
      relativeNeedsCheck: false,
      clothingMarks: "",
      hasMissingFamily: false,
      photoUrl: ""
    });
  };

  const syncOfflineQueue = async () => {
    // Simulate syncing Dexie offline queue with central disaster registry
    setIsOnline(true);
    await new Promise(r => setTimeout(r, 600));
    setOfflineCount(0);
    // Mark records as synced in Dexie
    await db.records.where('synced').equals(0).modify({ synced: true });
  };

  const saveNewPerson = async (person: Partial<PersonRecord>) => {
    const newRecord: PersonRecord = {
      syncId: `rec-${Date.now()}`,
      type: registrationType,
      name: person.name || 'Unnamed Person',
      gender: person.gender || 'Male',
      ageBand: person.ageBand || '19–59',
      approxAge: person.approxAge,
      village: person.village || 'Unknown',
      relativeName: person.relativeName || '',
      relativeNeedsCheck: person.relativeNeedsCheck ?? false,
      clothingMarks: person.clothingMarks || '',
      hasMissingFamily: person.hasMissingFamily ?? false,
      photoUrl: person.photoUrl,
      status: 'Possible match',
      site: currentSite,
      registeredBy: volunteerName,
      transcriptSnippet: person.transcriptSnippet,
      createdAt: Date.now(),
      synced: false
    };

    const id = await db.records.add(newRecord);
    setOfflineCount(prev => prev + 1);
    return id;
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        goBack,
        canGoBack,
        currentSite,
        setCurrentSite,
        currentOrg,
        setCurrentOrg,
        volunteerName,
        setVolunteerName,
        registrationType,
        setRegistrationType,
        isOnline,
        setIsOnline,
        offlineCount,
        syncOfflineQueue,
        voiceDraft,
        setVoiceDraft,
        resetVoiceDraft,
        selectedMatch,
        setSelectedMatch,
        saveNewPerson
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
