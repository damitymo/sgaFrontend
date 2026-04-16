'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { canManageSystem } from '@/lib/auth';

type AttendanceItem = {
  id: number;
  agent_id: number;
  attendance_date: string;
  year: number;
  month: number;
  day: number;
  status: 'PRESENTE' | 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  raw_code?: string | null;
  condition_type?: string | null;
  shift?: string | null;
  source_sheet_name?: string | null;
  source_agent_name?: string | null;
  source_dni?: string | null;
  observation?: string | null;
};

type AgentBasic = {
  id: number;
  full_name: string;
  dni: string;
};

type AttendanceForm = {
  attendance_date: string;
  status: 'PRESENTE' | 'AUSENTE_INJUSTIFICADO' | 'LICENCIA';
  raw_code: string;
  condition_type: string;
  shift: string;
  source_sheet_name: string;
  observation: string;
};

const initialForm: AttendanceForm = {
  attendance_date: '',
  status: 'LICENCIA',
  raw_code: '',
  condition_type: '',
  shift: '',
  source_sheet_name: '',
  observation: '',
};

function formatDate(date?: string | null) {
  if (!date) return '-';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;
  return safe.toLocaleDateString('es-AR');
}

export default function AsistenciaPage() {
  const [dni, setDni] = useState('');
  const [agent, setAgent] = useState<AgentBasic | null>(null);
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<AttendanceForm>(initialForm);

  const loadAttendance = async (agentId: number) => {
    const response = await api.get(`/attendance/agent/${agentId}`);
    setRecords(response.data as AttendanceItem[]);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setMessage('');
      setAgent(null);
      setRecords([]);

      const byDni = await api.get(`/agents/dni/${dni.trim()}`);

      const foundAgent: AgentBasic = {
        id: byDni.data.id,
        full_name: byDni.data.full_name,
        dni: byDni.data.dni,
      };

      setAgent(foundAgent);
      await loadAttendance(foundAgent.id);
      setMessage('Docente encontrado.');
    } catch (error) {
      setMessage('Error al buscar el docente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AttendanceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!agent) {
      setMessage('Primero buscá un docente.');
      return;
    }

    if (!form.attendance_date) {
      setMessage('La fecha es obligatoria.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');

      await api.post('/attendance', {
        agent_id: agent.id,
        attendance_date: form.attendance_date,
        status: form.status,
        raw_code: form.raw_code || undefined,
        condition_type: form.condition_type || undefined,
        shift: form.shift || undefined,
        source_sheet_name: form.source_sheet_name || `MANUAL-${agent.dni}`,
        source_agent_name: agent.full_name,
        source_dni: agent.dni,
        observation: form.observation || undefined,
      });

      await loadAttendance(agent.id);
      setForm(initialForm);
      setMessage('Registro cargado correctamente.');
    } catch (error) {
      setMessage('No se pudo guardar el registro.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Módulo
            </p>
            <h2 className="text-3xl font-bold text-slate-800">Asistencia</h2>
            <p className="mt-2 text-slate-600">
              Registro de presentes, ausentes injustificados y licencias.
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_auto] md:items-end">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700">
                  Buscar docente por DNI
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 12345678"
                  className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <button
                onClick={handleSearch}
                className="rounded-xl bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700"
              >
                Buscar
              </button>
            </div>

            {loading && <p className="text-slate-600">Buscando...</p>}
            {message && <p className="text-sm text-slate-700">{message}</p>}
          </div>

          {agent && (
            <>
              {canManageSystem() && (
                <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-2xl font-bold text-slate-800">
                    Cargar registro de asistencia
                  </h3>

                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Docente
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-800">
                      {agent.full_name}
                    </p>
                    <p className="text-slate-600">DNI: {agent.dni}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={form.attendance_date}
                        onChange={(e) =>
                          handleChange('attendance_date', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Estado
                      </label>
                      <select
                        value={form.status}
                        onChange={(e) =>
                          handleChange(
                            'status',
                            e.target.value as AttendanceForm['status'],
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      >
                        <option value="PRESENTE">PRESENTE</option>
                        <option value="AUSENTE_INJUSTIFICADO">
                          AUSENTE INJUSTIFICADO
                        </option>
                        <option value="LICENCIA">LICENCIA</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Código crudo
                      </label>
                      <input
                        type="text"
                        value={form.raw_code}
                        onChange={(e) => handleChange('raw_code', e.target.value)}
                        placeholder="Ej: P, IJ, L1"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Carácter
                      </label>
                      <input
                        type="text"
                        value={form.condition_type}
                        onChange={(e) =>
                          handleChange('condition_type', e.target.value)
                        }
                        placeholder="TITULAR / INTERINO / SUPLENTE"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Turno
                      </label>
                      <input
                        type="text"
                        value={form.shift}
                        onChange={(e) => handleChange('shift', e.target.value)}
                        placeholder="MANANA / TARDE / NOCHE"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Hoja origen
                      </label>
                      <input
                        type="text"
                        value={form.source_sheet_name}
                        onChange={(e) =>
                          handleChange('source_sheet_name', e.target.value)
                        }
                        placeholder="Ej: PEREZ JUAN TITULAR TM"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Observación
                      </label>
                      <textarea
                        value={form.observation}
                        onChange={(e) =>
                          handleChange('observation', e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-xl bg-slate-800 px-5 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                      {saving ? 'Guardando...' : 'Guardar registro'}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-2xl font-bold text-slate-800">
                  Historial de asistencia
                </h3>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Docente:</span>{' '}
                    {agent.full_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">DNI:</span>{' '}
                    {agent.dni}
                  </p>
                </div>

                {!records.length ? (
                  <p className="text-slate-600">No hay registros cargados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border px-3 py-2 text-left">Fecha</th>
                          <th className="border px-3 py-2 text-left">Estado</th>
                          <th className="border px-3 py-2 text-left">Código</th>
                          <th className="border px-3 py-2 text-left">Carácter</th>
                          <th className="border px-3 py-2 text-left">Turno</th>
                          <th className="border px-3 py-2 text-left">Hoja origen</th>
                          <th className="border px-3 py-2 text-left">Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((item) => (
                          <tr key={item.id}>
                            <td className="border px-3 py-2">
                              {formatDate(item.attendance_date)}
                            </td>
                            <td className="border px-3 py-2">{item.status}</td>
                            <td className="border px-3 py-2">
                              {item.raw_code || '-'}
                            </td>
                            <td className="border px-3 py-2">
                              {item.condition_type || '-'}
                            </td>
                            <td className="border px-3 py-2">
                              {item.shift || '-'}
                            </td>
                            <td className="border px-3 py-2">
                              {item.source_sheet_name || '-'}
                            </td>
                            <td className="border px-3 py-2">
                              {item.observation || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </ProtectedPage>
  );
}