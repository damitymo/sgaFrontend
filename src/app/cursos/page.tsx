'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { useEscapeKey } from '@/lib/use-escape-key';
import { canManageSystem, isSuperAdmin } from '@/lib/auth';

type Establecimiento = { id: number; nombre: string; cue: string };
type Orientacion = { id: number; nombre: string };

type Curso = {
  id: number;
  nivel: string;
  anio: string;
  division: string | null;
  orientacion: Orientacion | null;
  establecimiento: Establecimiento;
};

type CursoForm = {
  nivel: string;
  anio: string;
  division: string;
  orientacion_id: string;
  establecimiento_id: string;
};

const emptyForm: CursoForm = {
  nivel: 'Secundaria',
  anio: '',
  division: '',
  orientacion_id: '',
  establecimiento_id: '',
};

function toForm(curso: Curso): CursoForm {
  return {
    nivel: curso.nivel,
    anio: curso.anio,
    division: curso.division || '',
    orientacion_id: curso.orientacion ? String(curso.orientacion.id) : '',
    establecimiento_id: String(curso.establecimiento.id),
  };
}

function toPayload(form: CursoForm) {
  return {
    nivel: form.nivel.trim(),
    anio: form.anio.trim(),
    division: form.division.trim() || undefined,
    orientacion_id: form.orientacion_id ? Number(form.orientacion_id) : undefined,
    establecimiento_id: Number(form.establecimiento_id),
  };
}

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [orientaciones, setOrientaciones] = useState<Orientacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState<CursoForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<Curso | null>(null);
  const [editForm, setEditForm] = useState<CursoForm>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const canManage = canManageSystem();
  const canConfigure = isSuperAdmin();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cursosRes, establecimientosRes, orientacionesRes] = await Promise.all([
        api.get<Curso[]>('/cursos'),
        api.get<Establecimiento[]>('/establecimientos'),
        api.get<Orientacion[]>('/orientaciones'),
      ]);
      setCursos(cursosRes.data);
      setEstablecimientos(establecimientosRes.data);
      setOrientaciones(orientacionesRes.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los cursos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEditModal = () => setEditing(null);
  useEscapeKey(() => {
    if (!savingEdit) closeEditModal();
  }, Boolean(editing));

  const handleCreate = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!createForm.anio.trim() || !createForm.establecimiento_id) {
      setMessage('Año/división y establecimiento son obligatorios.');
      return;
    }

    try {
      setCreating(true);
      setMessage('');
      await api.post('/cursos', toPayload(createForm));
      setCreateForm({ ...emptyForm, nivel: createForm.nivel });
      await load();
      setMessage('Curso creado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudo crear el curso.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (curso: Curso) => {
    setEditing(curso);
    setEditForm(toForm(curso));
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    try {
      setSavingEdit(true);
      await api.patch(`/cursos/${editing.id}`, toPayload(editForm));
      closeEditModal();
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el curso.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (curso: Curso) => {
    const ok = window.confirm(
      `¿Seguro que querés borrar "${curso.anio} ${curso.division || ''}"?`,
    );
    if (!ok) return;

    try {
      await api.delete(`/cursos/${curso.id}`);
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar el curso.');
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
                  Gestión de cursos
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Administración de niveles y establecimientos educativos.
                </p>
              </div>

              {canConfigure ? (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/cursos/orientaciones"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Orientaciones
                  </Link>
                  <Link
                    href="/cursos/establecimientos"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Establecimientos
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <form
              onSubmit={handleCreate}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Nuevo curso
              </h3>

              <CursoFormFields
                form={createForm}
                onChange={setCreateForm}
                establecimientos={establecimientos}
                orientaciones={orientaciones}
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  {creating ? 'Guardando...' : 'Nuevo curso'}
                </button>

                {message ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {message}
                  </p>
                ) : null}
              </div>
            </form>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Cargando...
              </p>
            ) : cursos.length === 0 ? (
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                No hay cursos cargados todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Nivel
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Año / División
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Orientación
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Establecimiento
                      </th>
                      {canManage ? (
                        <th className="w-44 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                          Acciones
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {cursos.map((curso) => (
                      <tr key={curso.id} className="bg-white dark:bg-slate-900">
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            {curso.nivel}
                          </span>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                          {curso.anio} {curso.division || ''}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {curso.orientacion?.nombre || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {curso.establecimiento.nombre}
                        </td>
                        {canManage ? (
                          <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(curso)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(curso)}
                                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30"
                              >
                                Borrar
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {editing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              data-modal-root
              role="dialog"
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Modificar curso
                </h3>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-100"
                >
                  Cerrar
                </button>
              </div>

              <CursoFormFields
                form={editForm}
                onChange={setEditForm}
                establecimientos={establecimientos}
                orientaciones={orientaciones}
              />

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-modal-submit
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </ProtectedPage>
  );
}

function CursoFormFields({
  form,
  onChange,
  establecimientos,
  orientaciones,
}: {
  form: CursoForm;
  onChange: (form: CursoForm) => void;
  establecimientos: Establecimiento[];
  orientaciones: Orientacion[];
}) {
  const update = <K extends keyof CursoForm>(field: K, value: CursoForm[K]) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Nivel
        </label>
        <input
          type="text"
          value={form.nivel}
          onChange={(e) => update('nivel', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Establecimiento
        </label>
        <select
          value={form.establecimiento_id}
          onChange={(e) => update('establecimiento_id', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Seleccionar</option>
          {establecimientos.map((est) => (
            <option key={est.id} value={est.id}>
              {est.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Año
        </label>
        <input
          type="text"
          value={form.anio}
          onChange={(e) => update('anio', e.target.value)}
          placeholder="Ej: 1º"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          División
        </label>
        <input
          type="text"
          value={form.division}
          onChange={(e) => update('division', e.target.value)}
          placeholder="Ej: A"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Orientación
        </label>
        <select
          value={form.orientacion_id}
          onChange={(e) => update('orientacion_id', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Sin orientación</option>
          {orientaciones.map((ori) => (
            <option key={ori.id} value={ori.id}>
              {ori.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
