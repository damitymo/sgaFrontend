'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export function ProtectedPage({ children, allowedRoles }: Props) {
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string };

      if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
        router.replace('/');
      }
    } catch {
      router.replace('/login');
    }
  }, [router, allowedRoles]);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!token) return null;

  return <>{children}</>;
}