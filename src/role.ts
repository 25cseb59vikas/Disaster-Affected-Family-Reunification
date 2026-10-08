// How this device uses Reunite, chosen on the first screen and remembered.
export type Role = 'volunteer' | 'console' | 'family';

const ROLE_KEY = 'reunite.role';
// Set once the device has been through the role choice (or "Change role"), so the legacy rule below stops applying.
const ASKED_KEY = 'reunite.roleAsked';
const SITE_KEY = 'reunite.site';

export const ROLE_HOME: Record<Role, string> = { volunteer: '/', console: '/console', family: '/family' };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
};

export function storedRole(): Role | null {
  const r = read(ROLE_KEY);
  return r === 'volunteer' || r === 'console' || r === 'family' ? r : null;
}

/**
 * The role for this device. A device set up as a site before roles existed becomes a volunteer device,
 * once: the choice is then stored like any other, so "Change role" really goes back to the first screen.
 */
export function deviceRole(): Role | null {
  const role = storedRole();
  if (role) return role;
  if (read(ASKED_KEY) === null && read(SITE_KEY) !== null) {
    write(ROLE_KEY, 'volunteer');
    write(ASKED_KEY, '1');
    return 'volunteer';
  }
  return null;
}

// Both use replace, not assign: the first screen never stays in the history behind the app,
// so Back cannot bounce between "/" and the redirect it causes.
export function chooseRole(role: Role) {
  write(ROLE_KEY, role);
  write(ASKED_KEY, '1');
  location.replace(ROLE_HOME[role]);
}

/** "Change role": forget the role and go back to "How are you using Reunite?". */
export function switchRole() {
  write(ROLE_KEY, null);
  write(ASKED_KEY, '1');
  location.replace('/');
}
