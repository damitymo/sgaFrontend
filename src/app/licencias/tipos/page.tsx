'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { useEscapeKey } from '@/lib/use-escape-key';

type LicenseType = {
  id: number;
  article: string;
  description: string;
  applicable_to?: string | null;
  paid: boolean;
  affects_presentismo: boolean;
  max_days_per_year?: number | null;
  max_days_per_month?: number | null;
  max_days_continuous?: number | null;
};

type TypeForm = {
  article: string;
  description: string;
  applicable_to: string;
  paid: boolean;
  affects_presentismo: boolean;
  max_days_per_year: string;
  max_days_per_month: string;
  max_days_continuous: string;
};

const emptyForm: TypeForm = {
  article: '',
  description: '',
  applicable_to: 'Todos los docentes',
  paid: true,
  affects_presentismo: false,
  max_days_per_year: '',
  max_days_per_month: '',
  max_days_continuous: '',
};

function toForm(type: LicenseType): TypeForm {
  return {
    article: type.article,
    description: type.description,
    applicable_to: type.applicable_to || '',
    paid: type.paid,
    affects_presentismo: type.affects_presentismo,
    max_days_per_year: type.max_days_per_year?.toString() || '',
    max_days_per_month: type.max_days_per_month?.toString() || '',
    max_days_continuous: type.max_days_continuous?.toString() || '',
  };
}

function toPayload(form: TypeForm) {
  return {
    article: form.article.trim(),
    description: form.description.trim(),
    applicable_to: form.applicable_to.trim() || null,
    paid: form.paid,
    affects_presentismo: form.affects_presentismo,
    max_days_per_year: form.max_days_per_year
      ? Number(form.max_days_per_year)
      : null,
    max_days_per_month: form.max_days_per_month
      ? Number(form.max_days_per_month)
      : null,
    max_days_continuous: form.max_days_continuous
      ? Number(form.max_days_continuous)
      : null,
  };
}

export default function TiposLicenciaPage() {
  const [types, setTypes] = useState<LicenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [createForm, setCreateForm] = useState<TypeForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  const [editingType, setEditingType] = useState<LicenseType | null>(null);
  const [editForm, setEditForm] = useState<TypeForm>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<LicenseType[]>('/license-types');
      setTypes(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los tipos de licencia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const closeEditModal = () => setEditingType(null);

  useEscapeKey(() => {
    if (!savingEdit) closeEditModal();
  }, Boolean(editingType));

  const handleCreate = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!createForm.article.trim() || !createForm.description.trim()) {
      setMessage('Artículo y descripción son obligatorios.');
      return;
    }

    try {
      setCreating(true);
      setMessage('');

      await api.post('/license-types', toPayload(createForm));

      setCreateForm(emptyForm);
      await loadTypes();
      setMessage('Tipo de licencia creado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudo crear el tipo de licencia.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (type: LicenseType) => {
    setEditingType(type);
    setEditForm(toForm(type));
  };

  const handleSaveEdit = async () => {
    if (!editingType) return;

    try {
      setSavingEdit(true);

      await api.patch(`/license-types/${editingType.id}`, toPayload(editForm));

      closeEditModal();
      await loadTypes();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el tipo de licencia.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (type: LicenseType) => {
    const ok = window.confirm(
      `¿Seguro que querés borrar "${type.article}"? Las licencias ya cargadas con este tipo no se ven afectadas.`,
    );
    if (!ok) return;

    try {
      await api.delete(`/license-types/${type.id}`);
      await loadTypes();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar el tipo de licencia.');
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Configuración
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Tipos de licencia
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Catálogo de artículos del estatuto docente: goce de sueldo, si
              afecta el presentismo y topes de días.
            </p>
          </div>

          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Nuevo tipo de licencia
            </h3>

            <TypeFormFields form={createForm} onChange={setCreateForm} />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {creating ? 'Guardando...' : 'Crear tipo de licencia'}
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
            ) : types.length === 0 ? (
              <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
                No hay tipos de licencia cargados todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Artículo
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Descripción
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Sueldo
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Presentismo
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Topes (año/mes/continuos)
                      </th>
                      <th className="w-44 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type) => (
                      <tr key={type.id} className="bg-white dark:bg-slate-900">
                        <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                          {type.article}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {type.description}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          {type.paid ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                              Con sueldo
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Sin sueldo
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          {type.affects_presentismo ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                              Afecta presentismo
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              No afecta
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {type.max_days_per_year ?? '-'} /{' '}
                          {type.max_days_per_month ?? '-'} /{' '}
                          {type.max_days_continuous ?? '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(type)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(type)}
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

        {editingType ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              data-modal-root
              role="dialog"
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Modificar tipo de licencia
                </h3>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-100"
                >
                  Cerrar
                </button>
              </div>

              <TypeFormFields form={editForm} onChange={setEditForm} />

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

function TypeFormFields({
  form,
  onChange,
}: {
  form: TypeForm;
  onChange: (form: TypeForm) => void;
}) {
  const update = <K extends keyof TypeForm>(field: K, value: TypeForm[K]) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Artículo
        </label>
        <input
          type="text"
          value={form.article}
          onChange={(e) => update('article', e.target.value)}
          placeholder="Ej: Art. 13°"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Aplicable a
        </label>
        <input
          type="text"
          value={form.applicable_to}
          onChange={(e) => update('applicable_to', e.target.value)}
          placeholder="Ej: Todos los docentes"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Descripción
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Ej: Por maternidad"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="paid"
          type="checkbox"
          checked={form.paid}
          onChange={(e) => update('paid', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="paid" className="text-sm text-slate-700 dark:text-slate-200">
          ¿Con goce de sueldo?
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="affects_presentismo"
          type="checkbox"
          checked={form.affects_presentismo}
          onChange={(e) => update('affects_presentismo', e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label
          htmlFor="affects_presentismo"
          className="text-sm text-slate-700 dark:text-slate-200"
        >
          ¿Afecta presentismo?
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Máx. días por año
        </label>
        <input
          type="number"
          min={0}
          value={form.max_days_per_year}
          onChange={(e) => update('max_days_per_year', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Máx. días por mes
        </label>
        <input
          type="number"
          min={0}
          value={form.max_days_per_month}
          onChange={(e) => update('max_days_per_month', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Máx. días continuos
        </label>
        <input
          type="number"
          min={0}
          value={form.max_days_continuous}
          onChange={(e) => update('max_days_continuous', e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
}
