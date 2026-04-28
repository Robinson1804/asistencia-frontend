'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/auth-context';

export default function ScrumLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'scrum_master') {
      if (user.role === 'admin') router.push('/admin');
      else router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'scrum_master') {
    return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  }

  return <>{children}</>;
}
