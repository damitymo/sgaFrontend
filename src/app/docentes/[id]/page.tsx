'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { DocenteDatosPanel } from '@/components/docente-datos-panel';

type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
};

type RevistaItem = {
  id?: number;
  revista_type?: string;
  character_type?: string;
  start_date?: string | null;
  end_date?: string | null;
  legal_norm?: string | null;
  resolution_number?: string | null;
  notes?: string | null;
  pof_position?: {
    plaza_number?: string | null;
    subject_name?: string | null;
    hours_count?: number | null;
    course?: string | null;
    division?: string | null;
    shift?: string | null;
  } | null;
};

type AttendanceItem = {
  id?: number;
  start_date?: string | null;
  end_date?: string | null;
  quantity_days?: number | null;
  description?: string | null;
  document_number?: string | null;
};

type AgentProfile = {
  id: number;
  last_name?: string | null;
  first_name?: string | null;
  full_name: string;
  dni: string;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  teaching_file_number?: string | null;
  board_file_number?: string | null;
  secondary_board_number?: string | null;
  school_entry_date?: string | null;
  teaching_entry_date?: string | null;
  titles?: string | null;
  identity_card_number?: string | null;
  notes?: string | null;
  revista_actual?: RevistaItem[];
  licencias?: AttendanceItem[];
  ausentes?: AttendanceItem[];
  capacitaciones?: AttendanceItem[];
};

type AgentForm = {
  last_name: string;
  first_name: string;
  full_name: string;
  dni: string;
  birth_date: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  board_file_number: string;
  secondary_board_number: string;
  school_entry_date: string;
  teaching_entry_date: string;
  titles: string;
  identity_card_number: string;
};

type AgentFormErrors = Partial<Record<keyof AgentForm, string>>;

const emptyForm: AgentForm = {
  last_name: '',
  first_name: '',
  full_name: '',
  dni: '',
  birth_date: '',
  address: '',
  phone: '',
  mobile: '',
  email: '',
  board_file_number: '',
  secondary_board_number: '',
  school_entry_date: '',
  teaching_entry_date: '',
  titles: '',
  identity_card_number: '',
};

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

function toInputDate(date?: string | null) {
  if (!date) return '';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return '';
  return safe.toISOString().slice(0, 10);
}

function buildFullName(lastName: string, firstName: string) {
  const last = lastName.trim();
  const first = firstName.trim();

  if (!last && !first) return '';
  if (!last) return first;
  if (!first) return last;

  return `${last}, ${first}`;
}

function validateAgentForm(form: AgentForm): AgentFormErrors {
  const errors: AgentFormErrors = {};

  if (!form.last_name.trim()) {
    errors.last_name = 'El apellido es obligatorio.';
  }

  if (!form.first_name.trim()) {
    errors.first_name = 'El nombre es obligatorio.';
  }

  if (!form.dni.trim()) {
    errors.dni = 'El DNI es obligatorio.';
  } else if (!/^\d+$/.test(form.dni.trim())) {
    errors.dni = 'El DNI debe contener solo números.';
  }

  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = 'El email no tiene un formato válido.';
  }

  return errors;
}

export default function DocenteDetallePage() {
  const params = useParams<{ id: string }>();
  const docenteId = Number(params.id);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [openLicencias, setOpenLicencias] = useState(false);
  const [openAusentes, setOpenAusentes] = useState(false);
  const [openCapacitaciones, setOpenCapacitaciones] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formErrors, setFormErrors] = useState<AgentFormErrors>({});
  const [form, setForm] = useState<AgentForm>(emptyForm);

  useEffect(() => {
    const loadAuthUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');

        if (storedUser) {
          const parsed = JSON.parse(storedUser) as AuthUser;
          setUser(parsed);
          return;
        }

        const response = await api.get<AuthUser>('/auth/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('No se pudo cargar el usuario autenticado:', error);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    loadAuthUser();
  }, []);

  const canManageAgents =
    user?.role === 'ADMIN' || user?.role === 'ADMINISTRATIVO';

  const loadFullProfile = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await api.get(`/agents/${docenteId}/full-profile`);
      setAgent(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar la ficha completa del docente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isNaN(docenteId)) {
      loadFullProfile();
    }
  }, [docenteId]);

  const updateForm = (field: keyof AgentForm, value: string) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };

      if (field === 'last_name' || field === 'first_name') {
        next.full_name = buildFullName(
          field === 'last_name' ? value : next.last_name,
          field === 'first_name' ? value : next.first_name,
        );
      }

      return next;
    });

    setFormErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const openEditModal = () => {
    if (!agent) return;

    setForm({
      last_name: agent.last_name || '',
      first_name: agent.first_name || '',
      full_name: agent.full_name || '',
      dni: agent.dni || '',
      birth_date: toInputDate(agent.birth_date),
      address: agent.address || '',
      phone: agent.phone || '',
      mobile: agent.mobile || '',
      email: agent.email || '',
      board_file_number: agent.board_file_number || '',
      secondary_board_number: agent.secondary_board_number || '',
      school_entry_date: toInputDate(agent.school_entry_date),
      teaching_entry_date: toInputDate(agent.teaching_entry_date),
      titles: agent.titles || '',
      identity_card_number: agent.identity_card_number || '',
    });

    setFormErrors({});
    setIsEditOpen(true);
  };

  const closeModals = () => {
    setIsEditOpen(false);
    setFormErrors({});
  };

  const handleUpdate = async () => {
    if (!agent) return;

    const validation = validateAgentForm(form);
    setFormErrors(validation);

    if (Object.keys(validation).length > 0) return;

    try {
      setSavingForm(true);

      const payload = {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        full_name: buildFullName(form.last_name, form.first_name),
        dni: form.dni.trim(),
        birth_date: form.birth_date || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        email: form.email.trim() || null,
        board_file_number: form.board_file_number.trim() || null,
        secondary_board_number: form.secondary_board_number.trim() || null,
        school_entry_date: form.school_entry_date || null,
        teaching_entry_date: form.teaching_entry_date || null,
        titles: form.titles.trim() || null,
        identity_card_number: form.identity_card_number.trim() || null,
      };

      await api.patch(`/agents/${agent.id}`, payload);
      closeModals();
      await loadFullProfile();
    } catch (error) {
      console.error(error);
      alert('No se pudo modificar el docente.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;

    const ok = window.confirm(
      `¿Seguro que querés dar de baja a ${agent.full_name}?`,
    );

    if (!ok) return;

    try {
      await api.delete(`/agents/${agent.id}`);
      alert('Docente dado de baja correctamente.');
      window.close();
    } catch (error) {
      console.error(error);
      alert('No se pudo dar de baja el docente.');
    }
  };

  if (loadingUser || loading) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100">
          <AppHeader />
          <section className="mx-auto max-w-7xl px-6 py-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
              Cargando ficha docente...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 print:bg-white">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8 print:max-w-none print:px-4 print:py-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ficha docente
            </p>
            <h2 className="text-3xl font-bold text-slate-800">
              {agent?.full_name || 'Docente'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Vista individual en ventana aparte.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Imprimir ficha
              </button>

              {canManageAgents && agent ? (
                <>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Modificar docente
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-2xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Baja docente
                  </button>
                </>
              ) : null}
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {message}
              </div>
            ) : null}
          </div>

          {agent ? (
            <>
              <div className="hidden print:block">
                <div className="mb-3 border-b border-slate-400 pb-2">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Escuela Técnica Valentín Virasoro
                  </p>
                  <h1 className="mt-1 text-center text-lg font-bold text-slate-800">
                    Ficha Docente
                  </h1>
                </div>
              </div>

              <DocenteDatosPanel
  agent={agent}
  onOpenLicencias={() => setOpenLicencias(true)}
  onOpenAusentes={() => setOpenAusentes(true)}
  onOpenCapacitaciones={() => setOpenCapacitaciones(true)}
  onRefreshProfile={loadFullProfile}
/>
            </>
          ) : null}

          {openLicencias && agent ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Licencias</h3>
                  <button
                    type="button"
                    onClick={() => setOpenLicencias(false)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                {agent.licencias && agent.licencias.length > 0 ? (
                  <div className="space-y-3">
                    {agent.licencias.map((item, index) => (
                      <div
                        key={item.id ?? index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <p>
                          <span className="font-semibold">Desde:</span>{' '}
                          {formatDate(item.start_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Hasta:</span>{' '}
                          {formatDate(item.end_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Cantidad de días:</span>{' '}
                          {item.quantity_days ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Documento:</span>{' '}
                          {item.document_number ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Descripción:</span>{' '}
                          {item.description ?? '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No hay licencias registradas.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {openAusentes && agent ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Ausentes</h3>
                  <button
                    type="button"
                    onClick={() => setOpenAusentes(false)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                {agent.ausentes && agent.ausentes.length > 0 ? (
                  <div className="space-y-3">
                    {agent.ausentes.map((item, index) => (
                      <div
                        key={item.id ?? index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <p>
                          <span className="font-semibold">Desde:</span>{' '}
                          {formatDate(item.start_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Hasta:</span>{' '}
                          {formatDate(item.end_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Cantidad de días:</span>{' '}
                          {item.quantity_days ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Documento:</span>{' '}
                          {item.document_number ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Descripción:</span>{' '}
                          {item.description ?? '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No hay ausentes registrados.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {openCapacitaciones && agent ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Capacitaciones</h3>
                  <button
                    type="button"
                    onClick={() => setOpenCapacitaciones(false)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                {agent.capacitaciones && agent.capacitaciones.length > 0 ? (
                  <div className="space-y-3">
                    {agent.capacitaciones.map((item, index) => (
                      <div
                        key={item.id ?? index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                      >
                        <p>
                          <span className="font-semibold">Desde:</span>{' '}
                          {formatDate(item.start_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Hasta:</span>{' '}
                          {formatDate(item.end_date)}
                        </p>
                        <p>
                          <span className="font-semibold">Cantidad de días:</span>{' '}
                          {item.quantity_days ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Documento:</span>{' '}
                          {item.document_number ?? '-'}
                        </p>
                        <p>
                          <span className="font-semibold">Descripción:</span>{' '}
                          {item.description ?? '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No hay capacitaciones registradas.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {isEditOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Modificar docente
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {agent?.full_name || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeModals}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Apellido" error={formErrors.last_name}>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => updateForm('last_name', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Nombre" error={formErrors.first_name}>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateForm('first_name', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="DNI" error={formErrors.dni}>
                    <input
                      type="text"
                      value={form.dni}
                      onChange={(e) => updateForm('dni', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Fecha de nacimiento">
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => updateForm('birth_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Email" error={formErrors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Domicilio">
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Teléfono fijo">
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Celular">
                    <input
                      type="text"
                      value={form.mobile}
                      onChange={(e) => updateForm('mobile', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Legajo en junta">
                    <input
                      type="text"
                      value={form.board_file_number}
                      onChange={(e) =>
                        updateForm('board_file_number', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Legajo nivel secundario">
                    <input
                      type="text"
                      value={form.secondary_board_number}
                      onChange={(e) =>
                        updateForm('secondary_board_number', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Inicio en escuela">
                    <input
                      type="date"
                      value={form.school_entry_date}
                      onChange={(e) =>
                        updateForm('school_entry_date', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Inicio en docencia">
                    <input
                      type="date"
                      value={form.teaching_entry_date}
                      onChange={(e) =>
                        updateForm('teaching_entry_date', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Cédula de identidad">
                    <input
                      type="text"
                      value={form.identity_card_number}
                      onChange={(e) =>
                        updateForm('identity_card_number', e.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>

                  <FormField label="Título que posee" full>
                    <textarea
                      value={form.titles}
                      onChange={(e) => updateForm('titles', e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                    />
                  </FormField>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={savingForm}
                    className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                  >
                    {savingForm ? 'Guardando...' : 'Guardar cambios'}
                  </button>

                  <button
                    type="button"
                    onClick={closeModals}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function FormField({
  label,
  children,
  full = false,
  error,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  error?: string;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}