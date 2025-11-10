
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { Sede } from '@/types';
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

export default function SedesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sedeToDelete, setSedeToDelete] = useState<Sede | null>(null);

  const sedesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sedes'), orderBy('nombreSede'));
  }, [firestore]);

  const { data: sedesData, isLoading: loadingSedes } = useCollection<Sede>(sedesQuery);

  const handleDeleteSede = async () => {
    if (!firestore || !sedeToDelete) return;
    
    try {
      await deleteDoc(doc(firestore, "sedes", sedeToDelete.id));
      toast({
        title: "Sede eliminada",
        description: `${sedeToDelete.nombreSede} ha sido eliminada.`,
      });
    } catch(e) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar la sede. Inténtalo de nuevo.",
      });
      console.error(e);
    } finally {
      setSedeToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Sedes</h1>
        <Button onClick={() => router.push('/admin/sedes/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Sede
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre de la Sede</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingSedes ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Cargando sedes...
                </TableCell>
              </TableRow>
            ) : sedesData && sedesData.length > 0 ? (
              sedesData.map((sede) => (
                <TableRow key={sede.id}>
                  <TableCell className="font-medium">{sede.nombreSede}</TableCell>
                  <TableCell>{sede.direccion}</TableCell>
                  <TableCell>
                    <Badge variant={sede.activo ? 'secondary' : 'destructive'}>
                      {sede.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/sedes/${sede.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => setSedeToDelete(sede)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                           <span className="sr-only">Eliminar</span>
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente la sede 
                            <span className="font-bold"> {sedeToDelete?.nombreSede}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSedeToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSede} className="bg-destructive hover:bg-destructive/90">
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
                    No se encontraron sedes.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
