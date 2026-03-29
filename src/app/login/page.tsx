'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type LoginUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
};

type LoginResponse = {
  access_token: string;
  user: LoginUser;
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
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
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm space-y-6">
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Acceso al sistema
          </p>
          <h1 className="text-3xl font-bold text-slate-800">SGA</h1>
          <p className="mt-2 text-slate-600">
            Sistema de Gestión Administrativa Escolar
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Ingresá tu usuario"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Ingresá tu contraseña"
            />
          </div>
        </div>

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-slate-800 px-4 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </main>
  );
}