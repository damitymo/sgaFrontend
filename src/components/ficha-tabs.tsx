'use client';

import { useState } from 'react';

export type FichaTab = {
  key: string;
  label: string;
  badge?: number;
  content: React.ReactNode;
};

type Props = {
  tabs: FichaTab[];
};

/**
 * Barra de tabs para la ficha docente (Cargos / Inasistencias / Licencias).
 * Solo monta el contenido de la tab activa — evita que AttendanceGrid y
 * LicenciasPanel disparen sus fetches todos a la vez al abrir la ficha.
 */
export function FichaTabs({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.key);

  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 print:hidden dark:border-slate-700 dark:bg-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab.key === activeTab?.key
                ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
            {typeof tab.badge === 'number' ? (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  tab.key === activeTab?.key
                    ? 'bg-white/20'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab?.content}

      {/* Impresión: todas las tabs visibles, sin el selector. */}
      <div className="hidden print:block print:space-y-4">
        {tabs
          .filter((tab) => tab.key !== activeTab?.key)
          .map((tab) => (
            <div key={tab.key}>{tab.content}</div>
          ))}
      </div>
    </div>
  );
}
