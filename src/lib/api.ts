import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Habilita el envío automático de la cookie httpOnly `access_token`
  // que setea el backend en /auth/login. El CORS del backend tiene
  // `credentials: true`, así que funciona cross-origin (Vercel ↔ Render).
  withCredentials: true,
});

// Interceptor de response: si el backend responde 401 en cualquier request
// autenticada, asumimos que la cookie venció o se invalidó y pateamos al
// user al login. También limpiamos el `user` de localStorage (sólo es info
// no sensible, pero sin cookie válida ya no sirve de nada).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      const isOnLogin = window.location.pathname.startsWith('/login');
      if (!isOnLogin) {
        localStorage.removeItem('user');
        window.location.replace('/login');
      }
    }

    console.error(
      'API ERROR:',
      error?.response?.data || error?.message || error,
    );
    return Promise.reject(error);
  },
);

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

/**
 * Logout: llama al backend para que limpie la cookie httpOnly y también
 * limpia el user de localStorage. Uselo desde un botón "Cerrar sesión".
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Si falla por red igual seguimos con el logout local; lo peor que
    // puede pasar es que la cookie quede hasta que expire sola.
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    window.location.replace('/login');
  }
}
