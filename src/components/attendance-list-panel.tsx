'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useEscapeKey } from '@/lib/use-escape-key';

type AttendanceRecord = {
  id: number;
  agent_id: number;
  attendance_date: string;
  status: 'PRESENTE' | 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  observation: string | null;
};

type Props = {
  source: { kind: 'me' } | { kind: 'agent'; agentId: number };
  canManage: boolean;
};

type FormState = {
  attendance_date: string;
  status: 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  observation: string;
};

const emptyForm: FormState = {
  attendance_date: '',
  status: 'AUSENTE_INJUSTIFICADO',
  observation: '',
};

function formatDate(date: string) {
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;
  return safe.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function statusLabel(status: AttendanceRecord['status']) {
  if (status === 'LICENCIA') return 'Justificada';
  if (status === 'AUSENTE_INJUSTIFICADO') return 'Injustificada';
  return 'Presente';
}

function statusClass(status: AttendanceRecord['status']) {
  if (status === 'LICENCIA')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
  if (status === 'AUSENTE_INJUSTIFICADO')
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

/**
 * Vista simple de faltas (fecha + estado + Editar/Borrar + "Nueva falta"),
 * estilo el registro de Licencias, para no obligar a navegar la grilla
 * anual completa solo para cargar una novedad puntual. Convive con
 * AttendanceGrid (mismos datos, otra forma de verlos/cargarlos) — no
 * reemplaza el cálculo de puntaje ni la planilla MEC.
 *
 * Solo ofrece los dos estados que el backend valida hoy para faltas
 * (AUSENTE_INJUSTIFICADO / LICENCIA como "justificada"); los códigos AJ/L2/H
 * de la grilla anual quedan fuera de este formulario simplificado.
 */
export function AttendanceListPanel({ source, canManage }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const path = source.kind === 'me' ? '/attendance/me' : `/attendance/agent/${source.agentId}`;
      const response = await api.get<AttendanceRecord[]>(path, {
        params: { year: currentYear },
      });

      const faltas = response.data
        .filter((r) => r.status !== 'PRESENTE')
        .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

      setRecords(faltas);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar las faltas.');
    } finally {
      setLoading(false);
    }
  }, [source, currentYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  useEscapeKey(() => {
    if (!saving) closeModal();
  }, isModalOpen);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setForm({
      attendance_date: record.attendance_date.slice(0, 10),
      status: record.status === 'LICENCIA' ? 'LICENCIA' : 'AUSENTE_INJUSTIFICADO',
      observation: record.observation || '',
    });
    setIsModalOpen(true);
  };

  const agentId = source.kind === 'agent' ? source.agentId : undefined;

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!form.attendance_date) {
      setMessage('La fecha es obligatoria.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');

      if (editingId) {
        await api.patch(`/attendance/${editingId}`, {
          attendance_date: form.attendance_date,
          status: form.status,
          observation: form.observation.trim() || undefined,
        });
      } else {
        if (!agentId) {
          setMessage('No se pudo determinar el docente.');
          return;
        }
        await api.post('/attendance', {
          agent_id: agentId,
          attendance_date: form.attendance_date,
          status: form.status,
          observation: form.observation.trim() || undefined,
        });
      }

      closeModal();
      await load();
    } catch (error: unknown) {
      console.error(error);
      let msg = 'No se pudo guardar la falta.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string | string[] } } };
        const backendMessage = err.response?.data?.message;
        if (Array.isArray(backendMessage)) msg = backendMessage.join(', ');
        else if (typeof backendMessage === 'string') msg = backendMessage;
      }
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: AttendanceRecord) => {
    const ok = window.confirm(
      `¿Seguro que querés borrar la falta del ${formatDate(record.attendance_date)}?`,
    );
    if (!ok) return;

    try {
      await api.delete(`/attendance/${record.id}`);
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar la falta.');
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Inasistencias
            </p>
            <h4 className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
              Faltas · {currentYear}
            </h4>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              + Nueva falta
            </button>
          ) : null}
        </div>

        {message ? (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {message}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Cargando...</p>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Sin faltas registradas este año.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                    Fecha
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                    Estado
                  </th>
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                    Observación
                  </th>
                  {canManage ? (
                    <th className="w-44 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="bg-white dark:bg-slate-900">
                    <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                      {formatDate(record.attendance_date)}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(record.status)}`}>
                        {statusLabel(record.status)}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      {record.observation || '-'}
                    </td>
                    {canManage ? (
                      <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
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
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            data-modal-root
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Modificar falta' : 'Nueva falta'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-100"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.attendance_date}
                  onChange={(e) => setForm({ ...form, attendance_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Estado
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as FormState['status'] })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="AUSENTE_INJUSTIFICADO">Injustificada</option>
                  <option value="LICENCIA">Justificada</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Observación
                </label>
                <textarea
                  value={form.observation}
                  onChange={(e) => setForm({ ...form, observation: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                data-modal-submit
                disabled={saving}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
