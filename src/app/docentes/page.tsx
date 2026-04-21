'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

type Agent = {
  id: number;
  full_name: string;
  dni: string;
};

type AgentFullProfile = {
  id: number;
  full_name: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  birth_date?: string | null;
};

export default function DocentesPage() {
  const [filters, setFilters] = useState({
    dni: '',
    apellido: '',
    nombre: '',
    materia: '',
  });

  const [results, setResults] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentFullProfile | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setMessage('');
      setResults([]);
      setSelectedAgent(null);
      setIsProfileOpen(false);

      const params: Record<string, string> = {};

      if (filters.dni.trim()) params.dni = filters.dni.trim();
      if (filters.apellido.trim()) params.apellido = filters.apellido.trim();
      if (filters.nombre.trim()) params.nombre = filters.nombre.trim();
      if (filters.materia.trim()) params.materia = filters.materia.trim();

      if (Object.keys(params).length === 0) {
        setMessage('Ingresá al menos un criterio de búsqueda');
        return;
      }

      const response = await api.get('/agents/search', { params });

      setResults(response.data);
    } catch (error) {
      console.error(error);
      setMessage('Error al buscar docentes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreview = async (agent: Agent) => {
    try {
      setLoadingProfile(true);
      setSelectedAgent(null);

      const response = await api.get(`/agents/${agent.id}/full-profile`);

      setSelectedAgent(response.data);
      setIsProfileOpen(true);
    } catch (error) {
      console.error(error);
      setMessage('Error al cargar perfil');
    } finally {
      setLoadingProfile(false);
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
              Docentes
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Buscá docentes por DNI, apellido, nombre o materia. Abrí la ficha
              completa para ver plazas, prestaciones y situación de revista.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  DNI
                </label>
                <input
                  type="text"
                  value={filters.dni}
                  onChange={(e) => setFilters({ ...filters, dni: e.target.value })}
                  placeholder="Ej: 12345678"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Apellido
                </label>
                <input
                  type="text"
                  value={filters.apellido}
                  onChange={(e) =>
                    setFilters({ ...filters, apellido: e.target.value })
                  }
                  placeholder="Apellido"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nombre
                </label>
                <input
                  type="text"
                  value={filters.nombre}
                  onChange={(e) =>
                    setFilters({ ...filters, nombre: e.target.value })
                  }
                  placeholder="Nombre"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Materia
                </label>
                <input
                  type="text"
                  value={filters.materia}
                  onChange={(e) =>
                    setFilters({ ...filters, materia: e.target.value })
                  }
                  placeholder="Asignatura"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {message ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {message}
              </p>
            ) : null}
          </div>

          {results.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Apellido y nombre
                      </th>
                      <th className="w-32 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        DNI
                      </th>
                      <th className="w-52 border border-slate-200 px-3 py-2 text-left font-semibold dark:border-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((agent) => (
                      <tr
                        key={agent.id}
                        className="bg-white dark:bg-slate-900"
                      >
                        <td className="border border-slate-200 px-3 py-2 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">
                          {agent.full_name}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                          {agent.dni}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                          <div className="flex gap-2">
                            <Link
                              href={`/docentes/${agent.id}`}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              Abrir ficha
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleQuickPreview(agent)}
                              disabled={loadingProfile}
                              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
                            >
                              Vista rápida
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {isProfileOpen && selectedAgent ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Vista rápida
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {selectedAgent.full_name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setSelectedAgent(null);
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cerrar
                </button>
              </div>

              {loadingProfile ? (
                <p className="text-slate-600 dark:text-slate-300">Cargando...</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoRow label="DNI" value={selectedAgent.dni} />
                  <InfoRow label="Email" value={selectedAgent.email} />
                  <InfoRow label="Teléfono" value={selectedAgent.phone} />
                  <InfoRow label="Celular" value={selectedAgent.mobile} />
                  <InfoRow label="Domicilio" value={selectedAgent.address} />
                  <InfoRow
                    label="Fecha nacimiento"
                    value={selectedAgent.birth_date}
                  />
                </div>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
        {value || '-'}
      </p>
    </div>
  );
}
