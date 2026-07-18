'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  LicenseModal,
  type LicenseEditTarget,
} from '@/components/license-modal';

type LicenseItem = {
  id: number;
  agent_id: number;
  license_type_id: number;
  license_type?: {
    id: number;
    article: string;
    description: string;
    paid: boolean;
    affects_presentismo: boolean;
  };
  start_date: string;
  end_date: string;
  days_count: number;
  observations?: string | null;
};

type Props = {
  agentId: number;
  agentName: string;
  canManage: boolean;
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

export function LicenciasPanel({ agentId, agentName, canManage }: Props) {
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LicenseEditTarget | null>(
    null,
  );

  const loadLicenses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<LicenseItem[]>(
        `/licenses/agent/${agentId}`,
      );
      setLicenses(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void loadLicenses();
  }, [loadLicenses]);

  const openCreateModal = () => {
    setEditTarget(null);
    setIsModalOpen(true);
  };

  const openEditModal = (license: LicenseItem) => {
    setEditTarget({
      id: license.id,
      license_type_id: license.license_type_id,
      start_date: license.start_date,
      end_date: license.end_date,
      observations: license.observations,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = async (license: LicenseItem) => {
    const ok = window.confirm(
      `¿Seguro que querés borrar esta licencia (${license.license_type?.article ?? '-'})?`,
    );
    if (!ok) return;

    try {
      await api.delete(`/licenses/${license.id}`);
      await loadLicenses();
    } catch (error) {
      console.error(error);
      alert('No se pudo borrar la licencia.');
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-slate-400 print:p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-[10px]">
              Licencias
            </p>
            <h4 className="mt-1 text-xl font-bold text-slate-800 print:text-base dark:text-slate-100">
              Registro de licencias
            </h4>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 print:hidden"
            >
              + Licencia
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Cargando licencias...
          </p>
        ) : licenses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            No hay licencias cargadas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <th className="border border-slate-300 px-2 py-2 text-left font-bold dark:border-slate-700">
                    ARTÍCULO
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-left font-bold dark:border-slate-700">
                    DESCRIPCIÓN
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-bold dark:border-slate-700">
                    DESDE
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-bold dark:border-slate-700">
                    HASTA
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-bold dark:border-slate-700">
                    DÍAS
                  </th>
                  <th className="border border-slate-300 px-2 py-2 text-left font-bold dark:border-slate-700">
                    OBSERVACIONES
                  </th>
                  {canManage ? (
                    <th className="border border-slate-300 px-2 py-2 text-left font-bold print:hidden dark:border-slate-700">
                      ACCIONES
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id}>
                    <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {license.license_type?.article ?? '-'}
                      </span>
                    </td>
                    <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                      {license.license_type?.description ?? '-'}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                      {formatDate(license.start_date)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                      {formatDate(license.end_date)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center dark:border-slate-700">
                      {license.days_count}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 dark:border-slate-700">
                      {license.observations || '-'}
                    </td>
                    {canManage ? (
                      <td className="border border-slate-300 px-2 py-2 print:hidden dark:border-slate-700">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(license)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(license)}
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
        <LicenseModal
          agentId={agentId}
          agentName={agentName}
          license={editTarget}
          onClose={closeModal}
          onSuccess={loadLicenses}
        />
      ) : null}
    </>
  );
}
