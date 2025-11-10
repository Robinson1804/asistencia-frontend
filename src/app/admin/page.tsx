'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/employees');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirigiendo al panel de empleados...</p>
    </div>
  );
}
