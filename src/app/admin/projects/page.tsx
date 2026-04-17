'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  useEffect(() => {
    api.getProyectos().then(setProjects).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await apiFetch(`/api/proyectos/${projectToDelete.id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      toast({ title: 'Proyecto eliminado', description: `${projectToDelete.nombre_proyecto} ha sido eliminado.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    } finally { setProjectToDelete(null); }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Proyectos</h1>
        <Button onClick={() => router.push('/admin/projects/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proyecto
        </Button>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Proyecto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Cargando proyectos...</TableCell></TableRow>
            ) : projects.length > 0 ? projects.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre_proyecto}</TableCell>
                <TableCell>{p.codigo_proyecto}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? 'secondary' : 'destructive'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/projects/${p.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setProjectToDelete(p)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esto eliminará el proyecto <span className="font-bold">{projectToDelete?.nombre_proyecto}</span>.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="text-center">No se encontraron proyectos.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
