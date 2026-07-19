'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { type AgentProfile } from '@/components/docente-datos-panel';
import { LegajoPanel } from '@/components/legajo-panel';
import { RevistaPanel } from '@/components/revista-panel';
import { LicenciasPanel } from '@/components/licencias-panel';
import { AttendanceGrid } from '@/components/attendance-grid';
import { AttendanceListPanel } from '@/components/attendance-list-panel';
import { ClassSchedulePanel } from '@/components/class-schedule-panel';
import { FichaStatsRow } from '@/components/ficha-stats-row';
import { FichaTabs } from '@/components/ficha-tabs';

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
  const [stats, setStats] = useState({
    faltasInjustificadas: 0,
    faltasJustificadas: 0,
    diasLicencia: 0,
  });

  const loadStats = useCallback(async (agentId: number) => {
    const currentYear = new Date().getFullYear();

    try {
      const [attendanceRes, licensesRes] = await Promise.all([
        api.get('/attendance/me/stats', { params: { year: currentYear } }),
        api.get(`/licenses/agent/${agentId}`),
      ]);

      const diasLicencia = (
        licensesRes.data as Array<{ start_date: string; days_count: number }>
      )
        .filter((l) => new Date(l.start_date).getFullYear() === currentYear)
        .reduce((sum, l) => sum + l.days_count, 0);

      setStats({
        faltasInjustificadas: attendanceRes.data?.counts?.AUSENTE_INJUSTIFICADO ?? 0,
        faltasJustificadas: attendanceRes.data?.counts?.LICENCIA ?? 0,
        diasLicencia,
      });
    } catch (error) {
      console.error('No se pudieron cargar las estadísticas del perfil:', error);
    }
  }, []);

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
      void loadStats(currentUser.agent_id);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

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

            {agent ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="/mi-perfil/planilla-revista?tipo=actual"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Imprimir revista actual
                </a>
                <a
                  href="/mi-perfil/planilla-revista?tipo=historica"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Imprimir revista histórica
                </a>
              </div>
            ) : null}
          </div>

          {message ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {message}
            </div>
          ) : null}

          {agent ? (
            <>
              <LegajoPanel agent={agent} />

              <FichaStatsRow
                cargosActivos={
                  (agent.assignments ?? []).filter(
                    (a) => a.id && (a.status === 'ACTIVA' || a.is_active),
                  ).length
                }
                faltasInjustificadas={stats.faltasInjustificadas}
                faltasJustificadas={stats.faltasJustificadas}
                diasLicencia={stats.diasLicencia}
                year={new Date().getFullYear()}
              />

              <FichaTabs
                tabs={[
                  {
                    key: 'cargos',
                    label: 'Cargos',
                    badge: (agent.assignments ?? []).filter(
                      (a) => a.id && (a.status === 'ACTIVA' || a.is_active),
                    ).length,
                    content: (
                      <div className="space-y-6">
                        <RevistaPanel
                          agent={agent}
                          canManage={canManage}
                          onRefreshProfile={loadProfile}
                        />

                        <ClassSchedulePanel
                          year={new Date().getFullYear()}
                          readOnly
                          cargos={(agent.assignments ?? [])
                            .filter((a) => a.id && (a.status === 'ACTIVA' || a.is_active))
                            .map((a) => ({
                              assignmentId: a.id as number,
                              label: a.pof_position?.subject_name
                                ? `${a.pof_position.subject_name}${
                                    a.pof_position.course
                                      ? ` · ${a.pof_position.course}${
                                          a.pof_position.division
                                            ? ' ' + a.pof_position.division
                                            : ''
                                        }`
                                      : ''
                                  }`
                                : 'Horario de clase',
                              shiftLabel: a.pof_position?.shift ?? undefined,
                            }))}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'inasistencias',
                    label: 'Inasistencias',
                    content: (
                      <div className="space-y-6">
                        <AttendanceListPanel source={{ kind: 'me' }} canManage={canManage} />
                        <AttendanceGrid source={{ kind: 'me' }} canManage={canManage} />
                      </div>
                    ),
                  },
                  {
                    key: 'licencias',
                    label: 'Licencias',
                    content: (
                      <LicenciasPanel
                        agentId={agent.id}
                        agentName={agent.full_name}
                        canManage={canManage}
                      />
                    ),
                  },
                ]}
              />
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}
