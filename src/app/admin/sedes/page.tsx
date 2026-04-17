'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function SedesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sedeToDelete, setSedeToDelete] = useState<any>(null);

  useEffect(() => {
    api.getSedes().then(setSedes).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!sedeToDelete) return;
    try {
      await api.deleteSede(sedeToDelete.id);
      setSedes(prev => prev.filter(s => s.id !== sedeToDelete.id));
      toast({ title: 'Sede eliminada', description: `${sedeToDelete.nombre_sede} ha sido eliminada.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo eliminar la sede.' });
    } finally {
      setSedeToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Sedes</h1>
        <Button onClick={() => router.push('/admin/sedes/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Sede
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
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Cargando sedes...</TableCell></TableRow>
            ) : sedes.length > 0 ? sedes.map(sede => (
              <TableRow key={sede.id}>
                <TableCell className="font-medium">{sede.nombre_sede}</TableCell>
                <TableCell>{sede.direccion}</TableCell>
                <TableCell>
                  <Badge variant={sede.activo ? 'secondary' : 'destructive'}>
                    {sede.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/sedes/${sede.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setSedeToDelete(sede)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esto eliminará permanentemente la sede <span className="font-bold">{sedeToDelete?.nombre_sede}</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSedeToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={4} className="text-center">No se encontraron sedes.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
