'use client';

import { useMemo } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';

type Props = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export function ProtectedPage({ children, allowedRoles }: Props) {
  const isAuthorized = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('token');
    const user = getUser();

    if (!token || !user) {
      return false;
    }

    if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
      return false;
    }

    return true;
  }, [allowedRoles]);

  if (isAuthorized === null) return null;

  if (!isAuthorized) {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = getUser();

      if (!token || !user) {
        window.location.replace('/login');
      } else {
        window.location.replace('/');
      }
    }

    return null;
  }

  return <>{children}</>;
}