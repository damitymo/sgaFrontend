'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { useEscapeKey } from '@/lib/use-escape-key';

type UserRole = 'ADMIN' | 'ADMINISTRATIVO' | 'AGENTE';

type UserItem = {
  id: number;
  full_name: string;
  username: string;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  agent_id?: number | null;
  agent?: {
    id: number;
    full_name: string;
    dni: string;
  } | null;
};

type AgentOption = {
  id: number;
  full_name: string;
  dni: string;
  is_active?: boolean;
};

type UserForm = {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  agent_id: string;
  is_active: boolean;
};

type UserFormErrors = Partial<Record<keyof UserForm, string>>;

const emptyForm: UserForm = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'ADMINISTRATIVO',
  agent_id: '',
  is_active: true,
};

function validateForm(form: UserForm, isEdit = false): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!form.full_name.trim()) {
    errors.full_name = 'El nombre completo es obligatorio.';
  }

  if (!form.username.trim()) {
    errors.username = 'El username es obligatorio.';
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'El email no tiene un formato válido.';
  }

  if (!isEdit && !form.password.trim()) {
    errors.password = 'La contraseña es obligatoria.';
  }

  if (!isEdit && form.password.trim() && form.password.trim().length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (isEdit && form.password.trim() && form.password.trim().length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (form.role === 'AGENTE' && !form.agent_id) {
    errors.agent_id = 'Debés vincular un docente/agente.';
  }

  return errors;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<UserForm>(emptyForm);
  const [errors, setErrors] = useState<UserFormErrors>({});

  const activeAgents = useMemo(
    () => agents.filter((item) => item.is_active !== false),
    [agents],
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage('');

      const [usersResponse, agentsResponse] = await Promise.all([
        api.get('/users'),
        api.get('/agents'),
      ]);

      setUsers((usersResponse.data as UserItem[]) ?? []);
      setAgents((agentsResponse.data as AgentOption[]) ?? []);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = <K extends keyof UserForm>(field: K, value: UserForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role' && value !== 'AGENTE' ? { agent_id: '' } : {}),
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setErrors({});
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setForm(emptyForm);
    setErrors({});
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setErrors({});
    setForm({
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role,
      agent_id: user.agent_id ? String(user.agent_id) : '',
      is_active: user.is_active,
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
  };

  const handleCreate = async () => {
    const validation = validateForm(form, false);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    try {
      setSaving(true);

      await api.post('/users', {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        password: form.password.trim(),
        role: form.role,
        agent_id: form.role === 'AGENTE' ? Number(form.agent_id) : undefined,
      });

      closeCreateModal();
      await loadData();
      setMessage('Usuario creado correctamente.');
    } catch (error: unknown) {
      console.error(error);
      setMessage('No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    const validation = validateForm(form, true);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    try {
      setSaving(true);

      await api.patch(`/users/${editingUser.id}`, {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        password: form.password.trim() || undefined,
        role: form.role,
        agent_id: form.role === 'AGENTE' ? Number(form.agent_id) : null,
        is_active: form.is_active,
      });

      closeEditModal();
      await loadData();
      setMessage('Usuario actualizado correctamente.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudo actualizar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      if (user.is_active) {
        await api.patch(`/users/${user.id}/deactivate`);
      } else {
        await api.patch(`/users/${user.id}/activate`);
      }

      await loadData();
      setMessage(
        user.is_active
          ? 'Usuario desactivado correctamente.'
          : 'Usuario activado correctamente.',
      );
    } catch (error) {
      console.error(error);
      setMessage('No se pudo cambiar el estado del usuario.');
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Administración
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Usuarios
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Creación, edición, activación y desactivación de usuarios del sistema.
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Nuevo usuario
              </button>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {message}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Cargando usuarios...
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
                No hay usuarios cargados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Usuario
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Username
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Email
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Rol
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Docente vinculado
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Estado
                      </th>
                      <th className="border border-slate-200 px-3 py-3 text-left font-semibold dark:border-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="bg-white dark:bg-slate-900">
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-700">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {user.full_name}
                          </p>
                        </td>
                        <td className="border border-slate-200 px-3 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {user.username}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {user.email || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {user.role}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {user.agent?.full_name || '-'}
                        </td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-700">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="border border-slate-200 px-3 py-3 dark:border-slate-700">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                                user.is_active
                                  ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30'
                                  : 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30'
                              }`}
                            >
                              {user.is_active ? 'Desactivar' : 'Activar'}
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

        {isCreateOpen ? (
          <UserModal
            title="Nuevo usuario"
            form={form}
            errors={errors}
            saving={saving}
            agents={activeAgents}
            onChange={updateField}
            onClose={closeCreateModal}
            onSubmit={handleCreate}
          />
        ) : null}

        {editingUser ? (
          <UserModal
            title={`Editar usuario: ${editingUser.username}`}
            form={form}
            errors={errors}
            saving={saving}
            agents={activeAgents}
            isEdit
            onChange={updateField}
            onClose={closeEditModal}
            onSubmit={handleUpdate}
          />
        ) : null}
      </main>
    </ProtectedPage>
  );
}

function UserModal({
  title,
  form,
  errors,
  saving,
  agents,
  isEdit = false,
  onChange,
  onClose,
  onSubmit,
}: {
  title: string;
  form: UserForm;
  errors: UserFormErrors;
  saving: boolean;
  agents: AgentOption[];
  isEdit?: boolean;
  onChange: <K extends keyof UserForm>(field: K, value: UserForm[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  useEscapeKey(() => {
    if (!saving) onClose();
  });

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
      <div
        data-modal-root
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Administración
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nombre completo" error={errors.full_name}>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => onChange('full_name', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Username" error={errors.username}>
            <input
              type="text"
              value={form.username}
              onChange={(e) => onChange('username', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField
            label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            error={errors.password}
          >
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Rol">
            <select
              value={form.role}
              onChange={(e) => onChange('role', e.target.value as UserRole)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
              <option value="AGENTE">AGENTE</option>
            </select>
          </FormField>

          <FormField label="Estado">
            <select
              value={form.is_active ? 'true' : 'false'}
              onChange={(e) => onChange('is_active', e.target.value === 'true')}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </FormField>

          {form.role === 'AGENTE' ? (
            <FormField label="Docente vinculado" error={errors.agent_id} full>
              <select
                value={form.agent_id}
                onChange={(e) => onChange('agent_id', e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Seleccionar docente</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={String(agent.id)}>
                    {agent.full_name} - DNI {agent.dni}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            data-modal-submit
            onClick={onSubmit}
            disabled={saving}
            className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
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
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}