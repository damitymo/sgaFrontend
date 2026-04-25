'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProtectedPage } from '@/components/protected-page';
import { type AgentProfile } from '@/components/docente-datos-panel';
import { PlanillaRevistaPrint } from '@/components/planilla-revista-print';

type Tipo = 'actual' | 'historica';

type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  agent_id?: number | null;
};

function PlanillaMiPerfilInner() {
  const search = useSearchParams();
  const tipo: Tipo = search.get('tipo') === 'historica' ? 'historica' : 'actual';

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const stored = localStorage.getItem('user');
        let user: AuthUser | null = stored
          ? (JSON.parse(stored) as AuthUser)
          : null;

        if (!user) {
          const res = await api.get<AuthUser>('/auth/me');
          user = res.data;
          localStorage.setItem('user', JSON.stringify(user));
        }

        if (!user?.agent_id) {
          if (!cancelled)
            setError(
              'Tu usuario no está vinculado a un docente/agente.',
            );
          return;
        }

        const res = await api.get<AgentProfile>(
          `/agents/${user.agent_id}/full-profile`,
        );
        if (!cancelled) setAgent(res.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('No se pudo cargar la planilla.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-600">Cargando planilla...</div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-8 text-sm text-red-600">
        {error ?? 'No se pudo cargar la planilla.'}
      </div>
    );
  }

  const items =
    tipo === 'actual'
      ? agent.revista_actual ?? []
      : agent.revista_historica ?? [];

  const tituloBoton = tipo === 'actual' ? 'Revista actual' : 'Revista histórica';

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[297mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <p className="text-sm font-semibold text-slate-700">
          Planilla · {tituloBoton}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <PlanillaRevistaPrint
        tipo={tipo}
        agentName={agent.full_name}
        agentDni={agent.dni}
        items={items}
      />
    </div>
  );
}

export default function PlanillaRevistaMiPerfilPage() {
  return (
    <ProtectedPage>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-slate-600">Cargando planilla...</div>
        }
      >
        <PlanillaMiPerfilInner />
      </Suspense>
    </ProtectedPage>
  );
}
