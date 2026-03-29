export type LoggedUser = {
  id: number;
  full_name: string;
  username: string;
  role: string;
};

export function getUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('user');

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Puede gestionar el sistema (docentes, usuarios, etc.)
 */
export function canManageSystem() {
  const user = getUser();
  return user?.role === 'ADMIN' || user?.role === 'ADMINISTRATIVO';
}

/**
 * Solo administrativo
 */
export function isAdministrative() {
  const user = getUser();
  return user?.role === 'ADMINISTRATIVO';
}

/**
 * Solo admin puro
 */
export function isSuperAdmin() {
  const user = getUser();
  return user?.role === 'ADMIN';
}

/**
 * Otros roles futuros
 */
export function isAgent() {
  const user = getUser();
  return user?.role === 'AGENTE';
}