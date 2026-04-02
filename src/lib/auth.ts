export type LoggedUser = {
  id: number;
  full_name: string;
  username: string;
  role: string;
  agent_id?: number | null;
  is_active?: boolean;
  must_change_password?: boolean;
};

export function getUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('user');

  if (!stored) return null;

  try {
    return JSON.parse(stored) as LoggedUser;
  } catch {
    return null;
  }
}

export function canManageSystem() {
  const user = getUser();
  return user?.role === 'ADMIN' || user?.role === 'ADMINISTRATIVO';
}

export function isAdministrative() {
  const user = getUser();
  return user?.role === 'ADMINISTRATIVO';
}

export function isSuperAdmin() {
  const user = getUser();
  return user?.role === 'ADMIN';
}

export function isAgent() {
  const user = getUser();
  return user?.role === 'AGENTE';
}