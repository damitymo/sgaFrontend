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
  revista_type?: string | null;
  character_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  legal_norm?: string | null;
  resolution_number?: string | null;
  notes?: string | null;
  pof_position?: {
    plaza_number?: string | null;
    establecimiento_cue?: string | null;
    subject_name?: string | null;
    modality?: string | null;
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

export type AssignmentItem = {
  id?: number;
  revista_type?: string | null;
  character_type?: string | null;
  assignment_date?: string | null;
  end_date?: string | null;
  legal_norm_type?: string | null;
  legal_norm_number?: string | null;
  status?: string | null;
  is_active?: boolean;
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

export type AgentProfile = {
  id: number;
  last_name?: string | null;
  first_name?: string | null;
  full_name: string;
  dni: string;
  birth_date?: string | null;
  sex?: string | null;
  marital_status?: string | null;
  birth_place?: string | null;
  nationality?: string | null;
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
  assignments?: AssignmentItem[];
  licencias?: AttendanceItem[];
  ausentes?: AttendanceItem[];
  presentes?: AttendanceItem[];
  attendance_stats?: {
    total_registros: number;
    licencias: number;
    ausentes: number;
    presentes: number;
  };
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
              DIV.
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              TURNO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              CARÁCTER
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              DESDE
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">
              HASTA
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">
              NORMA LEGAL
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id ?? index}>
              <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.plaza_number)}
              </td>
              <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.subject_name)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.hours_count)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.course)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.pof_position?.division)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {shiftLabel(item.pof_position?.shift)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.character_type)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {formatDate(item.start_date)}
              </td>
              <td className="border border-slate-300 px-2 py-2 text-center print:px-1 print:py-1 dark:border-slate-700">
                {formatDate(item.end_date)}
              </td>
              <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 dark:border-slate-700">
                {fieldValue(item.legal_norm)}
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
  const [openAssignmentModal, setOpenAssignmentModal] = useState<
    'DESIGNACION' | 'BAJA' | null
  >(null);

  const user = getLoggedUser();
  const canManageAssignments =
    user?.role === 'ADMIN' || user?.role === 'ADMINISTRATIVO';

  const revistaItems = useMemo(
    () =>
      revistaView === 'actual'
        ? agent.revista_actual ?? []
        : agent.revista_historica ?? [],
    [agent.revista_actual, agent.revista_historica, revistaView],
  );

  const stats = agent.attendance_stats ?? {
    total_registros: (agent.licencias?.length ?? 0) + (agent.ausentes?.length ?? 0) + (agent.presentes?.length ?? 0),
    licencias: agent.licencias?.length ?? 0,
    ausentes: agent.ausentes?.length ?? 0,
    presentes: agent.presentes?.length ?? 0,
  };

  return (
    <>
      <div className="space-y-6 print:space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 print:rounded-none print:border-slate-400 print:bg-white print:p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
                Ficha institucional
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-800 print:text-lg dark:text-slate-100">
                {agent.full_name}
              </h3>
              <p className="mt-1 text-sm text-slate-600 print:text-[11px] dark:text-slate-300">
                DNI: {agent.dni}
              </p>
            </div>

            {canManageAssignments ? (
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setOpenAssignmentModal('DESIGNACION')}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Designación
                </button>
                <button
                  type="button"
                  onClick={() => setOpenAssignmentModal('BAJA')}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Baja
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoBox label="Apellido" value={fieldValue(agent.last_name)} />
            <InfoBox label="Nombre" value={fieldValue(agent.first_name)} />
            <InfoBox label="DNI" value={fieldValue(agent.dni)} />
            <InfoBox label="Fecha de nacimiento" value={formatDate(agent.birth_date)} />
            <InfoBox label="Domicilio" value={fieldValue(agent.address)} />
            <InfoBox label="Teléfono" value={fieldValue(agent.phone)} />
            <InfoBox label="Celular" value={fieldValue(agent.mobile)} />
            <InfoBox label="Email" value={fieldValue(agent.email)} />
            <InfoBox label="Junta de clasificación" value={fieldValue(agent.board_file_number)} />
            <InfoBox label="Junta nivel secundario" value={fieldValue(agent.secondary_board_number)} />
            <InfoBox label="Inicio en la escuela" value={formatDate(agent.school_entry_date)} />
            <InfoBox label="Inicio en la docencia" value={formatDate(agent.teaching_entry_date)} />
            <InfoBox label="Cédula de identidad" value={fieldValue(agent.identity_card_number)} />
            <InfoBox label="Títulos" value={fieldValue(agent.titles)} full />
            <InfoBox label="Observaciones" value={fieldValue(agent.notes)} full />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
                Situación de revista
              </p>
              <h4 className="mt-1 text-xl font-bold text-slate-800 print:text-base dark:text-slate-100">
                {revistaView === 'actual' ? 'Revista actual' : 'Revista histórica'}
              </h4>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setRevistaView('actual')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  revistaView === 'actual'
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                }`}
              >
                Actual
              </button>
              <button
                type="button"
                onClick={() => setRevistaView('historica')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  revistaView === 'historica'
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
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
                ? 'No hay revista actual cargada.'
                : 'No hay revista histórica cargada.'
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
            Resumen de asistencia
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stats.total_registros}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenLicencias}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <p className="text-xs uppercase text-slate-500">Licencias</p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stats.licencias}
              </p>
            </button>

            <button
              type="button"
              onClick={onOpenAusentes}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <p className="text-xs uppercase text-slate-500">Ausentes</p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stats.ausentes}
              </p>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase text-slate-500">Presentes</p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stats.presentes}
              </p>
            </div>
          </div>
        </section>
      </div>

      {openAssignmentModal ? (
        <AssignmentModal
          agentId={agent.id}
          agentName={agent.full_name}
          movementType={openAssignmentModal}
          onClose={() => setOpenAssignmentModal(null)}
          onSuccess={onRefreshProfile}
        />
      ) : null}
    </>
  );
}
