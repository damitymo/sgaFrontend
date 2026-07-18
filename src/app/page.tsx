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
  attendance_date: string;
  status: 'PRESENTE' | 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  raw_code?: string | null;
  condition_type?: string | null;
  shift?: string | null;
  source_sheet_name?: string | null;
  source_agent_name?: string | null;
  observation?: string | null;
  agent?: { id: number; full_name: string } | null;
};

type AssignmentItem = {
  id: number;
  agent_id: number;
  character_type: string | null;
  status: string;
};

type LicenseItem = {
  id: number;
  agent_id: number;
  agent?: { id: number; full_name: string } | null;
  license_type_id: number;
  license_type?: {
    id: number;
    article: string;
    max_days_per_year?: number | null;
  } | null;
  days_count: number;
};

type PlantelStats = {
  plantel_activo: number;
  titulares: number;
  interinos: number;
  suplentes: number;
};

type MonthlyLimitRow = {
  agent_id: number;
  full_name: string;
  count: number;
};

type LicenseLimitRow = {
  agent_id: number;
  full_name: string;
  article: string;
  used: number;
  max: number;
};

type BirthdayItem = {
  id: number;
  full_name: string;
  dni: string;
  birth_date: string;
  day: number;
};

type AttendanceStats = {
  total_records: number;
  counts: {
    PRESENTE: number;
    AUSENTE_INJUSTIFICADO: number;
    LICENCIA: number;
  };
  percentages: {
    PRESENTE: number;
    AUSENTE_INJUSTIFICADO: number;
    LICENCIA: number;
  };
};

const MONTH_NAMES = [
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

function getMonthName(month: number) {
  return MONTH_NAMES[month - 1] || '';
}

function formatTodayLong() {
  const d = new Date();
  const dia = d.toLocaleDateString('es-AR', { weekday: 'long' });
  const num = d.getDate();
  const mes = MONTH_NAMES[d.getMonth()];
  const anio = d.getFullYear();
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${num} de ${mes} de ${anio}`;
}

function buildInstitutionalStats(attendance: AttendanceItem[]): AttendanceStats {
  const counts = {
    PRESENTE: 0,
    AUSENTE_INJUSTIFICADO: 0,
    LICENCIA: 0,
  };

  for (const item of attendance) {
    if (item.status === 'PRESENTE') counts.PRESENTE += 1;
    if (item.status === 'AUSENTE_INJUSTIFICADO') counts.AUSENTE_INJUSTIFICADO += 1;
    if (item.status === 'LICENCIA') counts.LICENCIA += 1;
  }

  const total_records = attendance.length;
  const calc = (value: number) =>
    total_records > 0 ? Number(((value / total_records) * 100).toFixed(1)) : 0;

  return {
    total_records,
    counts,
    percentages: {
      PRESENTE: calc(counts.PRESENTE),
      AUSENTE_INJUSTIFICADO: calc(counts.AUSENTE_INJUSTIFICADO),
      LICENCIA: calc(counts.LICENCIA),
    },
  };
}

function buildPlantelStats(assignments: AssignmentItem[]): PlantelStats {
  const activos = assignments.filter((a) => a.status === 'ACTIVA');
  const plantelActivo = new Set<number>();
  const titulares = new Set<number>();
  const interinos = new Set<number>();
  const suplentes = new Set<number>();

  for (const a of activos) {
    plantelActivo.add(a.agent_id);
    const c = (a.character_type || '').toUpperCase();
    if (c === 'TITULAR') titulares.add(a.agent_id);
    else if (c === 'INTERINO') interinos.add(a.agent_id);
    else if (c === 'SUPLENTE') suplentes.add(a.agent_id);
  }

  return {
    plantel_activo: plantelActivo.size,
    titulares: titulares.size,
    interinos: interinos.size,
    suplentes: suplentes.size,
  };
}

/** "Límite Mensual": docentes con faltas injustificadas en el mes actual. */
function buildMonthlyLimit(records: AttendanceItem[]): MonthlyLimitRow[] {
  const map = new Map<number, MonthlyLimitRow>();

  for (const r of records) {
    const fullName =
      r.agent?.full_name || r.source_agent_name || `Agente #${r.agent_id}`;
    const entry = map.get(r.agent_id) ?? {
      agent_id: r.agent_id,
      full_name: fullName,
      count: 0,
    };
    entry.count += 1;
    map.set(r.agent_id, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * "Licencias al límite": para cada docente + tipo de licencia con tope
 * anual configurado, suma los días usados en el año y se queda con los
 * que están al 80% o más del tope (cercano o superado).
 */
function buildLicenseLimits(licenses: LicenseItem[]): LicenseLimitRow[] {
  const map = new Map<string, LicenseLimitRow>();

  for (const l of licenses) {
    const max = l.license_type?.max_days_per_year;
    if (!max) continue;

    const key = `${l.agent_id}-${l.license_type_id}`;
    const entry = map.get(key) ?? {
      agent_id: l.agent_id,
      full_name: l.agent?.full_name || `Agente #${l.agent_id}`,
      article: l.license_type?.article || '-',
      used: 0,
      max,
    };
    entry.used += l.days_count;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .filter((row) => row.used >= row.max * 0.8)
    .sort((a, b) => b.used / b.max - a.used / a.max);
}

export default function HomePage() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [agentStats, setAgentStats] = useState<AttendanceStats | null>(null);
  const [birthdaysThisMonth, setBirthdaysThisMonth] = useState<BirthdayItem[]>([]);
  const [plantelStats, setPlantelStats] = useState<PlantelStats | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState<MonthlyLimitRow[]>([]);
  const [licenseLimits, setLicenseLimits] = useState<LicenseLimitRow[]>([]);
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
          setBirthdaysThisMonth(
            (birthdaysResponse.data ?? []).sort((a, b) => a.day - b.day),
          );
          setAgents([]);
          setAttendance([]);
          return;
        }

        const now = new Date();

        const [
          agentsResponse,
          attendanceResponse,
          birthdaysResponse,
          assignmentsResponse,
          monthlyFaltasResponse,
          licensesResponse,
        ] = await Promise.all([
          api.get<AgentItem[]>('/agents'),
          api.get<AttendanceItem[]>('/attendance'),
          api.get<BirthdayItem[]>('/agents/birthdays/month'),
          api.get<AssignmentItem[]>('/assignments'),
          api.get<AttendanceItem[]>('/attendance', {
            params: {
              year: now.getFullYear(),
              month: now.getMonth() + 1,
              status: 'AUSENTE_INJUSTIFICADO',
            },
          }),
          api.get<LicenseItem[]>('/licenses', {
            params: { year: now.getFullYear() },
          }),
        ]);

        setAgents((agentsResponse.data ?? []) as AgentItem[]);
        setAttendance((attendanceResponse.data ?? []) as AttendanceItem[]);
        setBirthdaysThisMonth(
          (birthdaysResponse.data ?? []).sort((a, b) => a.day - b.day),
        );
        setAgentStats(null);
        setPlantelStats(buildPlantelStats(assignmentsResponse.data ?? []));
        setMonthlyLimit(buildMonthlyLimit(monthlyFaltasResponse.data ?? []));
        setLicenseLimits(buildLicenseLimits(licensesResponse.data ?? []));
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
  const todayDay = new Date().getDate();

  const institutionalStats = useMemo(
    () => buildInstitutionalStats(attendance),
    [attendance],
  );

  const visibleStats = isAgentUser ? agentStats : institutionalStats;

  const welcomeName = user?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          {/* Hero compacto */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 p-4 text-white shadow-sm dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">
                  {formatTodayLong()}
                </p>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Hola, {welcomeName}
                </h2>
              </div>
              <p className="text-xs text-indigo-100 sm:text-sm">
                {isAgentUser
                  ? 'Tu espacio personal'
                  : 'Sistema de Gestión Administrativa — ESCUELA TECNICA VIRASORO'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Cargando panel...
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {message}
            </div>
          ) : null}

          {!loading && !message ? (
            <>
              {!isAgentUser ? (
                <>
                  {/* Accesos directos compactos */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <ModuleTile
                      href="/docentes"
                      title="Docentes"
                      subtitle="Legajos y revista"
                    />
                    <ModuleTile
                      href="/pof"
                      title="POF"
                      subtitle="Plazas y asignaciones"
                    />
                    <ModuleTile
                      href="/asistencia"
                      title="Asistencia"
                      subtitle="Novedades diarias"
                    />
                    <ModuleTile
                      href="/licencias"
                      title="Licencias"
                      subtitle="Artículos y períodos"
                    />
                  </div>

                  {/* Panel de Control Integral: plantel + límites */}
                  <PlantelKpis stats={plantelStats} />

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <LimiteMensualPanel rows={monthlyLimit} />
                    <LicenciasLimitePanel rows={licenseLimits} />
                  </div>

                  {/* Stats + cumpleaños en dos columnas compactas */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <StatsCompact
                        title="Estadísticas institucionales"
                        totalLabel="Novedades"
                        totalValue={visibleStats?.total_records ?? 0}
                        extraLabel="Docentes"
                        extraValue={agents.length}
                        stats={visibleStats}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <BirthdaysCompact
                        monthName={getMonthName(currentMonth)}
                        birthdays={birthdaysThisMonth}
                        todayDay={todayDay}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <ModuleTile
                      href="/mi-perfil"
                      title="Mi perfil"
                      subtitle="Datos, revista y asistencia"
                    />
                    {user?.agent_id ? (
                      <ModuleTile
                        href={`/docentes/${user.agent_id}`}
                        title="Mi ficha"
                        subtitle="Vista institucional"
                      />
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                          Sin vínculo docente
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Contactá al administrador.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <StatsCompact
                        title="Mis estadísticas"
                        totalLabel="Novedades"
                        totalValue={visibleStats?.total_records ?? 0}
                        stats={visibleStats}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <BirthdaysCompact
                        monthName={getMonthName(currentMonth)}
                        birthdays={birthdaysThisMonth}
                        todayDay={todayDay}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function ModuleTile({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
    >
      <p className="text-base font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 sm:text-lg">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
        {subtitle}
      </p>
    </Link>
  );
}

function PlantelKpis({ stats }: { stats: PlantelStats | null }) {
  const safe = stats ?? {
    plantel_activo: 0,
    titulares: 0,
    interinos: 0,
    suplentes: 0,
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricPill label="Plantel activo" value={safe.plantel_activo} tone="neutral" />
      <MetricPill label="Titulares" value={safe.titulares} tone="emerald" />
      <MetricPill label="Interinos" value={safe.interinos} tone="amber" />
      <MetricPill label="Suplentes" value={safe.suplentes} tone="neutral" />
    </div>
  );
}

function LimiteMensualPanel({ rows }: { rows: MonthlyLimitRow[] }) {
  const monthName = getMonthName(new Date().getMonth() + 1);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Límite mensual · {monthName}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {rows.length} docente(s)
        </p>
      </div>

      {rows.length > 0 ? (
        <ul className="-mr-1 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li
              key={row.agent_id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                {row.full_name}
              </span>
              <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                {row.count} falta{row.count === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin faltas injustificadas este mes.
        </p>
      )}
    </div>
  );
}

function LicenciasLimitePanel({ rows }: { rows: LicenseLimitRow[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Licencias al límite
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {rows.length} caso(s)
        </p>
      </div>

      {rows.length > 0 ? (
        <ul className="-mr-1 max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {rows.map((row) => {
            const superado = row.used >= row.max;
            return (
              <li
                key={`${row.agent_id}-${row.article}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                    {row.full_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {row.article}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    superado
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200'
                  }`}
                >
                  Usó {row.used} de {row.max} días
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ningún docente está cerca del tope anual de licencias.
        </p>
      )}
    </div>
  );
}

function StatsCompact({
  title,
  totalLabel,
  totalValue,
  extraLabel,
  extraValue,
  stats,
}: {
  title: string;
  totalLabel: string;
  totalValue: number;
  extraLabel?: string;
  extraValue?: number;
  stats: AttendanceStats | null;
}) {
  const safeStats = stats ?? {
    total_records: 0,
    counts: { PRESENTE: 0, AUSENTE_INJUSTIFICADO: 0, LICENCIA: 0 },
    percentages: { PRESENTE: 0, AUSENTE_INJUSTIFICADO: 0, LICENCIA: 0 },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {safeStats.total_records} registros
        </p>
      </div>

      {/* KPIs en fila */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {typeof extraValue === 'number' ? (
          <MetricPill label={extraLabel || '-'} value={extraValue} tone="neutral" />
        ) : null}
        <MetricPill label={totalLabel} value={totalValue} tone="neutral" />
        <MetricPill
          label="Presentes"
          value={safeStats.counts.PRESENTE}
          tone="emerald"
        />
        <MetricPill
          label="Licencias"
          value={safeStats.counts.LICENCIA}
          tone="amber"
        />
      </div>

      {/* Barras de proporción */}
      <div className="space-y-2">
        <StatBar
          label="Presentes"
          percent={safeStats.percentages.PRESENTE}
          color="bg-emerald-500"
        />
        <StatBar
          label="Licencias"
          percent={safeStats.percentages.LICENCIA}
          color="bg-amber-500"
        />
        <StatBar
          label="Ausentes inj."
          percent={safeStats.percentages.AUSENTE_INJUSTIFICADO}
          color="bg-rose-500"
        />
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'emerald' | 'amber';
}) {
  const toneClasses = {
    neutral:
      'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    amber:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function StatBar({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}

function BirthdaysCompact({
  monthName,
  birthdays,
  todayDay,
}: {
  monthName: string;
  birthdays: BirthdayItem[];
  todayDay: number;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Cumpleaños · {monthName}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {birthdays.length}
        </p>
      </div>

      {birthdays.length > 0 ? (
        <ul className="-mr-1 max-h-72 overflow-y-auto pr-1">
          {birthdays.map((item) => {
            const isToday = item.day === todayDay;
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800 ${
                  isToday ? 'font-semibold' : ''
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    isToday
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {item.day}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                  {item.full_name}
                </span>
                {isToday ? (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Hoy
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin cumpleaños este mes.
        </p>
      )}
    </div>
  );
}
