'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

/**
 * Vista inspirada en el reporte "Estructura POF" del sistema del MEC:
 * una fila por Nivel Funcional con plazas, prestaciones, agentes, etc.
 *
 * Clickeando el código se navega a /pof?plaza=<codigo>- para ver las plazas
 * de ese nivel en la vista detallada.
 */
type StructureRow = {
  codigo: string;
  nivel_funcional: string;
  plazas: number;
  plazas_con_prestacion: number;
  prestaciones: number;
  agentes: number;
  inconsistentes: number;
  hs_catedra: number;
  extra_pof_ss: number;
  extra_pof_cs: number;
};

export default function EstructuraPofPage() {
  const [rows, setRows] = useState<StructureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setMessage('');

        const response = await api.get<StructureRow[]>('/pof/estructura');
        setRows(response.data);
      } catch (error) {
        console.error(error);
        setMessage('No se pudo cargar la estructura de POF.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        plazas: acc.plazas + row.plazas,
        plazas_con_prestacion: acc.plazas_con_prestacion + row.plazas_con_prestacion,
        prestaciones: acc.prestaciones + row.prestaciones,
        agentes: acc.agentes + row.agentes,
        inconsistentes: acc.inconsistentes + row.inconsistentes,
        hs_catedra: acc.hs_catedra + row.hs_catedra,
        extra_pof_ss: acc.extra_pof_ss + row.extra_pof_ss,
        extra_pof_cs: acc.extra_pof_cs + row.extra_pof_cs,
      }),
      {
        plazas: 0,
        plazas_con_prestacion: 0,
        prestaciones: 0,
        agentes: 0,
        inconsistentes: 0,
        hs_catedra: 0,
        extra_pof_ss: 0,
        extra_pof_cs: 0,
      },
    );
  }, [rows]);

  return (
    <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950 print:bg-white">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8 print:max-w-none print:px-4 print:py-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Módulo POF
                </p>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Estructura POF
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Resumen por Nivel Funcional. Clickeá el código para ver el
                  detalle de plazas de ese nivel.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/pof"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Ver plazas (detalle)
                </Link>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>

          <div className="hidden print:block">
            <div className="mb-4 border-b border-slate-400 pb-2">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Escuela Técnica Valentín Virasoro
              </p>
              <h1 className="mt-1 text-center text-lg font-bold text-slate-800">
                Estructura POF
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-slate-400 print:shadow-none">
            {loading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
                Cargando estructura...
              </div>
            ) : message ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
                {message}
              </div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
                No hay datos cargados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 print:bg-white">
                      <Th>Código</Th>
                      <Th align="left">Nivel Funcional</Th>
                      <Th>Plazas</Th>
                      <Th>Plazas C/Prest.</Th>
                      <Th>Prestaciones</Th>
                      <Th>Agentes</Th>
                      <Th>Inconsistentes</Th>
                      <Th>Hs. Cátedra</Th>
                      <Th>Extra POF S/S</Th>
                      <Th>Extra POF C/S</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.codigo}
                        className="bg-white dark:bg-slate-900"
                      >
                        <Td>
                          <Link
                            href={`/pof?plaza=${encodeURIComponent(row.codigo)}-`}
                            className="font-bold text-sky-700 hover:underline dark:text-sky-300"
                          >
                            {row.codigo}
                          </Link>
                        </Td>
                        <Td align="left" className="font-medium">
                          {row.nivel_funcional}
                        </Td>
                        <Td>{row.plazas}</Td>
                        <Td>{row.plazas_con_prestacion}</Td>
                        <Td>{row.prestaciones}</Td>
                        <Td>{row.agentes}</Td>
                        <Td
                          className={
                            row.inconsistentes > 0
                              ? 'font-semibold text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {row.inconsistentes}
                        </Td>
                        <Td>
                          {row.codigo === '50' ? row.hs_catedra : 'Cargo'}
                        </Td>
                        <Td>{row.extra_pof_ss}</Td>
                        <Td>{row.extra_pof_cs}</Td>
                      </tr>
                    ))}

                    <tr className="bg-slate-100 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                      <Td colSpan={2} align="left">
                        Totales
                      </Td>
                      <Td>{totals.plazas}</Td>
                      <Td>{totals.plazas_con_prestacion}</Td>
                      <Td>{totals.prestaciones}</Td>
                      <Td>{totals.agentes}</Td>
                      <Td>{totals.inconsistentes}</Td>
                      <Td>{totals.hs_catedra}</Td>
                      <Td>{totals.extra_pof_ss}</Td>
                      <Td>{totals.extra_pof_cs}</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </ProtectedPage>
  );
}

function Th({
  children,
  align = 'center',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}) {
  const alignClass =
    align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <th
      className={`border border-slate-200 px-3 py-2 font-semibold dark:border-slate-700 print:px-1 print:py-1 ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'center',
  colSpan,
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  className?: string;
}) {
  const alignClass =
    align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <td
      colSpan={colSpan}
      className={`border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200 print:px-1 print:py-1 ${alignClass} ${className}`}
    >
      {children}
    </td>
  );
}
