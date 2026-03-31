'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

type LoggedUser = {
  id: number;
  full_name: string;
  username: string;
  role: string;
  agent_id?: number | null;
};

export function AppHeader() {
  const router = useRouter();

  const isBrowser = typeof window !== 'undefined';

  let user: LoggedUser | null = null;

  if (isBrowser) {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        user = JSON.parse(storedUser) as LoggedUser;
      } catch (error) {
        console.error('No se pudo leer el usuario logueado', error);
      }
    }
  }

  const isAgent = user?.role === 'AGENTE';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  return (
    <header className="border-b bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:shadow-none">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between print:max-w-none print:px-0 print:py-2">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-800 print:h-12 print:w-12 print:rounded-none print:border-none">
            <Image
              src="/logo.png"
              alt="Logo institucional"
              width={56}
              height={56}
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 print:text-[10px]">
              Sistema institucional
            </p>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 print:text-base">
              SGA - Sistema de Gestión Administrativa Escolar
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <nav className="flex flex-wrap items-center gap-2 print:hidden">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Inicio
            </Link>

            {!isAgent ? (
              <>
                <Link
                  href="/docentes"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Docentes
                </Link>

                <Link
                  href="/pof"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  POF
                </Link>

                <Link
                  href="/asistencia"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Asistencia
                </Link>
              </>
            ) : user?.agent_id ? (
              <Link
                href={`/docentes/${user.agent_id}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Mi perfil
              </Link>
            ) : null}

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              Salir
            </button>
          </nav>

          {user && (
            <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 print:hidden">
              <p>
                <span className="font-semibold">Usuario:</span> {user.full_name}
              </p>
              <p>
                <span className="font-semibold">Rol:</span> {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}