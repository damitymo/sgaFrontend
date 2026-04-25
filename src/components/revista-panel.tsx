'use client';

import { useMemo, useState } from 'react';
import { AssignmentModal } from '@/components/assignment-modal';
import type { AgentProfile, RevistaItem } from './docente-datos-panel';

type Props = {
  agent: AgentProfile;
  canManage: boolean;
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
  if (normalized === 'MANANA' || normalized === 'MAÑANA' || normalized === 'M') return 'M';
  if (normalized === 'TARDE' || normalized === 'T') return 'T';
  if (normalized === 'NOCHE' || normalized === 'N' || normalized === 'NOCTURNO') return 'N';
  return value;
}

function RevistaTable({ items, emptyText }: { items: RevistaItem[]; emptyText: string }) {
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
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">PLAZA</th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">ASIGNATURA / CARGO</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">HS.</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">CURSO</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">DIV.</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">TURNO</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">CARÁCTER</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">DESDE</th>
            <th className="border border-slate-300 px-2 py-2 text-center font-bold print:px-1 print:py-1 dark:border-slate-700">HASTA</th>
            <th className="border border-slate-300 px-2 py-2 text-left font-bold print:px-1 print:py-1 dark:border-slate-700">NORMA LEGAL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            // Cuando la designación viene del endpoint /api/Designacion del MEC
            // no tiene plaza vinculada. Mostramos el número de FD en la columna
            // asignatura/cargo y un fondo distinto para distinguirla.
            const sinPlaza = !item.pof_position;
            const labelAsignatura = sinPlaza
              ? item.resolution_number
                ? `Designación · ${item.resolution_number}`
                : 'Designación (sin plaza vinculada)'
              : fieldValue(item.pof_position?.subject_name);

            return (
              <tr
                key={item.id ?? index}
                className={
                  sinPlaza
                    ? 'bg-slate-50/60 italic dark:bg-slate-800/40'
                    : ''
                }
              >
                <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 dark:border-slate-700">
                  {sinPlaza
                    ? 'S/P'
                    : fieldValue(item.pof_position?.plaza_number)}
                </td>
                <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 dark:border-slate-700">
                  {labelAsignatura}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * RevistaPanel: situación de revista con toggle actual/histórica.
 * En la vista admin aparecen los botones de Designación/Baja (que abren
 * el AssignmentModal existente), en la vista agente son readonly.
 */
export function RevistaPanel({ agent, canManage, onRefreshProfile }: Props) {
  const [revistaView, setRevistaView] = useState<RevistaView>('actual');
  const [openAssignmentModal, setOpenAssignmentModal] = useState<
    'DESIGNACION' | 'BAJA' | null
  >(null);

  const revistaItems = useMemo(
    () =>
      revistaView === 'actual'
        ? agent.revista_actual ?? []
        : agent.revista_historica ?? [],
    [agent.revista_actual, agent.revista_historica, revistaView],
  );

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
              Situación de revista
            </p>
            <h4 className="mt-1 text-xl font-bold text-slate-800 print:text-base dark:text-slate-100">
              {revistaView === 'actual' ? 'Revista actual' : 'Revista histórica'}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setRevistaView('actual')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  revistaView === 'actual'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Actual
              </button>
              <button
                type="button"
                onClick={() => setRevistaView('historica')}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  revistaView === 'historica'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Histórica
              </button>
            </div>

            {canManage ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpenAssignmentModal('DESIGNACION')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  + Designación
                </button>
                <button
                  type="button"
                  onClick={() => setOpenAssignmentModal('BAJA')}
                  className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  Baja
                </button>
              </div>
            ) : null}
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
