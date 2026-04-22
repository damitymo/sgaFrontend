'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { type AgentProfile } from '@/components/docente-datos-panel';
import { LegajoPanel } from '@/components/legajo-panel';
import { RevistaPanel } from '@/components/revista-panel';
import { AttendanceGrid } from '@/components/attendance-grid';

type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  agent_id?: number | null;
};

export default function MiPerfilPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');

      const storedUser = localStorage.getItem('user');

      let currentUser: AuthUser | null = null;

      if (storedUser) {
        currentUser = JSON.parse(storedUser);
        setUser(currentUser);
      } else {
        const res = await api.get<AuthUser>('/auth/me');
        currentUser = res.data;
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(res.data));
      }

      if (!currentUser?.agent_id) {
        setMessage(
          'Tu usuario no está vinculado a un docente/agente. Contactá a administración.',
        );
        return;
      }

      const response = await api.get<AgentProfile>(
        `/agents/${currentUser.agent_id}/full-profile`,
      );

      setAgent(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
          <AppHeader />
          <section className="mx-auto max-w-7xl px-6 py-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Cargando perfil...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  // En /mi-perfil el agente nunca puede gestionar su propia revista.
  const canManage = false;

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Mi perfil
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {user?.full_name || 'Usuario'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Información personal, situación de revista y libro de asistencia individual.
            </p>
          </div>

          {message ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {message}
            </div>
          ) : null}

          {agent ? (
            <>
              <LegajoPanel agent={agent} />

              <RevistaPanel
                agent={agent}
                canManage={canManage}
                onRefreshProfile={loadProfile}
              />

              <AttendanceGrid source={{ kind: 'me' }} canManage={canManage} />
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}
