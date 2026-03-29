'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  children: React.ReactNode;
};

export function ProtectedPage({ children }: Props) {
  const router = useRouter();
  const ranRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = localStorage.getItem('token');

    if (!token) {
      router.replace('/login');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true);
    setReady(true);
  }, [router]);

  if (!ready || !authorized) return null;

  return <>{children}</>;
}