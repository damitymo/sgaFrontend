'use client';

import { useMemo, useState } from 'react';
import { AssignmentModal } from '@/components/assignment-modal';

type LoggedUser = {
  id: number;
  full_name: string;
  username: string;
  role: string;
  agent_id?: number | null;
};

export type RevistaItem = {
  id?: number;
  revista_type?: string;
  character_type?: string;
  start_date?: string | null;
  end_date?: string | null;
  legal_norm?: string | null;
  resolution_number?: string | null;
  notes?: string | null;
  pof_position?: {
    plaza_number?: string | null;
    subject_name?: string | null;
    hours_count?: number | null;
    course?: string | null;
    division?: string | null;
    shift?: string | null;
  } | null;
};

export type AttendanceItem = {
  id?: number;
  agent_id?: number;
  attendance_date?: string | null;
  status?: 'PRESENTE' | 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  raw_code?: string | null;
  condition_type?: string | null;
  shift?: string | null;
  source_sheet_name?: string | null;
  source_agent_name?: string | null;
  source_dni?: string | null;
  observation?: string | null;
};

export type AgentProfile = {
  id: number;
  last_name?: string | null;
  first_name?: string | null;
  full_name: string;
  dni: string;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  teaching_file_number?: string | null;
  board_file_number?: string | null;
  secondary_board_number?: string | null;
  school_entry_date?: string | null;
  teaching_entry_date?: string | null;
  titles?: string | null;
  identity_card_number?: string | null;
  notes?: string | null;
  revista_actual?: RevistaItem[];
  revista_historica?: RevistaItem[];
  licencias?: AttendanceItem[];
  ausentes?: AttendanceItem[];
  presentes?: AttendanceItem[];
};

type Props = {
  agent: AgentProfile;
  onOpenLicencias: () => void;
  onOpenAusentes: () => void;
  onRefreshProfile: () => Promise<void> | void;
};

type RevistaView = 'actual' | 'historica';

function formatDate(date?: string | null) {
  if (!date) return '-';

  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;

  return safe.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateCompact(date?: string | null) {
  if (!date) return '-';

  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;

  return safe.toLocaleDateString('es-AR');
}

function fieldValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function shiftLabel(value?: string | null) {
  if (!value) return '-';

  const normalized = value.toUpperCase();

  if (normalized === 'MANANA' || normalized === 'MAÑANA' || normalized === 'M') {
    return 'M';
  }

  if (normalized === 'TARDE' || normalized === 'T') {
    return 'T';
  }

  if (normalized === 'NOCHE' || normalized === 'N' || normalized === 'NOCTURNO') {
    return 'N';
  }

  return value;
}

function getLoggedUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;

  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as LoggedUser;
  } catch {
    return null;
  }
}

function InfoBox({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2 xl:col-span-3' : ''}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 print:text-[10px]">
        {label}
      </p>
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 print:rounded-none print:border-slate-400 print:px-2 print:py-1 print:text-[11px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function RevistaTable({
  items,
  emptyText,
}: {
  items: RevistaItem[];
  emptyText: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 print:rounded-none print:border-slate-400 print:bg-white print:px-2 print:py-2 print:text-[11px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm print:text-[10px]">
        <thead>
          <tr className="bg-slate-100 text-slate-700 print:bg-white dark:bg-slate-800 dark:text-slate-200">
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">
              PLAZA
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">
              ASIGNATURA / CARGO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              HS.
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              CURSO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              DIV
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              TURNO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              DESDE
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              HASTA
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              CARÁCTER
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">
              NORMA LEGAL
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">
              OBSERVACIONES
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id ?? `${item.pof_position?.plaza_number ?? 'row'}-${index}`}
              className="bg-white dark:bg-slate-900"
            >
              <td className="border border-slate-300 px-2 py-2 align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.plaza_number)}
              </td>
              <td className="border border-slate-300 px-2 py-2 align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.subject_name)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.hours_count)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.course)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.division)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {shiftLabel(item.pof_position?.shift)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {formatDateCompact(item.start_date)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {item.end_date ? formatDateCompact(item.end_date) : 'CONTINUA'}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.character_type)}
              </td>
              <td className="border border-slate-300 px-2 py-2 align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.legal_norm || item.resolution_number)}
              </td>
              <td className="border border-slate-300 px-2 py-2 align-top print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.notes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocenteDatosPanel({
  agent,
  onOpenLicencias,
  onOpenAusentes,
  onRefreshProfile,
}: Props) {
  const [revistaView, setRevistaView] = useState<RevistaView>('actual');
  const [isDesignacionOpen, setIsDesignacionOpen] = useState(false);
  const [isBajaOpen, setIsBajaOpen] = useState(false);

  const loggedUser = getLoggedUser();
  const canManageMovements =
    loggedUser?.role === 'ADMIN' || loggedUser?.role === 'ADMINISTRATIVO';

  const revistaActual = useMemo(() => agent.revista_actual ?? [], [agent.revista_actual]);
  const revistaHistorica = useMemo(
    () => agent.revista_historica ?? [],
    [agent.revista_historica],
  );

  const revistaItems = useMemo(
    () => (revistaView === 'actual' ? revistaActual : revistaHistorica),
    [revistaView, revistaActual, revistaHistorica],
  );

  return (
    <div className="space-y-6 print:space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-slate-400 print:p-4 print:shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 print:mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px] dark:text-slate-400">
            Datos personales
          </p>
          <h3 className="text-2xl font-bold text-slate-800 print:text-lg dark:text-slate-100">
            {agent.full_name}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 print:gap-2">
          <InfoBox label="Apellido" value={fieldValue(agent.last_name)} />
          <InfoBox label="Nombre" value={fieldValue(agent.first_name)} />
          <InfoBox label="DNI" value={fieldValue(agent.dni)} />
          <InfoBox label="Legajo en junta" value={fieldValue(agent.board_file_number)} />
          <InfoBox
            label="Legajo nivel secundario"
            value={fieldValue(agent.secondary_board_number)}
          />
          <InfoBox label="Fecha de nacimiento" value={formatDate(agent.birth_date)} />
          <InfoBox label="Email" value={fieldValue(agent.email)} />
          <InfoBox label="Teléfono fijo" value={fieldValue(agent.phone)} />
          <InfoBox label="Celular" value={fieldValue(agent.mobile)} />
          <InfoBox
            label="Cédula de identidad"
            value={fieldValue(agent.identity_card_number)}
          />
          <InfoBox
            label="Inicio en docencia"
            value={formatDate(agent.teaching_entry_date)}
          />
          <InfoBox
            label="Inicio en escuela"
            value={formatDate(agent.school_entry_date)}
          />
          <InfoBox label="Domicilio" value={fieldValue(agent.address)} full />
          <InfoBox label="Título que posee" value={fieldValue(agent.titles)} full />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Novedades
          </p>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Resumen de asistencias
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onOpenLicencias}
            className="rounded-2xl border bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Licencias
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
              {agent.licencias?.length ?? 0}
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenAusentes}
            className="rounded-2xl border bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ausentes injustificados
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
              {agent.ausentes?.length ?? 0}
            </p>
          </button>
        </div>
      </section>

      {canManageMovements ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsDesignacionOpen(true)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Registrar designación
            </button>

            <button
              type="button"
              onClick={() => setIsBajaOpen(true)}
              className="rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              Registrar baja
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-slate-400 print:p-4 print:shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 print:mb-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px] dark:text-slate-400">
              Situación de revista
            </p>
            <h3 className="text-2xl font-bold text-slate-800 print:text-lg dark:text-slate-100">
              Revista {revistaView === 'actual' ? 'actual' : 'histórica'}
            </h3>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setRevistaView('actual')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                revistaView === 'actual'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Actual
            </button>

            <button
              type="button"
              onClick={() => setRevistaView('historica')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                revistaView === 'historica'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Histórica
            </button>
          </div>
        </div>

        <RevistaTable
          items={revistaItems}
          emptyText={
            revistaView === 'actual'
              ? 'No hay registros vigentes de situación de revista.'
              : 'No hay historial de situación de revista.'
          }
        />
      </section>

      {isDesignacionOpen ? (
        <AssignmentModal
          movementType="DESIGNACION"
          agentId={agent.id}
          agentName={agent.full_name}
          onClose={() => setIsDesignacionOpen(false)}
          onSuccess={async () => {
            setIsDesignacionOpen(false);
            await onRefreshProfile();
          }}
        />
      ) : null}

      {isBajaOpen ? (
        <AssignmentModal
          movementType="BAJA"
          agentId={agent.id}
          agentName={agent.full_name}
          onClose={() => setIsBajaOpen(false)}
          onSuccess={async () => {
            setIsBajaOpen(false);
            await onRefreshProfile();
          }}
        />
      ) : null}
    </div>
  );
}