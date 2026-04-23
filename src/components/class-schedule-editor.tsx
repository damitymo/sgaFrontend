'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Editor de Horario de Clase estilo planilla MEC.
 *
 * Tabla 5 filas (LUN-VIE) × 7 columnas (1ª a 7ª hora). El admin/administrativo
 * hace clic en cada celda para marcar × — esa celda representa una hora que
 * el docente dicta en esa asignación.
 *
 * Persiste contra el backend en `/assignments/:id/schedule`. Mientras no se
 * haya guardado nada todavía el backend devuelve una matriz 5x7 toda false.
 */

const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'] as const;
const HOURS = [1, 2, 3, 4, 5, 6, 7] as const;

type DayIndex = 0 | 1 | 2 | 3 | 4;
type HourIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ScheduleMatrix = boolean[][]; // [day][hour-1]

type Props = {
  assignmentId: number;
  year: number;
  title?: string;
  readOnly?: boolean;
  shiftLabel?: string;
};

function emptyMatrix(): ScheduleMatrix {
  return Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => false));
}

function normalizeMatrix(raw: unknown): ScheduleMatrix {
  if (!Array.isArray(raw) || raw.length !== 5) return emptyMatrix();
  return raw.map((row) => {
    if (!Array.isArray(row) || row.length !== 7) return Array(7).fill(false);
    return row.map((v) => Boolean(v));
  });
}

export function ClassScheduleEditor({
  assignmentId,
  year,
  title,
  readOnly = false,
  shiftLabel,
}: Props) {
  const [matrix, setMatrix] = useState<ScheduleMatrix>(() => emptyMatrix());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ weekly_schedule: ScheduleMatrix }>(
        `/assignments/${assignmentId}/schedule`,
      );
      setMatrix(normalizeMatrix(res.data?.weekly_schedule));
      setDirty(false);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el horario.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalHours = useMemo(
    () => matrix.reduce((acc, row) => acc + row.filter(Boolean).length, 0),
    [matrix],
  );

  const toggle = (day: DayIndex, hour: HourIndex) => {
    if (readOnly) return;
    setMatrix((prev) => {
      const next = prev.map((row) => [...row]);
      next[day][hour - 1] = !next[day][hour - 1];
      return next;
    });
    setDirty(true);
  };

  const clearAll = () => {
    if (readOnly) return;
    setMatrix(emptyMatrix());
    setDirty(true);
  };

  const save = async () => {
    if (readOnly) return;
    try {
      setSaving(true);
      setError(null);
      await api.put(`/assignments/${assignmentId}/schedule`, {
        weekly_schedule: matrix,
      });
      setDirty(false);
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 2500);
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Horario de clase · {year}
          </p>
          <h4 className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
            {title ?? 'Días y horas que dicta el docente'}
          </h4>
          {shiftLabel ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Turno: {shiftLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
            Total: {totalHours} hs semanales
          </span>
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={clearAll}
                disabled={loading || saving}
                className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={loading || saving || !dirty}
                className="rounded-lg bg-slate-800 px-3 py-1 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {saving ? 'Guardando...' : dirty ? 'Guardar' : 'Guardado'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {savedAt ? (
        <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
          Horario guardado ✓
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <th
                className="border border-slate-300 px-2 py-2 text-left font-semibold dark:border-slate-700"
                colSpan={1}
              >
                DÍAS
              </th>
              {HOURS.map((h) => (
                <th
                  key={h}
                  className="w-16 border border-slate-300 px-2 py-2 font-semibold dark:border-slate-700"
                >
                  {h}ª hr
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayName, dayIdx) => (
              <tr key={dayName}>
                <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {dayName}
                </th>
                {HOURS.map((h) => {
                  const active = matrix[dayIdx]?.[h - 1] ?? false;
                  return (
                    <td
                      key={h}
                      className="border border-slate-300 p-0 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggle(dayIdx as DayIndex, h as HourIndex)
                        }
                        disabled={readOnly || loading || saving}
                        aria-pressed={active}
                        aria-label={`${dayName} ${h}ª hora`}
                        className={`block h-10 w-full cursor-pointer select-none text-base font-bold transition ${
                          active
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                            : 'bg-white text-slate-400 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800'
                        } ${readOnly ? 'cursor-default hover:bg-inherit' : ''}`}
                      >
                        {active ? '×' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Hacé clic en cada casillero para marcar las horas que el docente
          dicta ese día y luego apretá Guardar. Los días que el docente dicta
          alimentan el cálculo de &quot;Deb.Dic.&quot; en la grilla anual.
        </p>
      ) : null}
    </section>
  );
}
