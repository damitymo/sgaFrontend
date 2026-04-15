'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUser, type LoggedUser } from '@/lib/auth';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

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

type AttendanceStats = {
  total: number;
  counts: {
    LICENCIA: number;
    AUSENTE: number;
    CAPACITACION: number;
    CONSTANCIA: number;
    PARO: number;
  };
  percentages: {
    LICENCIA: number;
    AUSENTE: number;
    CAPACITACION: number;
    CONSTANCIA: number;
    PARO: number;
  };
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

function buildInstitutionalStats(attendance: AttendanceItem[]): AttendanceStats {
  const counts = {
    LICENCIA: 0,
    AUSENTE: 0,
    CAPACITACION: 0,
    CONSTANCIA: 0,
    PARO: 0,
  };

  for (const item of attendance) {
    if (item.record_type in counts) {
      counts[item.record_type as keyof typeof counts] += 1;
    }
  }

  const total = attendance.length;
  const calc = (value: number) =>
    total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

  return {
    total,
    counts,
    percentages: {
      LICENCIA: calc(counts.LICENCIA),
      AUSENTE: calc(counts.AUSENTE),
      CAPACITACION: calc(counts.CAPACITACION),
      CONSTANCIA: calc(counts.CONSTANCIA),
      PARO: calc(counts.PARO),
    },
  };
}

export default function HomePage() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [agentStats, setAgentStats] = useState<AttendanceStats | null>(null);
  const [birthdaysThisMonth, setBirthdaysThisMonth] = useState<BirthdayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const isAgentUser = user?.role === 'AGENTE';

  useEffect(() => {
    const loggedUser = getUser();
    setUser(loggedUser);

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setMessage('');

        if (loggedUser?.role === 'AGENTE') {
          const [statsResponse, birthdaysResponse] = await Promise.all([
            api.get<AttendanceStats>('/attendance/me/stats'),
            api.get<BirthdayItem[]>('/agents/birthdays/month'),
          ]);

          setAgentStats(statsResponse.data);
          setBirthdaysThisMonth((birthdaysResponse.data ?? []).sort((a, b) => a.day - b.day));
          setAgents([]);
          setAttendance([]);
          return;
        }

        const [agentsResponse, attendanceResponse, birthdaysResponse] = await Promise.all([
          api.get<AgentItem[]>('/agents'),
          api.get<AttendanceItem[]>('/attendance'),
          api.get<BirthdayItem[]>('/agents/birthdays/month'),
        ]);

        setAgents((agentsResponse.data ?? []) as AgentItem[]);
        setAttendance((attendanceResponse.data ?? []) as AttendanceItem[]);
        setBirthdaysThisMonth((birthdaysResponse.data ?? []).sort((a, b) => a.day - b.day));
        setAgentStats(null);
      } catch (error) {
        console.error(error);
        setMessage('No se pudieron cargar los datos del panel principal.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  const institutionalStats = useMemo(
    () => buildInstitutionalStats(attendance),
    [attendance],
  );

  const visibleStats = isAgentUser ? agentStats : institutionalStats;

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
              {isAgentUser ? 'Mi espacio personal' : 'Bienvenido al SGA'}
            </h2>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
              {isAgentUser
                ? 'Accedé a tu ficha,  consultá tu situación de revista y visualizá tus estadísticas personales.'
                : 'Plataforma institucional para la gestión administrativa escolar de agentes, POF, asistencias, designaciones, bajas y situación de revista.'}
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-300">Cargando panel...</p>
            </div>
          ) : null}

          {message ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-700 dark:text-slate-200">{message}</p>
            </div>
          ) : null}

          {!loading && !message ? (
            <>
              {!isAgentUser ? (
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
                        Buscar, agregar, modificar y eliminar docentes. Acceso a ficha completa,
                        plazas, prestaciones y situación de revista.
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
                        Administración de plazas, asignaturas, horas, turnos y normativa legal asociada.
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
                        Registro de licencias, ausentes, capacitaciones, constancias y demás novedades administrativas.
                      </p>
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <StatsCard
                      title="Estadísticas institucionales"
                      subtitle="Indicadores generales"
                      totalLabel="Total novedades"
                      totalValue={visibleStats?.total ?? 0}
                      extraLabel="Docentes activos"
                      extraValue={agents.length}
                      stats={visibleStats}
                    />

                    <BirthdaysCard
                      monthName={getMonthName(currentMonth)}
                      birthdays={birthdaysThisMonth}
                    />
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
                      <Link
                        href="/mi-perfil"
                        className="rounded-2xl border bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          Mi perfil docente
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Consultá tus datos personales, tu situación de revista y tus novedades.
                        </p>
                      </Link>

                      {user?.agent_id ? (
                        <Link
                          href={`/docentes/${user.agent_id}`}
                          className="rounded-2xl border bg-slate-50 p-4 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Mi ficha imprimible
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Abrí tu ficha completa con vista institucional e impresión.
                          </p>
                        </Link>
                      ) : (
                        <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            Usuario sin vínculo docente
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Tu usuario no tiene un agente asociado. Contactá al administrador.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <StatsCard
                    title="Mis estadísticas"
                    subtitle="Resumen personal"
                    totalLabel="Total novedades"
                    totalValue={visibleStats?.total ?? 0}
                    stats={visibleStats}
                  />

                  <div className="lg:col-span-2">
                    <BirthdaysCard
                      monthName={getMonthName(currentMonth)}
                      birthdays={birthdaysThisMonth}
                    />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function StatsCard({
  title,
  subtitle,
  totalLabel,
  totalValue,
  extraLabel,
  extraValue,
  stats,
}: {
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: number;
  extraLabel?: string;
  extraValue?: number;
  stats: AttendanceStats | null;
}) {
  const safeStats = stats ?? {
    total: 0,
    counts: {
      LICENCIA: 0,
      AUSENTE: 0,
      CAPACITACION: 0,
      CONSTANCIA: 0,
      PARO: 0,
    },
    percentages: {
      LICENCIA: 0,
      AUSENTE: 0,
      CAPACITACION: 0,
      CONSTANCIA: 0,
      PARO: 0,
    },
  };

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {typeof extraValue === 'number' ? (
          <MetricBox label={extraLabel || '-'} value={extraValue} />
        ) : null}

        <MetricBox label={totalLabel} value={totalValue} />

        <MetricPercentBox
          label="Licencias"
          value={safeStats.counts.LICENCIA}
          percent={safeStats.percentages.LICENCIA}
        />
        <MetricPercentBox
          label="Ausentes"
          value={safeStats.counts.AUSENTE}
          percent={safeStats.percentages.AUSENTE}
        />
        <MetricPercentBox
          label="Capacitaciones"
          value={safeStats.counts.CAPACITACION}
          percent={safeStats.percentages.CAPACITACION}
        />
        <MetricPercentBox
          label="Constancias"
          value={safeStats.counts.CONSTANCIA}
          percent={safeStats.percentages.CONSTANCIA}
        />
        <div className="md:col-span-2">
          <MetricPercentBox
            label="Paros"
            value={safeStats.counts.PARO}
            percent={safeStats.percentages.PARO}
          />
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function MetricPercentBox({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {percent}%
      </p>
    </div>
  );
}

function BirthdaysCard({
  monthName,
  birthdays,
}: {
  monthName: string;
  birthdays: BirthdayItem[];
}) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Agenda institucional
        </p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Cumpleaños de {monthName}
        </h3>
      </div>

      {birthdays.length > 0 ? (
        <div className="space-y-3">
          {birthdays.map((item) => (
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
  );
}