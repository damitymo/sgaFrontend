'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { AssignmentModal } from '@/components/assignment-modal';
import {
  EditAssignmentModal,
  type EditableAssignment,
} from '@/components/edit-assignment-modal';

type Agent = {
  id: number;
  full_name: string;
  dni: string;
};

type Assignment = {
  id: number;
  agent_id: number;
  status: string;
  character_type: string | null;
  legal_norm: string | null;
  assignment_date: string | null;
  end_date: string | null;
  notes: string | null;
  legal_norm_type: string | null;
  legal_norm_number: string | null;
  pof_position: {
    plaza_number: string;
    subject_name: string | null;
    modality: string | null;
    course: string | null;
    division: string | null;
    shift: string | null;
    hours_count: number | null;
  } | null;
};

function shiftLabel(value?: string | null) {
  if (!value) return '-';
  const normalized = value.toUpperCase();
  if (normalized.startsWith('M')) return 'Mañana';
  if (normalized.startsWith('T')) return 'Tarde';
  if (normalized.startsWith('N')) return 'Noche';
  return value;
}

function formatDate(date?: string | null) {
  if (!date) return '-';
  const safe = new Date(date);
  if (Number.isNaN(safe.getTime())) return date;
  return safe.toLocaleDateString('es-AR');
}

export default function CargosAsignadosPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  const [movementModal, setMovementModal] = useState<{
    agentId: number;
    agentName: string;
    movementType: 'DESIGNACION' | 'BAJA';
  } | null>(null);

  const [editTarget, setEditTarget] = useState<{
    agentName: string;
    plazaLabel: string;
    assignment: EditableAssignment;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [agentsRes, assignmentsRes] = await Promise.all([
        api.get<Agent[]>('/agents'),
        api.get<Assignment[]>('/assignments'),
      ]);
      setAgents(agentsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron cargar los cargos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignmentsByAgent = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const a of assignments) {
      if (a.status !== 'ACTIVA') continue;
      if (!map.has(a.agent_id)) map.set(a.agent_id, []);
      map.get(a.agent_id)!.push(a);
    }
    return map;
  }, [assignments]);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter(
      (a) =>
        a.full_name.toLowerCase().includes(query) || a.dni.includes(query),
    );
  }, [agents, search]);

  const handleDelete = async (assignment: Assignment, agentName: string) => {
    const label = assignment.pof_position
      ? `${assignment.pof_position.subject_name ?? assignment.pof_position.modality ?? assignment.pof_position.plaza_number}`
      : 'este cargo';

    const ok = window.confirm(
      `¿Seguro que querés borrar "${label}" de ${agentName}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;

    try {
      await api.delete(`/assignments/${assignment.id}`);
      await load();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar el cargo.');
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Módulo
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Cargos y asignaciones
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Gestión de profesores por materia, curso y situación de revista.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Buscar profesor
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, apellido o DNI..."
                className="min-w-[260px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Limpiar
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Total: <span className="font-semibold">{filteredAgents.length} profesor(es)</span>
            </p>
          </div>

          {message ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Cargando...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAgents.map((agent) => {
                const cargos = assignmentsByAgent.get(agent.id) ?? [];
                const isOpen = expandedAgentId === agent.id;

                return (
                  <div
                    key={agent.id}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAgentId(isOpen ? null : agent.id)
                      }
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          {agent.full_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          DNI: {agent.dni}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {cargos.length} cargo(s)
                        </span>
                        <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                        {cargos.length === 0 ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Sin cargos activos.
                          </p>
                        ) : (
                          cargos.map((cargo) => {
                            const materia =
                              cargo.pof_position?.subject_name ||
                              cargo.pof_position?.modality ||
                              'Cargo';

                            return (
                              <div
                                key={cargo.id}
                                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                                      {materia}{' '}
                                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                                        {cargo.character_type || '-'}
                                      </span>
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {cargo.pof_position?.course
                                        ? `${cargo.pof_position.course} ${cargo.pof_position.division || ''} · `
                                        : ''}
                                      {shiftLabel(cargo.pof_position?.shift)} ·{' '}
                                      Cat. {cargo.pof_position?.hours_count ?? '-'} hs ·{' '}
                                      Plaza {cargo.pof_position?.plaza_number ?? '-'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      Desde {formatDate(cargo.assignment_date)} ·{' '}
                                      {cargo.legal_norm || 'sin norma legal'}
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditTarget({
                                          agentName: agent.full_name,
                                          plazaLabel: `Plaza ${cargo.pof_position?.plaza_number ?? '-'} · ${materia}`,
                                          assignment: {
                                            id: cargo.id,
                                            legal_norm_type: cargo.legal_norm_type,
                                            legal_norm_number: cargo.legal_norm_number,
                                            character_type: cargo.character_type,
                                            assignment_date: cargo.assignment_date,
                                            end_date: cargo.end_date,
                                            notes: cargo.notes,
                                          },
                                        })
                                      }
                                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(cargo, agent.full_name)}
                                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-900/30"
                                    >
                                      Borrar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setMovementModal({
                                agentId: agent.id,
                                agentName: agent.full_name,
                                movementType: 'DESIGNACION',
                              })
                            }
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                          >
                            + Cargo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMovementModal({
                                agentId: agent.id,
                                agentName: agent.full_name,
                                movementType: 'BAJA',
                              })
                            }
                            className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-900/30"
                          >
                            + Baja
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {movementModal ? (
        <AssignmentModal
          agentId={movementModal.agentId}
          agentName={movementModal.agentName}
          movementType={movementModal.movementType}
          onClose={() => setMovementModal(null)}
          onSuccess={load}
        />
      ) : null}

      {editTarget ? (
        <EditAssignmentModal
          agentName={editTarget.agentName}
          plazaLabel={editTarget.plazaLabel}
          assignment={editTarget.assignment}
          onClose={() => setEditTarget(null)}
          onSuccess={load}
        />
      ) : null}
    </ProtectedPage>
  );
}
