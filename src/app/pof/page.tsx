'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

type PofItem = {
  id: number;
  plaza_number?: string | null;
  subject_name?: string | null;
  hours_count?: number | null;
  course?: string | null;
  division?: string | null;
  shift?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  revista_status?: string | null;
  legal_norm?: string | null;
  notes?: string | null;
  current_holder?: {
    assignment_id?: number | null;
    agent_id?: number | null;
    full_name?: string | null;
    dni?: string | null;
    movement_type?: string | null;
    assignment_date?: string | null;
    status?: string | null;
  } | null;
};

type PofHistoryItem = {
  id: number;
  pof_position_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

type Filters = {
  plaza: string;
  docente: string;
  materia: string;
  curso: string;
};

type EditForm = {
  subject_name: string;
  hours_count: string;
  course: string;
  division: string;
  shift: string;
  start_date: string;
  end_date: string;
  revista_status: string;
  legal_norm: string;
  notes: string;
};

const initialFilters: Filters = {
  plaza: '',
  docente: '',
  materia: '',
  curso: '',
};

function formatDate(date?: string | null) {
  if (!date) return '-';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;
  return safe.toLocaleDateString('es-AR');
}

function formatDateTime(date?: string | null) {
  if (!date) return '-';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;
  return safe.toLocaleString('es-AR');
}

function toInputDate(date?: string | null) {
  if (!date) return '';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return '';
  return safe.toISOString().slice(0, 10);
}

function shiftLabel(value?: string | null) {
  if (!value) return 'Sin turno';

  const normalized = value.toUpperCase();

  if (normalized === 'MANANA' || normalized === 'MAÑANA' || normalized === 'M') {
    return 'Mañana';
  }
  if (normalized === 'TARDE' || normalized === 'T') {
    return 'Tarde';
  }
  if (normalized === 'NOCHE' || normalized === 'N') {
    return 'Nocturno';
  }

  return value;
}

function holderText(item: PofItem) {
  return item.current_holder?.full_name || 'Sin asignación actual';
}

function holderDni(item: PofItem) {
  return item.current_holder?.dni || '-';
}

function formatHistoryValue(value: string | null) {
  if (value === null || value === undefined || value === '') return '-';

  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed === null || parsed === undefined || parsed === '') return '-';
    if (typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean') {
      return String(parsed);
    }

    return JSON.stringify(parsed);
  } catch {
    return value;
  }
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    subject_name: 'Asignatura / Cargo',
    hours_count: 'Cantidad de horas',
    course: 'Curso',
    division: 'División',
    shift: 'Turno',
    start_date: 'Desde',
    end_date: 'Hasta',
    revista_status: 'Carácter',
    legal_norm: 'Norma legal',
    notes: 'Observaciones',
    plaza_number: 'Plaza',
  };

  return labels[field] || field;
}

function printSinglePof(item: PofItem) {
  const content = `
    <html>
      <head>
        <title>Plaza ${item.plaza_number ?? '-'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
          h1, h2, p { margin: 0 0 10px 0; }
          .header { border-bottom: 1px solid #999; margin-bottom: 20px; padding-bottom: 10px; }
          .block { border: 1px solid #bbb; margin-bottom: 16px; padding: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
          .label { font-size: 12px; font-weight: bold; color: #555; text-transform: uppercase; }
          .value { font-size: 14px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          <p style="font-size:12px;font-weight:bold;text-transform:uppercase;">Escuela Técnica Valentín Virasoro</p>
          <h1>Detalle de Plaza</h1>
        </div>

        <div class="block">
          <div class="grid">
            <div><div class="label">Plaza</div><div class="value">${item.plaza_number ?? '-'}</div></div>
            <div><div class="label">Turno</div><div class="value">${shiftLabel(item.shift)}</div></div>
            <div><div class="label">Asignatura / Cargo</div><div class="value">${item.subject_name ?? '-'}</div></div>
            <div><div class="label">Carácter</div><div class="value">${item.revista_status ?? '-'}</div></div>
            <div><div class="label">Horas</div><div class="value">${item.hours_count ?? '-'}</div></div>
            <div><div class="label">Curso</div><div class="value">${item.course ?? '-'}</div></div>
            <div><div class="label">División</div><div class="value">${item.division ?? '-'}</div></div>
            <div><div class="label">Desde</div><div class="value">${formatDate(item.start_date)}</div></div>
            <div><div class="label">Hasta</div><div class="value">${item.end_date ? formatDate(item.end_date) : 'CONTINUA'}</div></div>
            <div><div class="label">Norma legal</div><div class="value">${item.legal_norm ?? '-'}</div></div>
          </div>
        </div>

        <div class="block">
          <h2 style="font-size:18px;">Docente actual</h2>
          <div class="grid">
            <div><div class="label">Nombre</div><div class="value">${holderText(item)}</div></div>
            <div><div class="label">DNI</div><div class="value">${holderDni(item)}</div></div>
          </div>
        </div>

        ${
          item.notes
            ? `<div class="block"><div class="label">Observaciones</div><div class="value">${item.notes}</div></div>`
            : ''
        }

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}

export default function PofPage() {
  const [items, setItems] = useState<PofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [editingItem, setEditingItem] = useState<PofItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    subject_name: '',
    hours_count: '',
    course: '',
    division: '',
    shift: '',
    start_date: '',
    end_date: '',
    revista_status: '',
    legal_norm: '',
    notes: '',
  });

  const [historyItem, setHistoryItem] = useState<PofItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<PofHistoryItem[]>([]);

  const loadPof = async (activeFilters?: Filters) => {
    try {
      setLoading(true);
      setMessage('');

      const source = activeFilters ?? filters;
      const params: Record<string, string> = {};

      if (source.plaza.trim()) params.plaza = source.plaza.trim();
      if (source.docente.trim()) params.docente = source.docente.trim();
      if (source.materia.trim()) params.materia = source.materia.trim();
      if (source.curso.trim()) params.curso = source.curso.trim();

      const response = await api.get('/pof', { params });
      setItems(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar la lista de POF.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPof();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = async () => {
    await loadPof(filters);
  };

  const handleClear = async () => {
    setFilters(initialFilters);
    setExpandedRows([]);
    setOpenMenuId(null);
    await loadPof(initialFilters);
  };

  const handlePrintList = () => {
    window.print();
  };

  const toggleExpanded = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const isExpanded = useMemo(
    () => (id: number) => expandedRows.includes(id),
    [expandedRows],
  );

  const openEditModal = (item: PofItem) => {
    setEditingItem(item);
    setEditForm({
      subject_name: item.subject_name || '',
      hours_count: item.hours_count?.toString() || '',
      course: item.course || '',
      division: item.division || '',
      shift: item.shift || '',
      start_date: toInputDate(item.start_date),
      end_date: toInputDate(item.end_date),
      revista_status: item.revista_status || '',
      legal_norm: item.legal_norm || '',
      notes: item.notes || '',
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const updateEditForm = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setSavingEdit(true);

      await api.patch(`/pof/${editingItem.id}`, {
        subject_name: editForm.subject_name || null,
        hours_count: editForm.hours_count ? Number(editForm.hours_count) : null,
        course: editForm.course || null,
        division: editForm.division || null,
        shift: editForm.shift || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        revista_status: editForm.revista_status || null,
        legal_norm: editForm.legal_norm || null,
        notes: editForm.notes || null,
      });

      closeEditModal();
      await loadPof(filters);
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar la modificación de la plaza.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openHistoryModal = async (item: PofItem) => {
    try {
      setHistoryItem(item);
      setHistoryRows([]);
      setHistoryLoading(true);

      const response = await api.get(`/pof/${item.id}/history`);
      setHistoryRows(response.data);
    } catch (error) {
      console.error(error);
      alert('No se pudo cargar el historial de la plaza.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setHistoryItem(null);
    setHistoryRows([]);
  };

  
    return (
  <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100 print:bg-white">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8 print:max-w-none print:px-4 print:py-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Módulo
            </p>
            <h2 className="text-3xl font-bold text-slate-800">POF</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Listado completo y filtrado de plazas con docente actual,
              asignatura, curso, horas y normativa.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Número de plaza
                </label>
                <input
                  type="text"
                  value={filters.plaza}
                  onChange={(e) => handleChange('plaza', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500"
                  placeholder="Ej: 50-774"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Docente actual
                </label>
                <input
                  type="text"
                  value={filters.docente}
                  onChange={(e) => handleChange('docente', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500"
                  placeholder="Apellido o nombre"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Materia
                </label>
                <input
                  type="text"
                  value={filters.materia}
                  onChange={(e) => handleChange('materia', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500"
                  placeholder="Asignatura"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Curso
                </label>
                <input
                  type="text"
                  value={filters.curso}
                  onChange={(e) => handleChange('curso', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500"
                  placeholder="Ej: 2"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handlePrintList}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Imprimir listado
              </button>
            </div>
          </div>

          <div className="hidden print:block">
            <div className="mb-4 border-b border-slate-400 pb-2">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Escuela Técnica Valentín Virasoro
              </p>
              <h1 className="mt-1 text-center text-lg font-bold text-slate-800">
                Listado POF
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-slate-400 print:shadow-none">
            {loading ? (
              <div className="p-4 text-sm text-slate-600">Cargando POF...</div>
            ) : message ? (
              <div className="p-4 text-sm text-slate-600">{message}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">
                No se encontraron resultados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 print:bg-white">
                      <th className="w-12 border border-slate-200 px-2 py-2 text-center font-semibold print:px-1 print:py-1" />
                      <th className="w-28 border border-slate-200 px-2 py-2 text-left font-semibold print:px-1 print:py-1">
                        Plaza
                      </th>
                      <th className="border border-slate-200 px-2 py-2 text-left font-semibold print:px-1 print:py-1">
                        Cargo / Docente actual
                      </th>
                      <th className="w-32 border border-slate-200 px-2 py-2 text-left font-semibold print:px-1 print:py-1">
                        Turno
                      </th>
                      <th className="w-28 border border-slate-200 px-2 py-2 text-left font-semibold print:px-1 print:py-1 print:hidden">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <FragmentRow
                        key={item.id}
                        item={item}
                        isExpanded={isExpanded(item.id)}
                        toggleExpanded={() => toggleExpanded(item.id)}
                        menuOpen={openMenuId === item.id}
                        toggleMenu={() =>
                          setOpenMenuId((prev) => (prev === item.id ? null : item.id))
                        }
                        closeMenu={() => setOpenMenuId(null)}
                        onEdit={() => openEditModal(item)}
                        onPrint={() => printSinglePof(item)}
                        onHistory={() => openHistoryModal(item)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {editingItem ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Modificar plaza
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {editingItem.plaza_number || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Asignatura / Cargo">
                    <input
                      type="text"
                      value={editForm.subject_name}
                      onChange={(e) => updateEditForm('subject_name', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Cant. hs.">
                    <input
                      type="number"
                      value={editForm.hours_count}
                      onChange={(e) => updateEditForm('hours_count', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Curso">
                    <input
                      type="text"
                      value={editForm.course}
                      onChange={(e) => updateEditForm('course', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="División">
                    <input
                      type="text"
                      value={editForm.division}
                      onChange={(e) => updateEditForm('division', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Turno">
                    <input
                      type="text"
                      value={editForm.shift}
                      onChange={(e) => updateEditForm('shift', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Carácter">
                    <input
                      type="text"
                      value={editForm.revista_status}
                      onChange={(e) => updateEditForm('revista_status', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Desde">
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => updateEditForm('start_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Hasta">
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => updateEditForm('end_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Norma legal" full>
                    <input
                      type="text"
                      value={editForm.legal_norm}
                      onChange={(e) => updateEditForm('legal_norm', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Observaciones" full>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => updateEditForm('notes', e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                  >
                    {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                  </button>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {historyItem ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Historial de cambios
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {historyItem.plaza_number || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeHistoryModal}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                {historyLoading ? (
                  <p className="text-sm text-slate-600">Cargando historial...</p>
                ) : historyRows.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No hay cambios registrados para esta plaza.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold">
                            Fecha
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold">
                            Campo
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold">
                            Valor anterior
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold">
                            Valor nuevo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRows.map((row) => (
                          <tr key={row.id} className="bg-white">
                            <td className="border border-slate-200 px-3 py-2">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">
                              {fieldLabel(row.field_name)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">
                              {formatHistoryValue(row.old_value)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">
                              {formatHistoryValue(row.new_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function FragmentRow({
  item,
  isExpanded,
  toggleExpanded,
  menuOpen,
  toggleMenu,
  closeMenu,
  onEdit,
  onPrint,
  onHistory,
}: {
  item: PofItem;
  isExpanded: boolean;
  toggleExpanded: () => void;
  menuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onHistory: () => void;
}) {
  return (
    <>
      <tr className="bg-white">
        <td className="border border-slate-200 px-2 py-2 text-center align-top print:px-1 print:py-1">
          <button
            type="button"
            onClick={toggleExpanded}
            className="mx-auto flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-slate-50 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top print:px-1 print:py-1">
          <p className="text-sm font-bold text-sky-700 print:text-[10px]">
            {item.plaza_number || '-'}
          </p>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top print:px-1 print:py-1">
          <p className="text-sm font-semibold uppercase text-slate-700 print:text-[10px]">
            {item.subject_name || '-'}
          </p>

          <div className="mt-1 text-xs text-slate-600 print:text-[9px]">
            <span className="font-semibold text-slate-700">
              {holderText(item)}
            </span>
            {' | '}
            <span>DNI {holderDni(item)}</span>
            {' | '}
            <span>{item.revista_status || '-'}</span>
          </div>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top text-sm text-slate-700 print:px-1 print:py-1 print:text-[10px]">
          {shiftLabel(item.shift)}
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top print:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={toggleMenu}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Acciones
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-9 z-20 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  Modificar plaza
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onHistory();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  Ver historial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPrint();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  Imprimir plaza
                </button>
              </div>
            ) : null}
          </div>
        </td>
      </tr>

      {isExpanded ? (
        <tr className="bg-slate-50 print:table-row">
          <td className="border border-slate-200" />
          <td
            colSpan={4}
            className="border border-slate-200 px-3 py-3 text-xs text-slate-700 print:px-1 print:py-1 print:text-[9px]"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              <p>
                <span className="font-semibold">Plaza:</span> {item.plaza_number || '-'}
              </p>
              <p>
                <span className="font-semibold">Asignatura:</span> {item.subject_name || '-'}
              </p>
              <p>
                <span className="font-semibold">Docente actual:</span> {holderText(item)}
              </p>
              <p>
                <span className="font-semibold">DNI:</span> {holderDni(item)}
              </p>
              <p>
                <span className="font-semibold">Horas:</span> {item.hours_count ?? '-'}
              </p>
              <p>
                <span className="font-semibold">Curso:</span> {item.course || '-'}
              </p>
              <p>
                <span className="font-semibold">División:</span> {item.division || '-'}
              </p>
              <p>
                <span className="font-semibold">Turno:</span> {shiftLabel(item.shift)}
              </p>
              <p>
                <span className="font-semibold">Carácter:</span> {item.revista_status || '-'}
              </p>
              <p>
                <span className="font-semibold">Desde:</span> {formatDate(item.start_date)}
              </p>
              <p>
                <span className="font-semibold">Hasta:</span>{' '}
                {item.end_date ? formatDate(item.end_date) : 'CONTINUA'}
              </p>
              <p>
                <span className="font-semibold">Norma legal:</span> {item.legal_norm || '-'}
              </p>
              <p className="md:col-span-2 xl:col-span-3">
                <span className="font-semibold">Observaciones:</span> {item.notes || '-'}
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}