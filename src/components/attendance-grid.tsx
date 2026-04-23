'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  classifyDay,
  daysInMonth,
  defaultCodeForKind,
  getWeekday,
  holidayName,
  type DayKind,
} from '@/lib/calendar-utils';
import { useEscapeKey } from '@/lib/use-escape-key';

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
   * /attendance/me/grid, si no usamos /attendance/agent/:id/grid.
   */
  source: { kind: 'me' } | { kind: 'agent'; agentId: number };
  canManage: boolean;
};

const MONTH_LABELS = [
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

/** Descuento de puntaje por cada día de Licencia 1 (a descontar). */
const L1_POINT_PENALTY = 0.1;
const BASE_SCORE = 10;

/**
 * Estilo visual de la celda según su kind (finde, feriado, receso, etc.)
 * y el código que se muestra dentro. El kind tiene prioridad: los días
 * de receso son negros sólidos aunque haya un raw_code "fantasma".
 */
function cellClass(kind: DayKind, code: string | null): string {
  if (kind === 'nonexistent' || kind === 'break') {
    return 'bg-slate-900 text-transparent dark:bg-black';
  }
  if (kind === 'saturday' || kind === 'sunday') {
    return 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300';
  }
  if (kind === 'holiday') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  }

  // school day — ahora depende del code
  if (!code) return 'bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-600';
  const c = code.toUpperCase();
  if (c === 'P')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (c === 'AJ')
    return 'bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-100';
  if (c === 'AI')
    return 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200';
  if (c === 'L1')
    return 'bg-sky-200 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200';
  if (c === 'L2')
    return 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200';
  if (c === 'H')
    return 'bg-purple-200 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

/** Referencias oficiales de la planilla MEC. Texto completo igual al impreso. */
const LEGEND_ROWS: Array<{ code: string; label: string; detail?: string }> = [
  { code: 'AI', label: 'Ausente Injustificado' },
  { code: 'AJ', label: 'Ausente Justificado' },
  {
    code: 'L1',
    label: 'Licencia a descontar:',
    detail:
      'por enfermedad del agente, atención a un familiar, exámenes, comisión de servicios, licencia por razones particulares',
  },
  {
    code: 'L2',
    label: 'Licencias no descontadas:',
    detail:
      'licencia por maternidad, duelo, servicio militar, matrimonio, otorgadas por el gobernador o para asistir a cursos de perfeccionamiento docente, licencia ginecológica',
  },
  { code: 'H', label: 'Paro' },
];

/** Chip del código en leyenda (usa los mismos colores de la grilla). */
function legendChipClass(code: string): string {
  return cellClass('school', code);
}

function currentYear() {
  return new Date().getFullYear();
}

const EDITABLE_CODES = ['P', 'AI', 'AJ', 'L1', 'L2', 'H'] as const;
type EditableCode = (typeof EDITABLE_CODES)[number];

const CODE_TO_STATUS: Record<EditableCode, string> = {
  P: 'PRESENTE',
  AI: 'AUSENTE_INJUSTIFICADO',
  AJ: 'AUSENTE_JUSTIFICADO',
  L1: 'LICENCIA',
  L2: 'LICENCIA',
  H: 'AUSENTE_JUSTIFICADO',
};

type EditTarget = {
  agentId: number;
  year: number;
  month: number;
  day: number;
};

export function AttendanceGrid({ source, canManage }: Props) {
  const [year, setYear] = useState<number>(currentYear());
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editCode, setEditCode] = useState<EditableCode>('P');
  const [saving, setSaving] = useState(false);

  useEscapeKey(() => setEditTarget(null), editTarget !== null);

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

  const openCell = (month: number, day: number) => {
    if (!canManage) return;
    if (source.kind !== 'agent') return;

    const kind = classifyDay(year, month, day);
    if (
      kind === 'nonexistent' ||
      kind === 'break' ||
      kind === 'saturday' ||
      kind === 'sunday' ||
      kind === 'holiday'
    ) {
      return;
    }

    setEditCode('P');
    setEditTarget({
      agentId: source.agentId,
      year,
      month,
      day,
    });
  };

  const saveEdit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!editTarget) return;

    try {
      setSaving(true);
      const date = `${editTarget.year}-${String(editTarget.month).padStart(2, '0')}-${String(editTarget.day).padStart(2, '0')}`;

      await api.post('/attendance', {
        agent_id: editTarget.agentId,
        attendance_date: date,
        status: CODE_TO_STATUS[editCode],
        raw_code: editCode,
      });

      setEditTarget(null);
      await loadGrid();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el cambio de asistencia.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Cálculos de puntaje y totales vistos desde el cliente ----

  const yearScore = useMemo(() => {
    if (!grid) {
      return {
        partial: BASE_SCORE,
        finalPct: 100,
        finalScore: BASE_SCORE,
        deducted: 0,
        licDays: 0,
      };
    }
    const lic1 = grid.year_totals.lic1;
    const deducted = Math.min(BASE_SCORE, lic1 * L1_POINT_PENALTY);
    const partial = Math.max(0, BASE_SCORE - deducted);
    const finalPct = grid.year_totals.pct_asist;

    return {
      partial,
      finalPct,
      finalScore: partial, // PUNTO FINAL = PUNTAJE PARCIAL (por ahora sin bonus)
      deducted,
      licDays: lic1,
    };
  }, [grid]);

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
                {grid.months.map((m) => {
                  const monthLen = daysInMonth(year, m.month);
                  const byDay = new Map(m.days.map((d) => [d.day, d]));
                  return (
                    <tr key={m.month}>
                      <th className="sticky left-0 z-10 border border-slate-300 bg-white px-2 py-1 text-left font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {MONTH_LABELS[m.month - 1]}
                      </th>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (dayNumber) => {
                          const kind = classifyDay(year, m.month, dayNumber);
                          const record = byDay.get(dayNumber);
                          const defaultCode = defaultCodeForKind(kind);
                          const code =
                            kind === 'nonexistent' || kind === 'break'
                              ? null
                              : (record?.raw_code ?? defaultCode);

                          const wd =
                            dayNumber <= monthLen
                              ? getWeekday(year, m.month, dayNumber)
                              : null;
                          const weekdayLabel =
                            wd !== null
                              ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][wd]
                              : '';
                          const hol = holidayName(year, m.month, dayNumber);

                          const titleParts: string[] = [];
                          if (weekdayLabel)
                            titleParts.push(
                              `${weekdayLabel} ${dayNumber}/${m.month}`,
                            );
                          if (hol) titleParts.push(`Feriado: ${hol}`);
                          if (kind === 'break') titleParts.push('Receso escolar');
                          if (record?.observation)
                            titleParts.push(record.observation);
                          if (record?.raw_code && !titleParts.includes(record.raw_code))
                            titleParts.push(`Código: ${record.raw_code}`);

                          const clickable =
                            canManage &&
                            source.kind === 'agent' &&
                            kind === 'school';

                          return (
                            <td
                              key={dayNumber}
                              title={titleParts.join(' · ')}
                              onClick={
                                clickable
                                  ? () => openCell(m.month, dayNumber)
                                  : undefined
                              }
                              className={`border border-slate-200 px-1 py-1 font-mono text-[11px] dark:border-slate-700 ${cellClass(kind, code)} ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' : ''}`}
                            >
                              {kind === 'nonexistent' || kind === 'break'
                                ? ''
                                : (code ?? '')}
                            </td>
                          );
                        },
                      )}
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
                  );
                })}

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

          {/* Leyenda + Panel de puntaje en fila */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
            {/* Leyenda */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-900/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-amber-900 dark:bg-amber-800/60 dark:text-amber-100">
                  Referencias
                </span>
              </div>
              <dl className="space-y-2 text-[12px]">
                {LEGEND_ROWS.map((row) => (
                  <div key={row.code} className="flex items-start gap-2">
                    <dt
                      className={`mt-0.5 inline-flex h-5 min-w-[28px] items-center justify-center rounded border border-amber-300 px-1 font-mono text-[11px] font-bold dark:border-amber-700 ${legendChipClass(row.code)}`}
                    >
                      {row.code}
                    </dt>
                    <dd className="text-slate-800 dark:text-slate-200">
                      <span className="font-semibold">{row.label}</span>
                      {row.detail ? (
                        <span className="text-slate-700 dark:text-slate-300">
                          {' '}
                          ({row.detail})
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                Las celdas en negro corresponden a receso escolar o a días que
                no existen en el mes. Las celdas rosadas son sábados (S) y
                domingos (D); las amarillas son feriados (F).
              </p>
            </div>

            {/* Panel de puntaje */}
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 font-mono text-[13px] text-red-700 shadow-sm dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-red-300">
              <div className="grid grid-cols-2 gap-y-2">
                <div className="font-bold uppercase tracking-wider">
                  Puntaje parcial
                </div>
                <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                  {yearScore.partial.toFixed(2)}
                </div>

                <div className="font-bold uppercase tracking-wider">% Final</div>
                <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                  {yearScore.finalPct.toFixed(2)}
                </div>

                <div className="uppercase tracking-wider">Se le descontaron</div>
                <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                  {yearScore.deducted.toFixed(2)}
                </div>

                <div className="font-bold uppercase tracking-wider">
                  Punto final
                </div>
                <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                  {yearScore.finalScore.toFixed(2)}
                </div>

                <div className="col-span-2 text-slate-700 dark:text-slate-300">
                  por{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {yearScore.licDays}
                  </span>{' '}
                  días de licencia
                </div>

                <div className="font-bold uppercase tracking-wider">Año</div>
                <div className="text-right font-bold text-slate-900 dark:text-slate-100">
                  {grid.year}
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-snug text-slate-600 dark:text-slate-400">
                Descuento calculado como {L1_POINT_PENALTY.toFixed(2)} punto
                por día de Licencia 1. Lic.2 y H no descuentan.
              </p>
            </div>
          </div>

          {canManage && source.kind === 'agent' ? (
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              Hacé clic en cualquier celda blanca (día hábil) para cargar o
              cambiar el código de asistencia.
            </p>
          ) : null}
        </>
      ) : null}

      {/* Modal edición por celda */}
      {editTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => !saving && setEditTarget(null)}
        >
          <form
            onSubmit={saveEdit}
            onClick={(e) => e.stopPropagation()}
            data-modal-root
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Asistencia del día
            </p>
            <h4 className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
              {String(editTarget.day).padStart(2, '0')}/
              {String(editTarget.month).padStart(2, '0')}/{editTarget.year}
            </h4>

            <div className="mt-4 space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Código
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EDITABLE_CODES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditCode(c)}
                    className={`rounded-lg border px-3 py-2 font-mono text-sm font-bold transition ${
                      editCode === c
                        ? 'border-slate-800 ring-2 ring-slate-800 dark:border-slate-100 dark:ring-slate-100'
                        : 'border-slate-300 dark:border-slate-700'
                    } ${cellClass('school', c)}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-modal-submit
                disabled={saving}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
