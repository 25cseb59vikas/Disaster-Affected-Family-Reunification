// How this device uses Reunite, chosen on the first screen and remembered.
export type Role = 'volunteer' | 'console' | 'family';

const ROLE_KEY = 'reunite.role';

export const ROLE_HOME: Record<Role, string> = { volunteer: '/', console: '/console', family: '/family' };

export function storedRole(): Role | null {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    return r === 'volunteer' || r === 'console' || r === 'family' ? r : null;
  } catch {
    return null;
  }
}

export function chooseRole(role: Role) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
  location.assign(ROLE_HOME[role]);
}

/** Back to "How are you using Reunite?". */
export function switchRole() {
  try {
    localStorage.removeItem(ROLE_KEY);
  } catch {
    /* nothing stored */
  }
  location.assign('/');
}
