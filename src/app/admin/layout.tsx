'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Users, Briefcase, Building, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  useEffect(() => {
    // Redirect to login if user is not logged in
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    // Once user is loaded, check their role
    if (!isUserDataLoading && userData) {
      if (userData.role !== 'admin') {
        // If not an admin, redirect to home page
        router.push('/');
      }
    }
  }, [user, userLoading, router, userData, isUserDataLoading]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  // Show loading state while user or user data is being fetched
  if (userLoading || isUserDataLoading || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando acceso...</p>
      </div>
    );
  }

  // If user is not an admin, show a message while redirecting
  if (userData.role !== 'admin') {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>No tienes permiso para acceder a esta página. Redirigiendo...</p>
          </div>
      );
  }

  const menuItems = [
    { href: '/', label: 'Asistencia', icon: Home },
    { href: '/admin/employees', label: 'Empleados', icon: Users },
    { href: '/admin/projects', label: 'Proyectos', icon: Briefcase },
    { href: '/admin/sedes', label: 'Sedes', icon: Building },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Admin</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    icon={<item.icon />}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
             <LogOut className="mr-2 h-4 w-4" />
             Cerrar Sesión
           </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
