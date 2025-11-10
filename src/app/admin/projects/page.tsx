
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { Proyecto } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ProjectsPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [projectToDelete, setProjectToDelete] = useState<Proyecto | null>(null);

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'proyectos'), orderBy('nombreProyecto'));
  }, [firestore]);

  const { data: projectsData, isLoading: loadingProjects } = useCollection<Proyecto>(projectsQuery);

  const handleDeleteProject = async () => {
    if (!firestore || !projectToDelete) return;
    
    try {
      await deleteDoc(doc(firestore, "proyectos", projectToDelete.id));
      toast({
        title: "Proyecto eliminado",
        description: `${projectToDelete.nombreProyecto} ha sido eliminado.`,
      });
    } catch(e) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
      });
      console.error(e);
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Proyectos</h1>
        <Button onClick={() => router.push('/admin/projects/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Proyecto
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
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
            {loadingProjects ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Cargando proyectos...
                </TableCell>
              </TableRow>
            ) : projectsData && projectsData.length > 0 ? (
              projectsData.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.nombreProyecto}</TableCell>
                  <TableCell>{project.codigoProyecto}</TableCell>
                  <TableCell>
                    <Badge variant={project.activo ? 'secondary' : 'destructive'}>
                      {project.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/projects/${project.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => setProjectToDelete(project)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                           <span className="sr-only">Eliminar</span>
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el proyecto 
                            <span className="font-bold"> {projectToDelete?.nombreProyecto}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">
                    No se encontraron proyectos.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
