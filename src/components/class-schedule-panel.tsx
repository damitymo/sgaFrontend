'use client';

import { useEffect, useState } from 'react';
import { ClassScheduleEditor } from '@/components/class-schedule-editor';

export type CargoOption = {
  assignmentId: number;
  label: string;
  shiftLabel?: string;
};

type Props = {
  cargos: CargoOption[];
  year: number;
  readOnly?: boolean;
};

/**
 * Antes se montaba un <ClassScheduleEditor> por cada cargo activo del
 * docente, uno debajo del otro. Ahora es un solo bloque: si el docente
 * tiene más de un cargo, un selector arriba elige cuál horario se está
 * viendo/editando. El modelo de datos no cambia (el horario sigue siendo
 * por asignación) — esto es solo para dejar de apilarlos en pantalla.
 */
export function ClassSchedulePanel({ cargos, year, readOnly = false }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    cargos[0]?.assignmentId ?? null,
  );

  useEffect(() => {
    if (!cargos.some((c) => c.assignmentId === selectedId)) {
      setSelectedId(cargos[0]?.assignmentId ?? null);
    }
  }, [cargos, selectedId]);

  if (cargos.length === 0) return null;

  const selected = cargos.find((c) => c.assignmentId === selectedId) ?? cargos[0];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
      {cargos.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Cargo
          </label>
          <select
            value={selected.assignmentId}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {cargos.map((cargo) => (
              <option key={cargo.assignmentId} value={cargo.assignmentId}>
                {cargo.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ClassScheduleEditor
        assignmentId={selected.assignmentId}
        year={year}
        title={selected.label}
        shiftLabel={selected.shiftLabel}
        readOnly={readOnly}
      />
    </section>
  );
}
