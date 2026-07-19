'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';
import { LicenciasPanel } from '@/components/licencias-panel';
import { canManageSystem } from '@/lib/auth';

type AgentBasic = {
  id: number;
  full_name: string;
  dni: string;
};

export default function LicenciasPage() {
  const [dni, setDni] = useState('');
  const [agent, setAgent] = useState<AgentBasic | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!agent) return;

    try {
      setExporting(true);
      const response = await api.get('/licenses/export', {
        params: { agentId: agent.id },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `licencias-${agent.dni}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('No se pudo exportar el Excel.');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    try {
      setLoading(true);
      setMessage('');
      setAgent(null);

      const response = await api.get(`/agents/dni/${dni.trim()}`);

      setAgent({
        id: response.data.id,
        full_name: response.data.full_name,
        dni: response.data.dni,
      });
      setMessage('Docente encontrado.');
    } catch (error) {
      console.error(error);
      setMessage('Error al buscar el docente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage allowedRoles={['ADMIN', 'ADMINISTRATIVO']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Módulo
                </p>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Licencias
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Buscá un docente por DNI para ver y cargar sus licencias
                  (artículo del estatuto, período y días).
                </p>
              </div>

              {canManageSystem() ? (
                <Link
                  href="/licencias/tipos"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Configurar tipos de licencia
                </Link>
              ) : null}
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_auto] md:items-end">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Buscar docente por DNI
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 12345678"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {message ? (
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {message}
              </p>
            ) : null}
          </form>

          {agent ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Docente:
                    </span>{' '}
                    {agent.full_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      DNI:
                    </span>{' '}
                    {agent.dni}
                  </p>
                </div>

                {canManageSystem() ? (
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={exporting}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {exporting ? 'Exportando...' : 'Exportar Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Imprimir
                    </button>
                  </div>
                ) : null}
              </div>

              <LicenciasPanel
                agentId={agent.id}
                agentName={agent.full_name}
                canManage={canManageSystem()}
              />
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}
