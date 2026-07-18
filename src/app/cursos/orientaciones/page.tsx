'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { useEscapeKey } from '@/lib/use-escape-key';

type Orientacion = {
  id: number;
  nombre: string;
  nivel: string | null;
  cursos_count: number;
};

type OrientacionForm = {
  nombre: string;
  nivel: string;
};

const emptyForm: OrientacionForm = { nombre: '', nivel: '' };

export default function OrientacionesPage() {
  const [items, setItems] = useState<Orientacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState<OrientacionForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<Orientacion | null>(null);
  const [editForm, setEditForm] = useState<OrientacionForm>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Orientacion[]>('/orientaciones');
      setItems(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar las orientaciones.');
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

    if (!createForm.nombre.trim()) {
      setMessage('El nombre es obligatorio.');
      return;
    }

    try {
      setCreating(true);
      setMessage('');
      await api.post('/orientaciones', {
        nombre: createForm.nombre.trim(),
        nivel: createForm.nivel.trim() || undefined,
      });
      setCreateForm(emptyForm);
      await load();
      setMessage('Orientación creada correctamente.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudo crear la orientación.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (item: Orientacion) => {
    setEditing(item);
    setEditForm({ nombre: item.nombre, nivel: item.nivel || '' });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    try {
      setSavingEdit(true);
      await api.patch(`/orientaciones/${editing.id}`, {
        nombre: editForm.nombre.trim(),
        nivel: editForm.nivel.trim() || null,
      });
      closeEditModal();
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar la orientación.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (item: Orientacion) => {
    const ok = window.confirm(
      `¿Seguro que querés borrar "${item.nombre}"? Los cursos ya asociados quedan sin orientación.`,
    );
    if (!ok) return;

    try {
      await api.delete(`/orientaciones/${item.id}`);
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar la orientación.');
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Configuración
                </p>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Orientaciones
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Tipos de bachillerato y orientaciones para nivel secundario.
                </p>
              </div>

              <Link
                href="/cursos"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Volver a cursos
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Nueva orientación
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre
                </label>
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nombre: e.target.value })
                  }
                  placeholder="Ej: Ciencias Naturales"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nivel
                </label>
                <input
                  type="text"
                  value={createForm.nivel}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nivel: e.target.value })
                  }
                  placeholder="Ej: Secundaria"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {creating ? 'Guardando...' : 'Crear orientación'}
              </button>

              {message ? (
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {message}
                </p>
              ) : null}
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Cargando...
              </p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                No hay orientaciones cargadas todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Nombre
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Nivel
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Cursos asociados
                      </th>
                      <th className="w-44 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="bg-white dark:bg-slate-900">
                        <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                          {item.nombre}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {item.nivel || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {item.cursos_count} curso{item.cursos_count === 1 ? '' : 's'} asociado{item.cursos_count === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
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
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Modificar orientación
                </h3>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-100"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nombre: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Nivel
                  </label>
                  <input
                    type="text"
                    value={editForm.nivel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, nivel: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

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
