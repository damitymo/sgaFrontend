/**
 * Utilidades de calendario para la grilla de asistencia estilo MEC.
 *
 * Centraliza:
 *  - Feriados nacionales argentinos (por año, hardcodeados).
 *  - Recesos escolares (verano: 1 ene - 10 feb, invierno: ~21 jul - 1 ago).
 *  - Clasificación de cada día del año en un "kind" que la grilla usa
 *    para decidir color y código por defecto (S/D/F/negro/hábil/inexistente).
 *
 * Cuando se cambie de año lectivo alcanza con actualizar HOLIDAYS_BY_YEAR y,
 * si corresponde, SUMMER_BREAK_END / WINTER_BREAK_* del año específico.
 */

export type DayKind =
  | 'saturday'
  | 'sunday'
  | 'holiday'
  | 'break'
  | 'school'
  | 'nonexistent';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0 = domingo, 1 = lunes, ..., 6 = sábado (formato JS estándar)

/**
 * Feriados nacionales argentinos. Clave YYYY-MM-DD, valor nombre del feriado.
 * Se incluyen trasladables con la fecha efectiva en que cayeron ese año.
 */
const HOLIDAYS_BY_YEAR: Record<number, Record<string, string>> = {
  2025: {
    '2025-01-01': 'Año Nuevo',
    '2025-03-03': 'Carnaval (lunes)',
    '2025-03-04': 'Carnaval (martes)',
    '2025-03-24': 'Día de la Memoria',
    '2025-04-02': 'Malvinas',
    '2025-04-18': 'Viernes Santo',
    '2025-05-01': 'Día del Trabajador',
    '2025-05-02': 'Puente turístico',
    '2025-05-25': 'Revolución de Mayo',
    '2025-06-16': 'Güemes (trasladado)',
    '2025-06-20': 'Día de la Bandera',
    '2025-07-09': 'Independencia',
    '2025-08-17': 'San Martín',
    '2025-10-12': 'Día del Respeto a la Diversidad Cultural',
    '2025-11-24': 'Soberanía Nacional (trasladado)',
    '2025-12-08': 'Inmaculada Concepción',
    '2025-12-25': 'Navidad',
  },
  2026: {
    '2026-01-01': 'Año Nuevo',
    '2026-02-16': 'Carnaval (lunes)',
    '2026-02-17': 'Carnaval (martes)',
    '2026-03-24': 'Día de la Memoria',
    '2026-04-02': 'Malvinas',
    '2026-04-03': 'Viernes Santo',
    '2026-05-01': 'Día del Trabajador',
    '2026-05-25': 'Revolución de Mayo',
    '2026-06-15': 'Güemes (trasladado)',
    '2026-06-20': 'Día de la Bandera',
    '2026-07-09': 'Independencia',
    '2026-08-17': 'San Martín',
    '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
    '2026-11-23': 'Soberanía Nacional (trasladado)',
    '2026-12-08': 'Inmaculada Concepción',
    '2026-12-25': 'Navidad',
  },
};

/**
 * Recesos escolares por año (inclusivos en ambos extremos).
 * Si no hay entrada para el año se usan defaults razonables.
 */
const SCHOOL_BREAKS: Record<
  number,
  Array<{ start: string; end: string; label: string }>
> = {
  2025: [
    { start: '2025-01-01', end: '2025-02-10', label: 'Receso verano' },
    { start: '2025-07-14', end: '2025-07-25', label: 'Receso invierno' },
  ],
  2026: [
    { start: '2026-01-01', end: '2026-02-10', label: 'Receso verano' },
    { start: '2026-07-13', end: '2026-07-24', label: 'Receso invierno' },
  ],
};

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Devuelve la cantidad real de días del mes (1-indexed).
 * Enero=1, Febrero=2, ..., Diciembre=12.
 */
export function daysInMonth(year: number, month: number): number {
  // mes 0-indexed al Date con día 0 → último día del mes anterior
  return new Date(year, month, 0).getDate();
}

export function getWeekday(year: number, month: number, day: number): Weekday {
  return new Date(year, month - 1, day).getDay() as Weekday;
}

function isWithin(dateIso: string, start: string, end: string): boolean {
  return dateIso >= start && dateIso <= end;
}

export function isHoliday(year: number, month: number, day: number): boolean {
  const iso = toIsoDate(year, month, day);
  return Boolean(HOLIDAYS_BY_YEAR[year]?.[iso]);
}

export function holidayName(
  year: number,
  month: number,
  day: number,
): string | null {
  const iso = toIsoDate(year, month, day);
  return HOLIDAYS_BY_YEAR[year]?.[iso] ?? null;
}

export function isSchoolBreak(
  year: number,
  month: number,
  day: number,
): { break: boolean; label: string | null } {
  const iso = toIsoDate(year, month, day);
  const list = SCHOOL_BREAKS[year] ?? [];
  for (const r of list) {
    if (isWithin(iso, r.start, r.end)) {
      return { break: true, label: r.label };
    }
  }
  return { break: false, label: null };
}

/**
 * Clasifica un día del año. Si el día no existe en el mes (ej: 30 feb) retorna
 * 'nonexistent' para que la grilla lo pinte de negro sólido sin código.
 *
 * Prioridad: nonexistent > break > holiday > weekend > school.
 * Razón: si el 1 de enero es feriado Y cae en receso, se pinta como receso
 * (negro sólido) porque es más informativo para el docente.
 */
export function classifyDay(
  year: number,
  month: number,
  day: number,
): DayKind {
  if (day > daysInMonth(year, month)) return 'nonexistent';

  const br = isSchoolBreak(year, month, day);
  if (br.break) return 'break';

  if (isHoliday(year, month, day)) return 'holiday';

  const w = getWeekday(year, month, day);
  if (w === 6) return 'saturday';
  if (w === 0) return 'sunday';

  return 'school';
}

/**
 * Código por defecto que se pinta en la celda según el kind.
 * Los días 'school' quedan con código null para que la grilla muestre
 * lo que venga del backend (P, AI, AJ, L1, L2, H) o vacío si no hay registro.
 */
export function defaultCodeForKind(kind: DayKind): string | null {
  switch (kind) {
    case 'saturday':
      return 'S';
    case 'sunday':
      return 'D';
    case 'holiday':
      return 'F';
    case 'break':
    case 'nonexistent':
    case 'school':
    default:
      return null;
  }
}

/**
 * Nombre del día de la semana en español corto.
 */
export function weekdayShort(w: Weekday): string {
  return ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][w];
}
