# SGA Frontend

UI del Sistema de Gestión Administrativa escolar.

## Stack

- **Next.js 16** (App Router) sobre React 19
- **TypeScript**
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **Axios** con interceptor de JWT para todas las requests
- **`@tanstack/react-query`** (v5) para data fetching, cache y mutations
- Dark mode propio vía `ThemeProvider`

Deploy: Vercel.

## Estructura

```
src/
  app/                       # App Router
    login/                   # /login
    docentes/                # /docentes (búsqueda y ficha)
      [id]/
    pof/                     # /pof (plazas)
    asistencia/              # /asistencia
    usuarios/                # /usuarios (ADMIN)
    mi-perfil/               # /mi-perfil
    layout.tsx
    page.tsx                 # landing / dashboard
  components/
    app-header.tsx
    assignment-modal.tsx
    docente-datos-panel.tsx
    global-enter-navigation.tsx
    protected-page.tsx
    theme-provider.tsx
    theme-toggle.tsx
  lib/
    api.ts                   # instancia axios + helpers de user logueado
    auth.ts                  # tipos/helpers de rol
    query-provider.tsx       # QueryClientProvider
    queries/
      agents.ts              # hooks useAgentsList/Search/Detail/FullProfile + mutations
      pof.ts                 # hooks usePofList/ByPlaza/History + mutations
```

## Setup local

Requisitos: Node 22+, backend corriendo (por defecto en `http://localhost:3001`).

```bash
# .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

npm install
npm run dev                  # http://localhost:3000
```

## Variables de entorno

| Variable | Obligatoria | Notas |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sí | URL del backend (ej: `http://localhost:3001` en local, la URL pública de Render en prod) |

Como es `NEXT_PUBLIC_*`, la variable queda inlineada en el bundle del cliente. No poner secrets con ese prefijo.

## Autenticación

El login (`/login`) hace `POST /auth/login` y guarda `token` + `user` en `localStorage`. El interceptor de `src/lib/api.ts` pega el `Authorization: Bearer <token>` en cada request saliente.

Para leer el user logueado en un client component:

```tsx
import { getUser, canManageSystem, isAgent } from '@/lib/auth';

const user = getUser(); // null si no hay sesión
```

Las rutas protegidas se envuelven con `<ProtectedPage>` (`src/components/protected-page.tsx`), que redirige a `/login` si no hay sesión.

## Data fetching con React Query

El provider global está en `src/lib/query-provider.tsx` y ya está conectado en `layout.tsx`. Config por defecto:

- `staleTime: 30s` — pedir el mismo recurso en ese lapso no dispara refetch.
- `gcTime: 5min` — cuánto tiempo queda la data en memoria sin uso.
- `retry: 1` / `retry: 0` para mutations.
- `refetchOnWindowFocus: false`.

En dev se muestra el botón flotante de React Query Devtools abajo a la derecha.

### Ejemplo — usando los hooks de agents

```tsx
'use client';
import { useState } from 'react';
import { useAgentsSearch, useAgentFullProfile } from '@/lib/queries/agents';

export default function DocentesPage() {
  const [filters, setFilters] = useState({
    dni: '', apellido: '', nombre: '', materia: '',
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const search = useAgentsSearch(filters);
  const profile = useAgentFullProfile(selectedId);

  return (
    <>
      {/* inputs que setean filters... */}
      {search.isLoading && <p>Buscando...</p>}
      {search.data?.map((agent) => (
        <button key={agent.id} onClick={() => setSelectedId(agent.id)}>
          {agent.full_name} — {agent.dni}
        </button>
      ))}
      {profile.data && <AgentProfilePanel data={profile.data} />}
    </>
  );
}
```

### Ejemplo — mutation

```tsx
import { useCreateAgent } from '@/lib/queries/agents';

const createAgent = useCreateAgent();

await createAgent.mutateAsync({ full_name: 'Juan Pérez', dni: '12345678' });
// El cache de agents se invalida automáticamente.
```

## Scripts

```bash
npm run dev         # next dev (turbopack)
npm run build       # next build (producción)
npm run start       # next start
npm run lint
```

## Deploy en Vercel

- Conectar el repo en Vercel y marcar el directorio `frontend/` como root del proyecto.
- Setear `NEXT_PUBLIC_API_URL` apuntando a la URL pública del backend.
- En el backend (Render), setear `FRONTEND_URL` con la URL de Vercel (se usa para CORS).

## Documentación adicional

- [`../README.md`](../README.md) — README general del monorepo.
- [`../backend/README.md`](../backend/README.md) — backend y endpoints.
- [`../docs/base-de-datos-v1.md`](../docs/base-de-datos-v1.md) — schema de la DB.
