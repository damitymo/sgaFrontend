'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { isSuperAdmin } from '@/lib/auth';

type Establecimiento = {
  id: number;
  nombre: string;
  cue: string;
};

type Curso = {
  id: number;
  nivel: string;
  anio: string;
  division: string | null;
  orientacion: { id: number; nombre: string } | null;
};

type Holder = {
  full_name: string | null;
  dni: string | null;
  character_type: string | null;
};

type PofRow = {
  id: number;
  plaza_number: string;
  subject_name: string | null;
  modality: string | null;
  shift: string | null;
  hours_count: number | null;
  current_holder: Holder | null;
};

function shiftLabel(value?: string | null) {
  if (!value) return '-';
  const normalized = value.toUpperCase();
  if (normalized.startsWith('M')) return 'Mañana';
  if (normalized.startsWith('T')) return 'Tarde';
  if (normalized.startsWith('N')) return 'Noche';
  return value;
}

export default function OrganigramaPage() {
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [expandedEstablecimiento, setExpandedEstablecimiento] = useState<number | null>(null);
  const [cursosByEstablecimiento, setCursosByEstablecimiento] = useState<
    Record<number, Curso[]>
  >({});
  const [loadingCursosFor, setLoadingCursosFor] = useState<number | null>(null);

  const [expandedCurso, setExpandedCurso] = useState<number | null>(null);
  const [pofByCurso, setPofByCurso] = useState<Record<number, PofRow[]>>({});
  const [loadingPofFor, setLoadingPofFor] = useState<number | null>(null);

  const canConfigure = isSuperAdmin();

  const loadEstablecimientos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Establecimiento[]>('/establecimientos');
      setEstablecimientos(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar el organigrama.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEstablecimientos();
  }, [loadEstablecimientos]);

  const toggleEstablecimiento = async (establecimiento: Establecimiento) => {
    if (expandedEstablecimiento === establecimiento.id) {
      setExpandedEstablecimiento(null);
      return;
    }

    setExpandedEstablecimiento(establecimiento.id);
    setExpandedCurso(null);

    if (cursosByEstablecimiento[establecimiento.id]) return;

    try {
      setLoadingCursosFor(establecimiento.id);
      const response = await api.get<Curso[]>('/cursos', {
        params: { establecimientoId: establecimiento.id },
      });
      setCursosByEstablecimiento((prev) => ({
        ...prev,
        [establecimiento.id]: response.data,
      }));
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los cursos de este establecimiento.');
    } finally {
      setLoadingCursosFor(null);
    }
  };

  const toggleCurso = async (curso: Curso) => {
    if (expandedCurso === curso.id) {
      setExpandedCurso(null);
      return;
    }

    setExpandedCurso(curso.id);

    if (pofByCurso[curso.id]) return;

    try {
      setLoadingPofFor(curso.id);
      const response = await api.get<PofRow[]>('/pof', {
        params: { cursoId: curso.id },
      });
      setPofByCurso((prev) => ({ ...prev, [curso.id]: response.data }));
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar las materias de este curso.');
    } finally {
      setLoadingPofFor(null);
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Módulo
                </p>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Organigrama institucional
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Estructura del plantel docente por establecimiento, nivel y
                  curso.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/cursos"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Gestionar cursos
                </Link>
                {canConfigure ? (
                  <Link
                    href="/cursos/establecimientos"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Establecimientos
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Cargando organigrama...
            </div>
          ) : establecimientos.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No hay establecimientos cargados.
            </div>
          ) : (
            <div className="space-y-4">
              {establecimientos.map((establecimiento) => {
                const isOpen = expandedEstablecimiento === establecimiento.id;
                const cursos = cursosByEstablecimiento[establecimiento.id] ?? [];

                return (
                  <div
                    key={establecimiento.id}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() => toggleEstablecimiento(establecimiento)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg dark:bg-slate-800">
                          🏢
                        </span>
                        <div>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                            {establecimiento.nombre}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            CUE: {establecimiento.cue}
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                        {loadingCursosFor === establecimiento.id ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Cargando cursos...
                          </p>
                        ) : cursos.length === 0 ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Este establecimiento no tiene cursos cargados.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {cursos.map((curso) => {
                              const cursoOpen = expandedCurso === curso.id;
                              const filas = pofByCurso[curso.id] ?? [];

                              return (
                                <div
                                  key={curso.id}
                                  className="rounded-2xl border border-slate-200 dark:border-slate-700"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleCurso(curso)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {curso.anio} {curso.division || ''}
                                      </span>
                                      <span className="text-sm text-slate-600 dark:text-slate-300">
                                        {curso.orientacion?.nombre ?? curso.nivel}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                      {cursoOpen ? '▲' : '▼'}
                                    </span>
                                  </button>

                                  {cursoOpen ? (
                                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                                      {loadingPofFor === curso.id ? (
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                          Cargando materias...
                                        </p>
                                      ) : filas.length === 0 ? (
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                          Sin cargos asignados a este curso.
                                        </p>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full border-collapse text-sm">
                                            <thead>
                                              <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                                <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold dark:border-slate-700">
                                                  Materia / Cargo
                                                </th>
                                                <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold dark:border-slate-700">
                                                  Turno
                                                </th>
                                                <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold dark:border-slate-700">
                                                  Docente
                                                </th>
                                                <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold dark:border-slate-700">
                                                  DNI
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {filas.map((fila) => (
                                                <tr
                                                  key={fila.id}
                                                  className={
                                                    fila.current_holder
                                                      ? 'bg-white dark:bg-slate-900'
                                                      : 'bg-rose-50/60 dark:bg-rose-950/20'
                                                  }
                                                >
                                                  <td className="border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                                                    {fila.subject_name || fila.modality || '-'}
                                                  </td>
                                                  <td className="border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                                                    {shiftLabel(fila.shift)}
                                                  </td>
                                                  <td className="border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                                                    {fila.current_holder?.full_name || 'Vacante'}
                                                  </td>
                                                  <td className="border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                                                    {fila.current_holder?.dni || '-'}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </ProtectedPage>
  );
}
