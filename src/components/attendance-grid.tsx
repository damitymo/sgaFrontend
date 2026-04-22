'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type GridDay = {
  day: number;
  raw_code: string | null;
  status: string | null;
  observation: string | null;
};

type GridMonthTotals = {
  dicto: number;
  ai: number;
  aj: number;
  lic1: number;
  lic2: number;
  deb_dic: number;
  pct_asist: number;
};

type GridMonth = {
  month: number;
  days: GridDay[];
  totals: GridMonthTotals;
};

type GridResponse = {
  agent_id: number;
  year: number;
  months: GridMonth[];
  year_totals: GridMonthTotals;
};

type Props = {
  /**
   * Fuente para levantar la grilla. Si el usuario es AGENTE usamos
   * /attendance/me/grid (el back filtra por el agent_id del token),
   * si no usamos /attendance/agent/:id/grid.
   */
  source: { kind: 'me' } | { kind: 'agent'; agentId: number };
  canManage: boolean;
};

const MONTH_LABELS = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

/**
 * Mapa de colores por raw_code. Mantiene el look del libro de asistencia
 * del MEC: presentes tenues, feriados grises, ausentes/licencias en rojo
 * y amarillo. Cada código se renderiza tal cual vino del Excel original.
 */
function codeStyle(code: string | null): string {
  if (!code) return 'bg-white dark:bg-slate-900';
  const c = code.toUpperCase();
  if (c === 'P') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
  if (c === 'F') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (c === 'S' || c === 'D') return 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  if (c === 'AJ') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
  if (c === 'AI') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (c === 'L1') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200';
  if (c === 'L2') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200';
  if (c === 'H') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200';
  return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

const LEGEND: Array<{ code: string; label: string }> = [
  { code: 'P', label: 'Presente' },
  { code: 'F', label: 'Feriado' },
  { code: 'S', label: 'Sábado' },
  { code: 'D', label: 'Domingo' },
  { code: 'AJ', label: 'Aus. justificado' },
  { code: 'AI', label: 'Aus. injustificado' },
  { code: 'L1', label: 'Licencia 1' },
  { code: 'L2', label: 'Licencia 2' },
  { code: 'H', label: 'Huelga' },
];

function currentYear() {
  return new Date().getFullYear();
}

export function AttendanceGrid({ source, canManage }: Props) {
  const [year, setYear] = useState<number>(currentYear());
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadGrid = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const path =
        source.kind === 'me'
          ? `/attendance/me/grid?year=${year}`
          : `/attendance/agent/${source.agentId}/grid?year=${year}`;

      const res = await api.get<GridResponse>(path);
      setGrid(res.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la grilla de asistencia.');
    } finally {
      setLoading(false);
    }
  }, [source, year]);

  useEffect(() => {
    void loadGrid();
  }, [loadGrid]);

  const yearOptions = useMemo(() => {
    const now = currentYear();
    const list: number[] = [];
    for (let y = now + 1; y >= now - 5; y -= 1) list.push(y);
    return list;
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
            Libro de asistencia individual
          </p>
          <h4 className="mt-1 text-xl font-bold text-slate-800 print:text-base dark:text-slate-100">
            Año {year}
          </h4>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <label className="text-sm text-slate-600 dark:text-slate-300">Año</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {canManage ? (
            <button
              type="button"
              onClick={() => alert('La carga manual de asistencia se habilitará en una pantalla dedicada.')}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              title="Futuro: abrir el editor de asistencia"
            >
              + Cargar / modificar
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Cargando grilla...
        </div>
      ) : grid ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-center text-[11px] print:text-[9px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 print:bg-white dark:bg-slate-800 dark:text-slate-200">
                  <th className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-2 text-left font-bold dark:border-slate-700 dark:bg-slate-800">
                    MES
                  </th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <th
                      key={d}
                      className="border border-slate-300 px-1 py-1 font-semibold dark:border-slate-700"
                    >
                      {d}
                    </th>
                  ))}
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">DICTO</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">A.I.</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">A.J.</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">Lic.1</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">Lic.2</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">Deb.Dic.</th>
                  <th className="border border-slate-300 px-2 py-1 font-bold dark:border-slate-700">% Asist.</th>
                </tr>
              </thead>
              <tbody>
                {grid.months.map((m) => (
                  <tr key={m.month}>
                    <th className="sticky left-0 z-10 border border-slate-300 bg-white px-2 py-1 text-left font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {MONTH_LABELS[m.month - 1]}
                    </th>
                    {m.days.map((d) => (
                      <td
                        key={d.day}
                        title={
                          d.observation
                            ? `Día ${d.day}: ${d.observation}`
                            : d.raw_code
                              ? `Día ${d.day}: ${d.raw_code}`
                              : ''
                        }
                        className={`border border-slate-200 px-1 py-1 font-mono text-[11px] ${codeStyle(d.raw_code)} dark:border-slate-700`}
                      >
                        {d.raw_code ?? ''}
                      </td>
                    ))}
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-100">
                      {m.totals.dicto}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-red-700 dark:border-slate-700 dark:text-red-300">
                      {m.totals.ai}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-amber-700 dark:border-slate-700 dark:text-amber-300">
                      {m.totals.aj}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-sky-700 dark:border-slate-700 dark:text-sky-300">
                      {m.totals.lic1}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-indigo-700 dark:border-slate-700 dark:text-indigo-300">
                      {m.totals.lic2}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      {m.totals.deb_dic}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-bold text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
                      {m.totals.pct_asist.toFixed(0)}%
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-200 font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                  <th className="sticky left-0 z-10 border border-slate-300 bg-slate-200 px-2 py-2 text-left dark:border-slate-700 dark:bg-slate-700">
                    TOTALES {grid.year}
                  </th>
                  <td className="border border-slate-300 dark:border-slate-700" colSpan={31} />
                  <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                    {grid.year_totals.dicto}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-red-700 dark:border-slate-700 dark:text-red-300">
                    {grid.year_totals.ai}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-amber-700 dark:border-slate-700 dark:text-amber-300">
                    {grid.year_totals.aj}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-sky-700 dark:border-slate-700 dark:text-sky-300">
                    {grid.year_totals.lic1}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-indigo-700 dark:border-slate-700 dark:text-indigo-300">
                    {grid.year_totals.lic2}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {grid.year_totals.deb_dic}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
                    {grid.year_totals.pct_asist.toFixed(0)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            {LEGEND.map((l) => (
              <div key={l.code} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-4 w-6 rounded border border-slate-300 text-center font-mono text-[10px] leading-4 dark:border-slate-600 ${codeStyle(l.code)}`}
                >
                  {l.code}
                </span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
