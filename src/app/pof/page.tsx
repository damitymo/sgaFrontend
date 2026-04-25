'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { useEscapeKey } from '@/lib/use-escape-key';

type Holder = {
  assignment_id?: number | null;
  agent_id?: number | null;
  full_name?: string | null;
  dni?: string | null;
  movement_type?: string | null;
  character_type?: string | null;
  assignment_date?: string | null;
  end_date?: string | null;
  status?: string | null;
};

type PofItem = {
  id: number;
  plaza_number?: string | null;
  subject_name?: string | null;
  modality?: string | null;
  hours_count?: number | null;
  course?: string | null;
  division?: string | null;
  shift?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  revista_status?: string | null;
  vacancy_status?: string | null;
  legal_norm?: string | null;
  notes?: string | null;
  current_holder?: Holder | null;
  covered_titular?: Holder | null;
  previous_holder?: Holder | null;
};

/**
 * Etiqueta de "cargo / asignatura" para mostrar en las filas.
 * Algunas plazas (Jefe de Departamento, Jefe de Sección, Rector, etc.)
 * no tienen asignatura — solo cargo (`modality`). En ese caso usamos
 * el cargo como label. Si hay ambos, los concatenamos: "CARGO | ASIGNATURA".
 */
function plazaLabel(item: PofItem): string {
  const cargo = (item.modality || '').trim();
  const asig = (item.subject_name || '').trim();
  if (cargo && asig) return `${cargo} | ${asig}`;
  return cargo || asig || '-';
}

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
            <div><div class="label">Asignatura / Cargo</div><div class="value">${plazaLabel(item)}</div></div>
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

type EstadoFilter = 'TODOS' | 'CON_PRESTACION' | 'SIN_PRESTACION' | 'VACANTE' | 'DESAFECTADA';

function matchesEstado(item: PofItem, estado: EstadoFilter): boolean {
  if (estado === 'TODOS') return true;

  const vacancy = (item.vacancy_status ?? '').toLowerCase();
  const hasHolder = !!item.current_holder?.full_name;

  if (estado === 'CON_PRESTACION') return hasHolder;
  if (estado === 'SIN_PRESTACION') return !hasHolder && vacancy !== 'desafectada' && vacancy !== 'vacante';
  if (estado === 'VACANTE') return vacancy === 'vacante';
  if (estado === 'DESAFECTADA') return vacancy === 'desafectada';

  return true;
}

export default function PofPage() {
  const [items, setItems] = useState<PofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS');
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
    // Leer filtros desde la URL (?plaza=, ?docente=, ?materia=, ?curso=)
    // para permitir deep-linking desde otras pantallas — por ejemplo, el
    // link en /pof/estructura manda a /pof?plaza=50- para filtrar las
    // plazas del Nivel Funcional 50.
    const query =
      typeof window === 'undefined' ? '' : window.location.search;
    const params = new URLSearchParams(query);

    const urlFilters: Filters = {
      plaza: params.get('plaza') ?? '',
      docente: params.get('docente') ?? '',
      materia: params.get('materia') ?? '',
      curso: params.get('curso') ?? '',
    };

    const hasAny = Object.values(urlFilters).some((value) => value !== '');

    if (hasAny) {
      setFilters(urlFilters);
      loadPof(urlFilters);
    } else {
      loadPof();
    }
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

  /**
   * Totales globales (sobre lo que el backend devolvió, antes de aplicar el
   * chip de estado). Se usan arriba del listado como banner tipo "Indicadores
   * generales" del reporte del MEC.
   */
  const totales = useMemo(() => {
    const normalize = (value?: string | null) =>
      (value ?? '').trim().toLowerCase();

    let conPrestacion = 0;
    let sinPrestacion = 0;
    let vacantes = 0;
    let desafectadas = 0;
    let titulares = 0;
    let interinos = 0;
    let suplentes = 0;

    for (const item of items) {
      const vacancy = normalize(item.vacancy_status);
      const sitRev = normalize(item.current_holder?.status);
      const movement = normalize(item.current_holder?.movement_type);
      const hasHolder = !!item.current_holder?.full_name;

      if (hasHolder) conPrestacion += 1;
      else if (vacancy === 'vacante') vacantes += 1;
      else if (vacancy === 'desafectada') desafectadas += 1;
      else sinPrestacion += 1;

      const carrera = sitRev || movement;
      if (carrera.includes('titular')) titulares += 1;
      else if (carrera.includes('interino')) interinos += 1;
      else if (carrera.includes('suplente')) suplentes += 1;
    }

    return {
      total: items.length,
      conPrestacion,
      sinPrestacion,
      vacantes,
      desafectadas,
      titulares,
      interinos,
      suplentes,
    };
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesEstado(item, estadoFilter)),
    [items, estadoFilter],
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

  // Esc cierra el modal abierto (edit primero, luego historial)
  useEscapeKey(() => {
    if (editingItem) {
      closeEditModal();
    } else if (historyItem) {
      setHistoryItem(null);
    }
  }, Boolean(editingItem || historyItem));

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
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950 print:bg-white">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8 print:max-w-none print:px-4 print:py-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Módulo
                </p>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">POF</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                  Listado completo y filtrado de plazas con docente actual,
                  asignatura, curso, horas y normativa.
                </p>
              </div>

              <Link
                href="/pof/estructura"
                className="self-start rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Ver estructura
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Número de plaza
                </label>
                <input
                  type="text"
                  value={filters.plaza}
                  onChange={(e) => handleChange('plaza', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  placeholder="Ej: 50-774"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Docente actual
                </label>
                <input
                  type="text"
                  value={filters.docente}
                  onChange={(e) => handleChange('docente', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  placeholder="Apellido o nombre"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Materia
                </label>
                <input
                  type="text"
                  value={filters.materia}
                  onChange={(e) => handleChange('materia', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  placeholder="Asignatura"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Curso
                </label>
                <input
                  type="text"
                  value={filters.curso}
                  onChange={(e) => handleChange('curso', e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  placeholder="Ej: 2"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handlePrintList}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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

          {/* Banner de totales + chips de estado (estilo MEC "Indicadores") */}
          {!loading && !message && items.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:hidden">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                <StatCard label="Total" value={totales.total} tone="neutral" />
                <StatCard
                  label="Con prestación"
                  value={totales.conPrestacion}
                  tone="emerald"
                />
                <StatCard
                  label="Sin prestación"
                  value={totales.sinPrestacion}
                  tone="amber"
                />
                <StatCard
                  label="Vacantes"
                  value={totales.vacantes}
                  tone="sky"
                />
                <StatCard
                  label="Desafectadas"
                  value={totales.desafectadas}
                  tone="rose"
                />
                <StatCard
                  label="Titulares"
                  value={totales.titulares}
                  tone="indigo"
                />
                <StatCard
                  label="Interinos"
                  value={totales.interinos}
                  tone="indigo"
                />
                <StatCard
                  label="Suplentes"
                  value={totales.suplentes}
                  tone="indigo"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Filtrar por estado:
                </span>
                <Chip
                  active={estadoFilter === 'TODOS'}
                  onClick={() => setEstadoFilter('TODOS')}
                >
                  Todos ({totales.total})
                </Chip>
                <Chip
                  active={estadoFilter === 'CON_PRESTACION'}
                  onClick={() => setEstadoFilter('CON_PRESTACION')}
                >
                  Con prestación ({totales.conPrestacion})
                </Chip>
                <Chip
                  active={estadoFilter === 'SIN_PRESTACION'}
                  onClick={() => setEstadoFilter('SIN_PRESTACION')}
                >
                  Sin prestación ({totales.sinPrestacion})
                </Chip>
                <Chip
                  active={estadoFilter === 'VACANTE'}
                  onClick={() => setEstadoFilter('VACANTE')}
                >
                  Vacantes ({totales.vacantes})
                </Chip>
                <Chip
                  active={estadoFilter === 'DESAFECTADA'}
                  onClick={() => setEstadoFilter('DESAFECTADA')}
                >
                  Desafectadas ({totales.desafectadas})
                </Chip>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-slate-400 print:shadow-none">
            {loading ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">Cargando POF...</div>
            ) : message ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">{message}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
                No se encontraron resultados.
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
                No hay plazas que coincidan con el estado seleccionado. Probá con
                otro chip o volvé a{' '}
                <button
                  type="button"
                  onClick={() => setEstadoFilter('TODOS')}
                  className="font-semibold text-sky-700 hover:underline dark:text-sky-300"
                >
                  Todos
                </button>
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm print:text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 print:bg-white">
                      <th className="w-12 border border-slate-200 px-2 py-2 text-center font-semibold dark:border-slate-700 print:px-1 print:py-1" />
                      <th className="w-28 border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-700 print:px-1 print:py-1">
                        Plaza
                      </th>
                      <th className="border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-700 print:px-1 print:py-1">
                        Cargo / Docente actual
                      </th>
                      <th className="w-32 border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-700 print:px-1 print:py-1">
                        Turno
                      </th>
                      <th className="w-28 border border-slate-200 px-2 py-2 text-left font-semibold dark:border-slate-700 print:px-1 print:py-1 print:hidden">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleItems.map((item) => (
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60 print:hidden">
              <div
                data-modal-root
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Modificar plaza
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {editingItem.plaza_number || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Cant. hs.">
                    <input
                      type="number"
                      value={editForm.hours_count}
                      onChange={(e) => updateEditForm('hours_count', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Curso">
                    <input
                      type="text"
                      value={editForm.course}
                      onChange={(e) => updateEditForm('course', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="División">
                    <input
                      type="text"
                      value={editForm.division}
                      onChange={(e) => updateEditForm('division', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Turno">
                    <input
                      type="text"
                      value={editForm.shift}
                      onChange={(e) => updateEditForm('shift', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Carácter">
                    <input
                      type="text"
                      value={editForm.revista_status}
                      onChange={(e) => updateEditForm('revista_status', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Desde">
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) => updateEditForm('start_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Hasta">
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) => updateEditForm('end_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Norma legal" full>
                    <input
                      type="text"
                      value={editForm.legal_norm}
                      onChange={(e) => updateEditForm('legal_norm', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>

                  <Field label="Observaciones" full>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => updateEditForm('notes', e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    data-modal-submit
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
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

          {historyItem ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60 print:hidden">
              <div
                data-modal-root
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Historial de cambios
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {historyItem.plaza_number || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeHistoryModal}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cerrar
                  </button>
                </div>

                {historyLoading ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Cargando historial...</p>
                ) : historyRows.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No hay cambios registrados para esta plaza.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                            Fecha
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                            Campo
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                            Valor anterior
                          </th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                            Valor nuevo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRows.map((row) => (
                          <tr key={row.id} className="bg-white dark:bg-slate-900">
                            <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                              {fieldLabel(row.field_name)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                              {formatHistoryValue(row.old_value)}
                            </td>
                            <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
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
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
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
      <tr className="bg-white dark:bg-slate-900">
        <td className="border border-slate-200 px-2 py-2 text-center align-top dark:border-slate-700 print:px-1 print:py-1">
          <button
            type="button"
            onClick={toggleExpanded}
            className="mx-auto flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-slate-50 text-xs font-bold text-slate-500 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top dark:border-slate-700 print:px-1 print:py-1">
          <p className="text-sm font-bold text-sky-700 dark:text-sky-300 print:text-[10px]">
            {item.plaza_number || '-'}
          </p>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top dark:border-slate-700 print:px-1 print:py-1">
          <p className="text-sm font-semibold uppercase text-slate-700 dark:text-slate-100 print:text-[10px]">
            {plazaLabel(item)}
          </p>

          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 print:text-[9px]">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {holderText(item)}
            </span>
            {' | '}
            <span>DNI {holderDni(item)}</span>
            {' | '}
            <span>
              {item.current_holder?.character_type ||
                item.revista_status ||
                '-'}
            </span>
          </div>
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 print:px-1 print:py-1 print:text-[10px]">
          {shiftLabel(item.shift)}
        </td>

        <td className="border border-slate-200 px-2 py-2 align-top dark:border-slate-700 print:hidden">
          <div className="relative">
            <button
              type="button"
              onClick={toggleMenu}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Acciones
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-9 z-20 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Modificar plaza
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onHistory();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Ver historial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPrint();
                    closeMenu();
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Imprimir plaza
                </button>
              </div>
            ) : null}
          </div>
        </td>
      </tr>

      {isExpanded ? (
        <tr className="bg-slate-50 dark:bg-slate-800 print:table-row">
          <td className="border border-slate-200 dark:border-slate-700" />
          <td
            colSpan={4}
            className="border border-slate-200 px-3 py-3 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200 print:px-1 print:py-1 print:text-[9px]"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              <p>
                <span className="font-semibold">Plaza:</span> {item.plaza_number || '-'}
              </p>
              <p>
                <span className="font-semibold">Cargo / Asignatura:</span>{' '}
                {plazaLabel(item)}
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
                <span className="font-semibold">Carácter:</span>{' '}
                {item.current_holder?.character_type || item.revista_status || '-'}
              </p>
              <p>
                <span className="font-semibold">Desde:</span>{' '}
                {item.current_holder
                  ? formatDate(item.current_holder.assignment_date)
                  : formatDate(item.start_date)}
              </p>
              <p>
                <span className="font-semibold">Hasta:</span>{' '}
                {item.current_holder
                  ? item.current_holder.end_date
                    ? formatDate(item.current_holder.end_date)
                    : 'CONTINUA'
                  : item.end_date
                  ? formatDate(item.end_date)
                  : 'CONTINUA'}
              </p>
              <p>
                <span className="font-semibold">Norma legal:</span> {item.legal_norm || '-'}
              </p>
              <p className="md:col-span-2 xl:col-span-3">
                <span className="font-semibold">Observaciones:</span> {item.notes || '-'}
              </p>
            </div>

            {item.covered_titular ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40 print:mt-2 print:border-amber-300 print:bg-transparent">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 print:text-[9px]">
                  Titular cubierto
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs text-slate-700 dark:text-slate-200 md:grid-cols-2 xl:grid-cols-3 print:text-[9px]">
                  <p>
                    <span className="font-semibold">Docente:</span>{' '}
                    {item.covered_titular.full_name || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">DNI:</span>{' '}
                    {item.covered_titular.dni || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">Carácter:</span>{' '}
                    {item.covered_titular.character_type || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">Desde:</span>{' '}
                    {formatDate(item.covered_titular.assignment_date)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] italic text-amber-800/80 dark:text-amber-300/80 print:text-[9px]">
                  Actualmente con licencia. El titular sigue en la plaza pero
                  está siendo reemplazado por el suplente.
                </p>
              </div>
            ) : null}

            {item.previous_holder ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 print:mt-2 print:border-slate-300 print:bg-transparent">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 print:text-[9px]">
                  Docente anterior
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs text-slate-700 dark:text-slate-200 md:grid-cols-2 xl:grid-cols-3 print:text-[9px]">
                  <p>
                    <span className="font-semibold">Docente:</span>{' '}
                    {item.previous_holder.full_name || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">DNI:</span>{' '}
                    {item.previous_holder.dni || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">Carácter:</span>{' '}
                    {item.previous_holder.character_type || '-'}
                  </p>
                  <p>
                    <span className="font-semibold">Desde:</span>{' '}
                    {formatDate(item.previous_holder.assignment_date)}
                  </p>
                  <p>
                    <span className="font-semibold">Hasta:</span>{' '}
                    {formatDate(item.previous_holder.end_date)}
                  </p>
                  <p>
                    <span className="font-semibold">Estado:</span>{' '}
                    {item.previous_holder.status || '-'}
                  </p>
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

/**
 * Tarjeta de indicador para el banner de totales. Los tonos son consistentes
 * con la paleta del resto del sistema (slate como base, acentos por estado).
 */
function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'emerald' | 'amber' | 'sky' | 'rose' | 'indigo';
}) {
  const tones: Record<string, string> = {
    neutral:
      'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
    emerald:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
    amber:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
    sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
    rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
    indigo:
      'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
  };

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
          : 'rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      }
    >
      {children}
    </button>
  );
}