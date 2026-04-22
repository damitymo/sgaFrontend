'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type LoginUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  agent_id?: number | null;
  must_change_password?: boolean;
};

type LoginResponse = {
  user: LoginUser;
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (loading) return;
    if (!username.trim() || !password) {
      setMessage('Completá usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // El backend devuelve { user } y setea la cookie httpOnly
      // `access_token` con el JWT.
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      const { user } = response.data;

      // Guardamos el user en localStorage sólo para UI; el token vive en
      // la cookie httpOnly.
      localStorage.setItem('user', JSON.stringify(user));

      router.push('/');
    } catch (error) {
      console.error('Error de login:', error);
      setMessage('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Acceso al sistema
          </p>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            SGA
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Sistema de Gestión Administrativa Escolar
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Usuario
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400"
              placeholder="Ingresá tu usuario"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400"
              placeholder="Ingresá tu contraseña"
            />
          </div>
        </div>

        {message ? (
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
