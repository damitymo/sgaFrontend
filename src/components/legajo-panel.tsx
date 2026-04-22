'use client';

import { useMemo, useState } from 'react';
import type { AgentProfile, AssignmentItem } from './docente-datos-panel';

type Props = {
  agent: AgentProfile;
};

type TabId = 'datos' | 'designaciones';

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

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return '-';
  const safe = new Date(birthDate);
  if (Number.isNaN(safe.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - safe.getFullYear();
  const m = today.getMonth() - safe.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < safe.getDate())) age -= 1;
  if (age < 0 || age > 120) return '-';
  return `${age} años`;
}

/**
 * Cuenta cuántas de las claves vienen con un valor no vacío. Sirve para
 * decidir si un tab tiene "datos reales" o si lo ocultamos directamente
 * (como pidió Damian: "Solo los tabs que tienen datos").
 */
function hasAnyValue(...values: Array<string | number | null | undefined>) {
  return values.some((v) => v !== null && v !== undefined && v !== '');
}

function InfoCell({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div
      className={
        full
          ? 'md:col-span-2 xl:col-span-3'
          : ''
      }
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 print:text-[9px]">
        {label}
      </p>
      <div className="min-h-[34px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 print:border-slate-400 print:py-1 print:text-[11px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function AssignmentsTable({ items }: { items: AssignmentItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        No hay designaciones cargadas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm print:text-[10px]">
        <thead>
          <tr className="bg-slate-100 text-slate-700 print:bg-white dark:bg-slate-800 dark:text-slate-200">
            <th className="border border-slate-300 px-2 py-2 text-left font-semibold dark:border-slate-700">
              PLAZA
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-semibold dark:border-slate-700">
              ASIGNATURA / CARGO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              HS.
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              CURSO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              DIV.
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              TURNO
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              CARÁCTER
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              DESDE
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              HASTA
            </th>
            <th className="border border-slate-300 px-2 py-2 text-left font-semibold dark:border-slate-700">
              NORMA LEGAL
            </th>
            <th className="border border-slate-300 px-2 py-2 text-center font-semibold dark:border-slate-700">
              ESTADO
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const norma = [item.legal_norm_type, item.legal_norm_number]
              .filter(Boolean)
              .join(' ');

            return (
              <tr key={item.id ?? idx}>
                <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                  {fieldValue(item.pof_position?.plaza_number)}
                </td>
                <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                  {fieldValue(item.pof_position?.subject_name)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {fieldValue(item.pof_position?.hours_count)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {fieldValue(item.pof_position?.course)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {fieldValue(item.pof_position?.division)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {shiftLabel(item.pof_position?.shift)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {fieldValue(item.character_type)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {formatDate(item.assignment_date)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {formatDate(item.end_date)}
                </td>
                <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                  {fieldValue(norma)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                  {item.is_active ? (
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      ACTIVA
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      FINALIZADA
                    </span>
                  )}
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
 * LegajoPanel: header estilo "Gestión Educativa" del MEC con apellido,
 * nombre, DNI y tabs. Muestra solo los tabs con datos reales.
 *
 * Hoy siempre hay datos generales (full_name/dni son obligatorios), así
 * que el tab "Datos Generales" es always-on. "Designaciones" aparece
 * solo si el agente tiene al menos una.
 */
export function LegajoPanel({ agent }: Props) {
  const availableTabs = useMemo<Array<{ id: TabId; label: string }>>(() => {
    const tabs: Array<{ id: TabId; label: string }> = [
      { id: 'datos', label: 'Datos Generales' },
    ];

    if ((agent.assignments?.length ?? 0) > 0) {
      tabs.push({ id: 'designaciones', label: 'Designaciones' });
    }

    return tabs;
  }, [agent.assignments]);

  const [activeTab, setActiveTab] = useState<TabId>('datos');

  const showContacto = hasAnyValue(
    agent.address,
    agent.phone,
    agent.mobile,
    agent.email,
  );

  const showInstitucional = hasAnyValue(
    agent.teaching_file_number,
    agent.board_file_number,
    agent.secondary_board_number,
    agent.school_entry_date,
    agent.teaching_entry_date,
    agent.titles,
    agent.identity_card_number,
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-slate-400 dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 text-white print:bg-white print:text-slate-900 dark:border-slate-700">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200 print:text-slate-600">
          Legajo del Personal
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold leading-tight print:text-lg">
              {agent.last_name
                ? `${agent.last_name}${agent.first_name ? `, ${agent.first_name}` : ''}`
                : agent.full_name}
            </h3>
            <p className="mt-1 text-sm text-slate-200 print:text-slate-700">
              DNI {agent.dni}
              {agent.teaching_file_number
                ? ` · Legajo ${agent.teaching_file_number}`
                : ''}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1 print:hidden">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                  : 'bg-slate-800/40 text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="p-6 print:p-3">
        {activeTab === 'datos' ? (
          <div className="space-y-6 print:space-y-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Datos personales
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InfoCell label="Apellido" value={fieldValue(agent.last_name)} />
                <InfoCell label="Nombre" value={fieldValue(agent.first_name)} />
                <InfoCell label="DNI" value={fieldValue(agent.dni)} />
                <InfoCell
                  label="Fecha de nacimiento"
                  value={formatDate(agent.birth_date)}
                />
                <InfoCell label="Edad" value={calcAge(agent.birth_date)} />
                <InfoCell label="Sexo" value={fieldValue(agent.sex)} />
                <InfoCell
                  label="Estado civil"
                  value={fieldValue(agent.marital_status)}
                />
                <InfoCell
                  label="Lugar de nacimiento"
                  value={fieldValue(agent.birth_place)}
                />
                <InfoCell label="Nacionalidad" value={fieldValue(agent.nationality)} />
                <InfoCell
                  label="Cédula de identidad"
                  value={fieldValue(agent.identity_card_number)}
                />
              </div>
            </div>

            {showContacto ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Contacto
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoCell label="Domicilio" value={fieldValue(agent.address)} full />
                  <InfoCell label="Teléfono fijo" value={fieldValue(agent.phone)} />
                  <InfoCell label="Teléfono móvil" value={fieldValue(agent.mobile)} />
                  <InfoCell label="Email" value={fieldValue(agent.email)} />
                </div>
              </div>
            ) : null}

            {showInstitucional ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Datos institucionales
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoCell
                    label="Legajo docente"
                    value={fieldValue(agent.teaching_file_number)}
                  />
                  <InfoCell
                    label="Junta de clasificación"
                    value={fieldValue(agent.board_file_number)}
                  />
                  <InfoCell
                    label="Junta nivel secundario"
                    value={fieldValue(agent.secondary_board_number)}
                  />
                  <InfoCell
                    label="Ingreso a la escuela"
                    value={formatDate(agent.school_entry_date)}
                  />
                  <InfoCell
                    label="Ingreso a la docencia"
                    value={formatDate(agent.teaching_entry_date)}
                  />
                  <InfoCell label="Títulos" value={fieldValue(agent.titles)} full />
                </div>
              </div>
            ) : null}

            {agent.notes ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Observaciones
                </p>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {agent.notes}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'designaciones' ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Designaciones del agente
            </p>
            <AssignmentsTable items={agent.assignments ?? []} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
