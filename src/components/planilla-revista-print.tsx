'use client';

import Image from 'next/image';
import type { RevistaItem } from './docente-datos-panel';

/**
 * Planilla oficial "Situación de Revista" — formato MEC Correntino.
 *
 * Se usa exclusivamente en la ruta /docentes/:id/planilla-revista y
 * /mi-perfil/planilla-revista. NO incluye datos personales del legajo
 * ni asistencia: solo nombre + DNI en el encabezado y la tabla de revista
 * (actual o histórica según el parámetro).
 */

type Props = {
  tipo: 'actual' | 'historica';
  agentName: string;
  agentDni: string;
  items: RevistaItem[];
};

function formatDate(date?: string | null) {
  if (!date) return '';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return String(date);
  return safe.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fv(v?: string | number | null) {
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}

function shiftLabel(v?: string | null) {
  if (!v) return '';
  const n = v.toUpperCase();
  if (n === 'MANANA' || n === 'MAÑANA' || n === 'M') return 'M';
  if (n === 'TARDE' || n === 'T') return 'T';
  if (n === 'NOCHE' || n === 'N' || n === 'NOCTURNO') return 'N';
  return v;
}

const MONTHS = [
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

function today() {
  const d = new Date();
  return {
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
    year: d.getFullYear(),
  };
}

const TITLE_TEXT: Record<'actual' | 'historica', string> = {
  actual:
    'La presente Situación de Revista corresponde al estado actual del docente en este Establecimiento.',
  historica:
    'La presente Situación de Revista corresponde a TODO lo actuado por el docente en este Establecimiento, detallándose las etapas en las que fue SUPLENTE Y/O INTERINO, y los hechos que asumió como Titular, si correspondiere.',
};

export function PlanillaRevistaPrint({
  tipo,
  agentName,
  agentDni,
  items,
}: Props) {
  const t = today();

  // CUE dinámico según las plazas del docente:
  // - Si todas son del mismo CUE → mostramos ese.
  // - Si tiene plazas en ambos (sede principal + extensión áulica),
  //   mostramos los dos separados por barra.
  const cuesSet = new Set<string>();
  for (const it of items) {
    const cue = it.pof_position?.establecimiento_cue;
    if (cue) cuesSet.add(cue);
  }
  const cuesArr = Array.from(cuesSet).sort();
  const cueDisplay =
    cuesArr.length === 0
      ? '1800697-00'
      : cuesArr.join(' / ');

  return (
    <article
      className="mx-auto max-w-[297mm] bg-white px-8 py-6 text-slate-900 shadow print:max-w-none print:px-6 print:py-4 print:shadow-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Forzar A4 landscape al imprimir */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4 landscape; margin: 12mm; }
            @media print {
              html, body { background: white !important; }
            }
          `,
        }}
      />
      {/* Encabezado institucional — versión compacta */}
      <header className="flex items-center gap-3 border-b-2 border-slate-900 pb-1.5">
        <div className="relative h-14 w-14 shrink-0">
          <Image
            src="/logo.png"
            alt="ETVV"
            fill
            sizes="56px"
            className="object-contain"
            priority
          />
        </div>
        <div className="flex-1 text-center leading-tight">
          <p className="text-[9pt] font-semibold">
            MINISTERIO DE EDUCACIÓN · DIRECCIÓN GENERAL DE EDUCACIÓN TÉCNICA
          </p>
          <p className="text-[11pt] font-bold">
            Escuela Técnica &quot;Valentín Virasoro&quot;
          </p>
          <p className="text-[8pt]">
            CUE: {cueDisplay} · Ejército Argentino Nº 156 · Goya (Ctes)
          </p>
        </div>
        <div className="w-14 shrink-0" aria-hidden />
      </header>

      {/* Título planilla */}
      <h1 className="mt-2 text-center text-[12pt] font-bold uppercase tracking-[0.18em]">
        Planilla Situación de Revista
      </h1>

      {/* Datos del agente (nombre + DNI compactos en una sola línea) */}
      <div className="mt-2 text-[10pt] leading-snug">
        <p>
          <span className="font-bold">El Rector</span> de la Escuela Técnica
          Valentín Virasoro hace constar que el agente:{' '}
          <span className="font-bold uppercase">{agentName || '-'}</span>{' '}
          <span className="font-semibold">· DNI:</span>{' '}
          <span className="font-bold">{agentDni || '-'}</span>
        </p>
        <p className="mt-1">
          La caja de Enseñanza Secundaria presenta la siguiente situación de
          revista:
        </p>
      </div>

      {/* Tabla principal */}
      <table className="mt-3 w-full border-collapse border border-slate-900 text-[9pt]">
        <thead>
          <tr className="bg-slate-100 text-slate-900">
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              PLAZA
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              ASIGNATURA/CARGO
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              CANT. HS.
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              CURSO
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              DIV.
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              TURNO
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              DESDE
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              HASTA
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              NORMA LEGAL
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              CARÁCTER
            </th>
            <th className="border border-slate-900 px-1 py-1 text-center font-bold">
              OBSERVACIONES
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={11}
                className="border border-slate-900 px-2 py-6 text-center italic text-slate-600"
              >
                Sin registros para esta situación de revista.
              </td>
            </tr>
          ) : (
            items.map((it, idx) => {
              // Mismo fallback que en la pantalla: si no hay asignatura,
              // usamos modality (cargo). Si tiene ambos, los concatenamos.
              const subj = (it.pof_position?.subject_name || '').trim();
              const cargo = (it.pof_position?.modality || '').trim();
              const cargoAsig =
                subj && cargo ? `${cargo} | ${subj}` : subj || cargo || '';
              const sinPlaza = !it.pof_position;
              const labelCelda = sinPlaza
                ? it.resolution_number
                  ? `Designación · ${it.resolution_number}`
                  : 'Designación'
                : cargoAsig;
              return (
              <tr key={it.id ?? idx}>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {sinPlaza ? 'S/P' : fv(it.pof_position?.plaza_number)}
                </td>
                <td className="border border-slate-900 px-1 py-1">
                  {labelCelda || fv(null)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {fv(it.pof_position?.hours_count)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {fv(it.pof_position?.course)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {fv(it.pof_position?.division)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {shiftLabel(it.pof_position?.shift)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {formatDate(it.start_date)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {formatDate(it.end_date) || 'CONTINÚA'}
                </td>
                {/* NORMA LEGAL invertida con CARÁCTER. Por pedido del corrector,
                    en esta columna mostramos el NÚMERO DE PLAZA POF. */}
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {fv(it.pof_position?.plaza_number)}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-center">
                  {fv(it.character_type)}
                </td>
                <td className="border border-slate-900 px-1 py-1">
                  {/* La norma legal queda en observaciones para no perderla */}
                  {[fv(it.legal_norm) !== '-' ? `NLD: ${it.legal_norm}` : null, it.notes]
                    .filter(Boolean)
                    .join(' | ') || '-'}
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Texto legal */}
      <p className="mt-4 text-justify text-[10pt] leading-relaxed">
        {TITLE_TEXT[tipo]}
      </p>

      <p className="mt-3 text-justify text-[10pt] leading-relaxed">
        Se extiende la presente constancia en Goya (Ctes), a los{' '}
        <span className="font-bold">{t.day}</span> días del mes de{' '}
        <span className="font-bold">{t.month}</span> de{' '}
        <span className="font-bold">{t.year}</span>, para ser presentada ante
        las autoridades que corresponda.
      </p>

      {/* Firmas */}
      <div className="mt-24 grid grid-cols-4 gap-6 text-center text-[8pt] font-semibold">
        <div className="border-t border-slate-900 pt-1">FIRMA DEL AGENTE</div>
        <div className="border-t border-slate-900 pt-1">
          FIRMA DEL SECRETARIO
        </div>
        <div className="border-t border-slate-900 pt-1">SELLO INSTITUCIÓN</div>
        <div className="border-t border-slate-900 pt-1">
          FIRMA Y SELLO DEL RECTOR
        </div>
      </div>
    </article>
  );
}
