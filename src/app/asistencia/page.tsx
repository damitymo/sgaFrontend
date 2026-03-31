'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { canManageSystem } from '@/lib/auth';

type AttendanceItem = {
  id: number;
  agent_id: number;
  record_type: string;
  start_date?: string | null;
  end_date?: string | null;
  quantity_days?: number | null;
  description?: string | null;
  document_number?: string | null;
};

type AgentBasic = {
  id: number;
  full_name: string;
  dni: string;
};

type AttendanceForm = {
  record_type:
    | 'LICENCIA'
    | 'AUSENTE'
    | 'CAPACITACION'
    | 'CONSTANCIA'
    | 'PARO';
  start_date: string;
  end_date: string;
  quantity_days: string;
  description: string;
  document_number: string;
};

const initialForm: AttendanceForm = {
  record_type: 'LICENCIA',
  start_date: '',
  end_date: '',
  quantity_days: '',
  description: '',
  document_number: '',
};

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

      const byDni = await api.get(`/agents/dni/${dni}`);

      if (!byDni.data) {
        setMessage('No se encontró ningún docente con ese DNI.');
        return;
      }

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

    try {
      setSaving(true);
      setMessage('');

      await api.post('/attendance', {
        agent_id: agent.id,
        record_type: form.record_type,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        quantity_days: form.quantity_days ? Number(form.quantity_days) : undefined,
        description: form.description || undefined,
        document_number: form.document_number || undefined,
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

        <section className="mx-auto max-w-7xl px-6 py-8 space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Módulo
            </p>
            <h2 className="text-3xl font-bold text-slate-800">Asistencia</h2>
            <p className="mt-2 text-slate-600">
              Registro de licencias, ausentes, capacitaciones, constancias y
              paros.
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
                    Cargar registro administrativo
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
                        Tipo de registro
                      </label>
                      <select
                        value={form.record_type}
                        onChange={(e) =>
                          handleChange(
                            'record_type',
                            e.target.value as AttendanceForm['record_type'],
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      >
                        <option value="LICENCIA">LICENCIA</option>
                        <option value="AUSENTE">AUSENTE</option>
                        <option value="CAPACITACION">CAPACITACIÓN</option>
                        <option value="CONSTANCIA">CONSTANCIA</option>
                        <option value="PARO">PARO</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Cantidad de días
                      </label>
                      <input
                        type="number"
                        value={form.quantity_days}
                        onChange={(e) =>
                          handleChange('quantity_days', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha desde
                      </label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => handleChange('start_date', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha hasta
                      </label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Documento / constancia
                      </label>
                      <input
                        type="text"
                        value={form.document_number}
                        onChange={(e) =>
                          handleChange('document_number', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Descripción
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
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
                  Historial del docente
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

                {records.length > 0 ? (
                  <div className="space-y-3">
                    {records.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border bg-slate-50 p-4"
                      >
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <p>
                            <span className="font-semibold text-slate-700">
                              Tipo:
                            </span>{' '}
                            {item.record_type}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">
                              Desde:
                            </span>{' '}
                            {item.start_date || '-'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">
                              Hasta:
                            </span>{' '}
                            {item.end_date || '-'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">
                              Días:
                            </span>{' '}
                            {item.quantity_days ?? '-'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">
                              Documento:
                            </span>{' '}
                            {item.document_number || '-'}
                          </p>
                          <p className="md:col-span-3">
                            <span className="font-semibold text-slate-700">
                              Descripción:
                            </span>{' '}
                            {item.description || '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">
                    No hay registros administrativos cargados para este docente.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </ProtectedPage>
  );
}