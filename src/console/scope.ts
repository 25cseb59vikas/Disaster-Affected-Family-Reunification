import { createContext, useContext } from 'react';
import { AUTHORITY, FAMILY_APP, PHONE_LINE, SITES } from '../sites';

/** The top bar's site selector: which site's people the console pages show. A view filter only. */
export const SCOPE_SITES = [...SITES, PHONE_LINE, FAMILY_APP, AUTHORITY];
export const SCOPE_KEY = 'reunite.consoleSite';

export const storedScope = () => {
  try {
    return localStorage.getItem(SCOPE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const ConsoleScope = createContext<{ site: string; setSite: (site: string) => void }>({ site: '', setSite: () => {} });
export const useScope = () => useContext(ConsoleScope);
