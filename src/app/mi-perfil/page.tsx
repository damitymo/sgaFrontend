'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/app-header';
import { ProtectedPage } from '@/components/protected-page';

type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  agent_id?: number | null;
};

type RevistaItem = {
  id?: number;
  revista_type?: string;
  character_type?: string;
  start_date?: string | null;
  end_date?: string | null;
  legal_norm?: string | null;
  resolution_number?: string | null;
  notes?: string | null;
  pof_position?: {
    plaza_number?: string | null;
    subject_name?: string | null;
    hours_count?: number | null;
    course?: string | null;
    division?: string | null;
    shift?: string | null;
  } | null;
};

type AttendanceItem = {
  id?: number;
  start_date?: string | null;
  end_date?: string | null;
  quantity_days?: number | null;
  description?: string | null;
  document_number?: string | null;
};

type AgentProfile = {
  id: number;
  full_name: string;
  dni: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  birth_date?: string | null;
  school_entry_date?: string | null;
  teaching_entry_date?: string | null;
  titles?: string | null;
  revista_actual?: RevistaItem[];
  revista_historica?: RevistaItem[];
  licencias?: AttendanceItem[];
  ausentes?: AttendanceItem[];
  capacitaciones?: AttendanceItem[];
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

function getLoggedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;

  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export default function MiPerfilPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setMessage('');

        let loggedUser = getLoggedUser();

        if (!loggedUser) {
          const authResponse = await api.get<AuthUser>('/auth/me');
          loggedUser = authResponse.data;
          localStorage.setItem('user', JSON.stringify(authResponse.data));
        }

        setUser(loggedUser);

        if (!loggedUser.agent_id) {
          setMessage(
            'Tu usuario no está vinculado a un docente/agente. Contactá al administrador.',
          );
          return;
        }

        const profileResponse = await api.get<AgentProfile>(
          `/agents/${loggedUser.agent_id}/full-profile`,
        );

        setProfile(profileResponse.data);
      } catch (error) {
        console.error(error);
        setMessage('No se pudo cargar tu perfil.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const totalLicencias = profile?.licencias?.length ?? 0;
  const totalAusentes = profile?.ausentes?.length ?? 0;
  const totalCapacitaciones = profile?.capacitaciones?.length ?? 0;
  const totalRevistaActual = profile?.revista_actual?.length ?? 0;
  const totalRevistaHistorica = profile?.revista_historica?.length ?? 0;

  const currentPositions = useMemo(() => {
    return profile?.revista_actual ?? [];
  }, [profile?.revista_actual]);

  return (
    <ProtectedPage allowedRoles={['AGENTE']}>
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader />

        <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <div className="rounded-3xl border bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Mi espacio
            </p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Mi perfil docente
            </h2>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
              Consultá tu ficha, tu situación de revista y tus novedades personales.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-300">Cargando perfil...</p>
            </div>
          ) : null}

          {message ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-700 dark:text-slate-200">{message}</p>
            </div>
          ) : null}

          {!loading && profile ? (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                  <div className="mb-5">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Datos principales
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {profile.full_name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoCard label="DNI" value={profile.dni} />
                    <InfoCard label="Email" value={profile.email || '-'} />
                    <InfoCard label="Teléfono" value={profile.phone || '-'} />
                    <InfoCard label="Celular" value={profile.mobile || '-'} />
                    <InfoCard
                      label="Nacimiento"
                      value={formatDate(profile.birth_date)}
                    />
                    <InfoCard
                      label="Inicio en escuela"
                      value={formatDate(profile.school_entry_date)}
                    />
                    <InfoCard
                      label="Inicio en docencia"
                      value={formatDate(profile.teaching_entry_date)}
                    />
                    <InfoCard
                      label="Títulos"
                      value={profile.titles || '-'}
                      full
                    />
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/docentes/${profile.id}`}
                      className="inline-flex rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Ver ficha completa
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-5">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Mi resumen
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      Estadísticas
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <StatCard label="Licencias" value={totalLicencias} />
                    <StatCard label="Ausentes" value={totalAusentes} />
                    <StatCard
                      label="Capacitaciones"
                      value={totalCapacitaciones}
                    />
                    <StatCard
                      label="Revista actual"
                      value={totalRevistaActual}
                    />
                    <StatCard
                      label="Revista histórica"
                      value={totalRevistaHistorica}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Situación actual
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Revista actual
                  </h3>
                </div>

                {currentPositions.length > 0 ? (
                  <div className="space-y-4">
                    {currentPositions.map((item, index) => (
                      <div
                        key={item.id ?? index}
                        className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <MiniInfo
                            label="Plaza"
                            value={item.pof_position?.plaza_number || '-'}
                          />
                          <MiniInfo
                            label="Asignatura / Cargo"
                            value={item.pof_position?.subject_name || '-'}
                          />
                          <MiniInfo
                            label="Hs."
                            value={String(item.pof_position?.hours_count ?? '-')}
                          />
                          <MiniInfo
                            label="Curso"
                            value={item.pof_position?.course || '-'}
                          />
                          <MiniInfo
                            label="División"
                            value={item.pof_position?.division || '-'}
                          />
                          <MiniInfo
                            label="Turno"
                            value={item.pof_position?.shift || '-'}
                          />
                          <MiniInfo
                            label="Desde"
                            value={formatDate(item.start_date)}
                          />
                          <MiniInfo
                            label="Hasta"
                            value={
                              item.end_date ? formatDate(item.end_date) : 'CONTINUA'
                            }
                          />
                          <MiniInfo
                            label="Carácter"
                            value={item.character_type || '-'}
                          />
                          <MiniInfo
                            label="Norma legal"
                            value={
                              item.legal_norm || item.resolution_number || '-'
                            }
                          />
                        </div>

                        {item.notes ? (
                          <div className="mt-3 rounded-xl border bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            <span className="font-semibold">Observaciones:</span>{' '}
                            {item.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-slate-300">
                    No tenés revista actual cargada.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <SmallListCard
                  title="Licencias"
                  count={totalLicencias}
                  items={profile.licencias}
                />
                <SmallListCard
                  title="Ausentes"
                  count={totalAusentes}
                  items={profile.ausentes}
                />
                <SmallListCard
                  title="Capacitaciones"
                  count={totalCapacitaciones}
                  items={profile.capacitaciones}
                />
              </div>
            </>
          ) : null}
        </section>
      </main>
    </ProtectedPage>
  );
}

function InfoCard({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-sm text-slate-700 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SmallListCard({
  title,
  count,
  items,
}: {
  title: string;
  count: number;
  items?: AttendanceItem[];
}) {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Mis novedades
        </p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Total: {count}
        </p>
      </div>

      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.slice(0, 3).map((item, index) => (
            <div
              key={item.id ?? index}
              className="rounded-2xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-sm text-slate-700 dark:text-slate-100">
                <span className="font-semibold">Desde:</span>{' '}
                {formatDate(item.start_date)}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-100">
                <span className="font-semibold">Hasta:</span>{' '}
                {formatDate(item.end_date)}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-100">
                <span className="font-semibold">Días:</span>{' '}
                {item.quantity_days ?? '-'}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-100">
                <span className="font-semibold">Descripción:</span>{' '}
                {item.description || '-'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 dark:text-slate-300">
          No hay registros cargados.
        </p>
      )}
    </div>
  );
}