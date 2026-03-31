'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

type LoggedUser = {
  id: number;
  full_name: string;
  username: string;
  role: string;
  agent_id?: number | null;
};

type AgentItem = {
  id: number;
  full_name: string;
  dni: string;
  birth_date?: string | null;
  email?: string | null;
  is_active?: boolean;
};

type AttendanceItem = {
  id: number;
  agent_id: number;
  record_type: 'LICENCIA' | 'AUSENTE' | 'CAPACITACION' | 'CONSTANCIA' | 'PARO';
  start_date?: string | null;
  end_date?: string | null;
  quantity_days?: number | null;
  description?: string | null;
  document_number?: string | null;
};

type BirthdayItem = {
  id: number;
  full_name: string;
  dni: string;
  birth_date: string;
  day: number;
};

function formatDate(date?: string | null) {
  if (!date) return '-';

  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;

  return safe.toLocaleDateString('es-AR');
}

function getMonthName(month: number) {
  const names = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return names[month - 1] || '';
}

function getLoggedUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('user');
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LoggedUser;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loggedUser = getLoggedUser();
    setUser(loggedUser);

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setMessage('');

        const [agentsResponse, attendanceResponse] = await Promise.all([
          api.get('/agents'),
          api.get('/attendance'),
        ]);

        setAgents((agentsResponse.data as AgentItem[]) ?? []);
        setAttendance((attendanceResponse.data as AttendanceItem[]) ?? []);
      } catch (error) {
        console.error(error);
        setMessage('No se pudieron cargar los datos del panel principal.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const isAgent = user?.role === 'AGENTE';

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const birthdaysThisMonth = useMemo<BirthdayItem[]>(() => {
    return agents
      .filter((agent) => Boolean(agent.birth_date))
      .map((agent) => {
        const birthDate = new Date(agent.birth_date as string);

        return {
          id: agent.id,
          full_name: agent.full_name,
          dni: agent.dni,
          birth_date: agent.birth_date as string,
          day: birthDate.getDate(),
        };
      })
      .filter((agent) => {
        const birthDate = new Date(agent.birth_date);
        return birthDate.getMonth() + 1 === currentMonth;
      })
      .sort((a, b) => a.day - b.day);
  }, [agents, currentMonth]);

  const totalAttendance = attendance.length;

  const countByType = useMemo(() => {
    const initial = {
      LICENCIA: 0,
      AUSENTE: 0,
      CAPACITACION: 0,
      CONSTANCIA: 0,
      PARO: 0,
    };

    return attendance.reduce((acc, item) => {
      if (item.record_type in acc) {
        acc[item.record_type] += 1;
      }
      return acc;
    }, initial);
  }, [attendance]);

  const percentage = (count: number) => {
    if (!totalAttendance) return 0;
    return Number(((count / totalAttendance) * 100).toFixed(1));
  };

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Panel principal
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {isAgent ? 'Mi espacio personal' : 'Bienvenido al SGA'}
            </h2>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
              {isAgent
                ? 'Accedé a tu ficha, consultá tus novedades y visualizá tus estadísticas personales.'
                : 'Plataforma institucional para la gestión administrativa escolar de agentes, POF, asistencias, designaciones, bajas y situación de revista.'}
            </p>
          </div>

          {loading && (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-300">Cargando panel...</p>
            </div>
          )}

          {message && (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-700 dark:text-slate-200">{message}</p>
            </div>
          )}

          {!loading && (
            <>
              {!isAgent ? (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Link
                      href="/docentes"
                      className="rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Módulo
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Docentes
                      </h3>
                      <p className="mt-3 text-slate-600 dark:text-slate-300">
                        Buscar, agregar, modificar y eliminar docentes. Acceso a
                        ficha completa, plazas, prestaciones y situación de revista.
                      </p>
                    </Link>

                    <Link
                      href="/pof"
                      className="rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Módulo
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        POF
                      </h3>
                      <p className="mt-3 text-slate-600 dark:text-slate-300">
                        Administración de plazas, asignaturas, horas, turnos y
                        normativa legal asociada.
                      </p>
                    </Link>

                    <Link
                      href="/asistencia"
                      className="rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Módulo
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Asistencia
                      </h3>
                      <p className="mt-3 text-slate-600 dark:text-slate-300">
                        Registro de licencias, ausentes, capacitaciones,
                        constancias y demás novedades administrativas.
                      </p>
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-5">
                        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Indicadores generales
                        </p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          Estadísticas institucionales
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Docentes activos
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
                            {agents.length}
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Total novedades
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
                            {totalAttendance}
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Licencias</p>
                          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {countByType.LICENCIA}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {percentage(countByType.LICENCIA)}%
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Ausentes</p>
                          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {countByType.AUSENTE}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {percentage(countByType.AUSENTE)}%
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            Capacitaciones
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {countByType.CAPACITACION}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {percentage(countByType.CAPACITACION)}%
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            Constancias
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {countByType.CONSTANCIA}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {percentage(countByType.CONSTANCIA)}%
                          </p>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4 md:col-span-2 dark:border-slate-700 dark:bg-slate-800">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">Paros</p>
                          <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {countByType.PARO}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {percentage(countByType.PARO)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-5">
                        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Agenda institucional
                        </p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                          Cumpleaños de {getMonthName(currentMonth)}
                        </h3>
                      </div>

                      {birthdaysThisMonth.length > 0 ? (
                        <div className="space-y-3">
                          {birthdaysThisMonth.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                    {item.full_name}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">
                                    DNI: {item.dni}
                                  </p>
                                </div>

                                <div className="rounded-xl border bg-white px-4 py-2 text-center dark:border-slate-700 dark:bg-slate-900">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Cumple
                                  </p>
                                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                    {item.day}
                                  </p>
                                </div>
                              </div>

                              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Fecha de nacimiento: {formatDate(item.birth_date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-300">
                          No hay cumpleaños cargados para este mes.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-5">
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Mi espacio
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Accesos personales
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {user?.agent_id ? (
                        <Link
                          href={`/docentes/${user.agent_id}`}
                          className="rounded-2xl border bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Mi perfil docente
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Consultá tu ficha, tu situación de revista y tus novedades.
                          </p>
                        </Link>
                      ) : (
                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Perfil no vinculado
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Tu usuario AGENTE todavía no está vinculado a un docente/agente.
                          </p>
                        </div>
                      )}

                      <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          Mis estadísticas
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Visualizá tus licencias, ausentes, capacitaciones y demás novedades registradas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-5">
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Agenda institucional
                      </p>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Cumpleaños de {getMonthName(currentMonth)}
                      </h3>
                    </div>

                    {birthdaysThisMonth.length > 0 ? (
                      <div className="space-y-3">
                        {birthdaysThisMonth.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                                  {item.full_name}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                  DNI: {item.dni}
                                </p>
                              </div>

                              <div className="rounded-xl border bg-white px-4 py-2 text-center dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  Cumple
                                </p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                  {item.day}
                                </p>
                              </div>
                            </div>

                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              Fecha de nacimiento: {formatDate(item.birth_date)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-300">
                        No hay cumpleaños cargados para este mes.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </ProtectedPage>
  );
}