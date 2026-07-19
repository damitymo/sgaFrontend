'use client';

type Props = {
  cargosActivos: number;
  faltasInjustificadas: number;
  faltasJustificadas: number;
  diasLicencia: number;
  year: number;
};

function StatCard({
  label,
  value,
  tone,
  footnote,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'rose' | 'emerald' | 'amber';
  footnote?: string;
}) {
  const toneClasses = {
    neutral:
      'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    amber:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 text-center ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {footnote ? (
        <p className="mt-1 text-[11px] font-semibold">{footnote}</p>
      ) : null}
    </div>
  );
}

/** Art. 31 del Régimen de licencias: 12 inasistencias injustificadas en el
 * año habilitan la cesantía (previo sumario). */
function cesantiaFootnote(faltasInjustificadas: number): string | undefined {
  if (faltasInjustificadas >= 12) return '⚠ Cesantía habilitada (Art. 31)';
  if (faltasInjustificadas >= 8) return '⚠ Riesgo Art. 31';
  return undefined;
}

export function FichaStatsRow({
  cargosActivos,
  faltasInjustificadas,
  faltasJustificadas,
  diasLicencia,
  year,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:hidden">
      <StatCard label="Cargos activos" value={cargosActivos} tone="neutral" />
      <StatCard
        label={`Faltas injustificadas ${year}`}
        value={faltasInjustificadas}
        tone="rose"
        footnote={cesantiaFootnote(faltasInjustificadas)}
      />
      <StatCard
        label={`Faltas justificadas ${year}`}
        value={faltasJustificadas}
        tone="emerald"
      />
      <StatCard
        label={`Días de licencia ${year}`}
        value={diasLicencia}
        tone="amber"
      />
    </div>
  );
}
