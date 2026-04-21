'use client';

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

/**
 * Configuración por defecto del QueryClient.
 *
 * - staleTime: 30s. Pedir el mismo recurso dentro de ese lapso no refetchea.
 * - gcTime: 5min. Cuánto tiempo queda la data en memoria después de que no
 *   se usa (antes se llamaba cacheTime).
 * - retry: 1. Un único reintento ante error (evita loops cuando el backend
 *   devuelve 401/403/422, que no deben reintentar).
 * - refetchOnWindowFocus: false. Evita refetch agresivo al volver a la tab;
 *   si se necesita, se activa por query específica.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// En el server (RSC) queremos una instancia nueva por request para no
// compartir cache entre usuarios. En el client usamos un singleton.
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState + initializer: garantiza que el client se crea una sola vez
  // por mount, no en cada render.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
