'use client';

import { useAuthContext } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarProvider, SidebarInset, SidebarTrigger, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Users, Briefcase, Building, LogOut, BarChart, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function FloatingTrigger() {
  const { open } = useSidebar();
  if (open) return null;
  return (
    <div className="fixed top-3 left-3 z-50">
      <SidebarTrigger />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }
    if (!isLoading && user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart },
    { href: '/admin/attendance', label: 'Asistencia', icon: Home },
    { href: '/admin/employees', label: 'Empleados', icon: Users },
    { href: '/admin/projects', label: 'Proyectos', icon: Briefcase },
    { href: '/admin/sedes', label: 'Sedes', icon: Building },
    { href: '/admin/organizacion', label: 'Organización', icon: Network },
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
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname.startsWith(item.href)}>
                    <item.icon className="mr-2 h-4 w-4" />
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
      <SidebarInset>
        <FloatingTrigger />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
