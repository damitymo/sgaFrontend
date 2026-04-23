'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { type AgentProfile } from '@/components/docente-datos-panel';
import { useEscapeKey } from '@/lib/use-escape-key';
import { LegajoPanel } from '@/components/legajo-panel';
import { RevistaPanel } from '@/components/revista-panel';
import { AttendanceGrid } from '@/components/attendance-grid';
import { ClassScheduleEditor } from '@/components/class-schedule-editor';

type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  agent_id?: number | null;
};

type AgentForm = {
  last_name: string;
  first_name: string;
  full_name: string;
  dni: string;
  birth_date: string;
  sex: string;
  marital_status: string;
  birth_place: string;
  nationality: string;
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
  sex: '',
  marital_status: '',
  birth_place: '',
  nationality: '',
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

  if (!form.last_name.trim()) errors.last_name = 'El apellido es obligatorio.';
  if (!form.first_name.trim()) errors.first_name = 'El nombre es obligatorio.';

  if (!form.dni.trim()) {
    errors.dni = 'El DNI es obligatorio.';
  } else if (!/^\d+$/.test(form.dni.trim())) {
    errors.dni = 'El DNI debe contener solo números.';
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'El email no tiene un formato válido.';
  }

  return errors;
}

function FormField({
  label,
  error,
  children,
  full = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}

export default function DocenteDetallePage() {
  const params = useParams<{ id: string }>();
  const docenteId = Number(params.id);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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

    void loadAuthUser();
  }, []);

  const canManageAgents =
    user?.role === 'ADMIN' || user?.role === 'ADMINISTRATIVO';

  const loadFullProfile = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await api.get<AgentProfile>(
        `/agents/${docenteId}/full-profile`,
      );

      setAgent(response.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cargar la ficha completa del docente.');
    } finally {
      setLoading(false);
    }
  }, [docenteId]);

  useEffect(() => {
    if (!Number.isNaN(docenteId)) {
      void loadFullProfile();
    }
  }, [docenteId, loadFullProfile]);

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
      sex: agent.sex || '',
      marital_status: agent.marital_status || '',
      birth_place: agent.birth_place || '',
      nationality: agent.nationality || '',
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

  useEscapeKey(() => closeModals(), isEditOpen);

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
        sex: form.sex.trim() || null,
        marital_status: form.marital_status.trim() || null,
        birth_place: form.birth_place.trim() || null,
        nationality: form.nationality.trim() || null,
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
        <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
          <AppHeader />
          <section className="mx-auto max-w-7xl px-6 py-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Cargando ficha docente...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 print:bg-white dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8 print:max-w-none print:px-4 print:py-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Ficha docente
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {agent?.full_name || 'Docente'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Legajo, situación de revista y libro de asistencia.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Imprimir ficha
              </button>

              {agent ? (
                <>
                  <a
                    href={`/docentes/${agent.id}/planilla-revista?tipo=actual`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Imprimir revista actual
                  </a>
                  <a
                    href={`/docentes/${agent.id}/planilla-revista?tipo=historica`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Imprimir revista histórica
                  </a>
                </>
              ) : null}

              {canManageAgents && agent ? (
                <>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Modificar docente
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-2xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    Baja docente
                  </button>
                </>
              ) : null}
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {message}
              </div>
            ) : null}
          </div>

          {agent ? (
            <>
              <LegajoPanel agent={agent} />

              <RevistaPanel
                agent={agent}
                canManage={canManageAgents}
                onRefreshProfile={loadFullProfile}
              />

              {(agent.assignments ?? [])
                .filter((a) => a.id && (a.status === 'ACTIVA' || a.is_active))
                .map((a) => (
                  <ClassScheduleEditor
                    key={a.id}
                    assignmentId={a.id as number}
                    year={new Date().getFullYear()}
                    title={
                      a.pof_position?.subject_name
                        ? `${a.pof_position.subject_name}${
                            a.pof_position.course
                              ? ` · ${a.pof_position.course}${
                                  a.pof_position.division
                                    ? ' ' + a.pof_position.division
                                    : ''
                                }`
                              : ''
                          }`
                        : 'Horario de clase'
                    }
                    shiftLabel={a.pof_position?.shift ?? undefined}
                    readOnly={!canManageAgents}
                  />
                ))}

              <AttendanceGrid
                source={{ kind: 'agent', agentId: agent.id }}
                canManage={canManageAgents}
              />
            </>
          ) : null}

          {isEditOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
              <div
                data-modal-root
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Modificar docente
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {agent?.full_name || '-'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={closeModals}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-100"
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
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Nombre" error={formErrors.first_name}>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateForm('first_name', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Nombre completo">
                    <input
                      type="text"
                      value={form.full_name}
                      readOnly
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    />
                  </FormField>

                  <FormField label="DNI" error={formErrors.dni}>
                    <input
                      type="text"
                      value={form.dni}
                      onChange={(e) => updateForm('dni', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Fecha de nacimiento">
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => updateForm('birth_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Sexo">
                    <select
                      value={form.sex}
                      onChange={(e) => updateForm('sex', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">-</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                      <option value="X">Otro</option>
                    </select>
                  </FormField>

                  <FormField label="Estado civil">
                    <select
                      value={form.marital_status}
                      onChange={(e) => updateForm('marital_status', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">-</option>
                      <option value="SOLTERO/A">Soltero/a</option>
                      <option value="CASADO/A">Casado/a</option>
                      <option value="DIVORCIADO/A">Divorciado/a</option>
                      <option value="VIUDO/A">Viudo/a</option>
                      <option value="UNION CIVIL">Unión civil</option>
                    </select>
                  </FormField>

                  <FormField label="Lugar de nacimiento">
                    <input
                      type="text"
                      value={form.birth_place}
                      onChange={(e) => updateForm('birth_place', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Nacionalidad">
                    <input
                      type="text"
                      value={form.nationality}
                      onChange={(e) => updateForm('nationality', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Email" error={formErrors.email}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Teléfono">
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Celular">
                    <input
                      type="text"
                      value={form.mobile}
                      onChange={(e) => updateForm('mobile', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Domicilio" full>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Legajo junta">
                    <input
                      type="text"
                      value={form.board_file_number}
                      onChange={(e) => updateForm('board_file_number', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Legajo nivel secundario">
                    <input
                      type="text"
                      value={form.secondary_board_number}
                      onChange={(e) => updateForm('secondary_board_number', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Inicio en escuela">
                    <input
                      type="date"
                      value={form.school_entry_date}
                      onChange={(e) => updateForm('school_entry_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Inicio en docencia">
                    <input
                      type="date"
                      value={form.teaching_entry_date}
                      onChange={(e) => updateForm('teaching_entry_date', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Título que posee" full>
                    <textarea
                      rows={3}
                      value={form.titles}
                      onChange={(e) => updateForm('titles', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>

                  <FormField label="Cédula de identidad">
                    <input
                      type="text"
                      value={form.identity_card_number}
                      onChange={(e) => updateForm('identity_card_number', e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </FormField>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    data-modal-submit
                    onClick={handleUpdate}
                    disabled={savingForm}
                    className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {savingForm ? 'Guardando...' : 'Guardar cambios'}
                  </button>

                  <button
                    type="button"
                    onClick={closeModals}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
