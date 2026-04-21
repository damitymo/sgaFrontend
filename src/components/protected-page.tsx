'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';

type Props = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

/**
 * Gate de cliente: chequea que haya un `user` guardado en localStorage y
 * (opcionalmente) que su rol esté en `allowedRoles`. El token real vive
 * en una cookie httpOnly que el browser maneja solo — si venció o no
 * existe, el backend devuelve 401 y el interceptor global de axios
 * (ver `lib/api.ts`) redirige a /login.
 *
 * El chequeo corre en `useEffect` (no en render) para evitar hydration
 * mismatches: SSR y primer render en cliente devuelven siempre null,
 * después el efecto lee localStorage y decide si renderizar o redirigir.
 */
export function ProtectedPage({ children, allowedRoles }: Props) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getUser();

    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
      window.location.replace('/');
      return;
    }

    setIsAuthorized(true);
  }, [allowedRoles]);

  if (isAuthorized !== true) return null;

  return <>{children}</>;
}
