'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Employee } from '@/types';
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
import { deleteDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function EmployeesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'empleados'), orderBy('apellidosNombres'));
  }, [firestore]);

  const { data: employeesData, isLoading: loadingEmployees } = useCollection<Employee>(employeesQuery);

  const employees: Employee[] = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.map(emp => ({...emp, id: emp.dni}));
  }, [employeesData]);

  const handleDeleteEmployee = async () => {
    if (!firestore || !employeeToDelete) return;
    
    try {
      await deleteDoc(doc(firestore, "empleados", employeeToDelete.dni));
      toast({
        title: "Empleado eliminado",
        description: `${employeeToDelete.apellidosNombres} ha sido eliminado.`,
      });
    } catch(e) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar el empleado. Inténtalo de nuevo.",
      });
      console.error(e);
    } finally {
        setEmployeeToDelete(null);
    }
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <Button onClick={() => router.push('/admin/employees/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Empleado
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apellidos y Nombres</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingEmployees ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Cargando empleados...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
                 <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No se encontraron empleados.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.apellidosNombres}</TableCell>
                  <TableCell>{employee.dni}</TableCell>
                  <TableCell>{employee.proyecto?.nombre || 'N/A'}</TableCell>
                  <TableCell>{employee.sede?.nombre || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/employees/${employee.dni}`)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => setEmployeeToDelete(employee)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                           <span className="sr-only">Eliminar</span>
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al empleado 
                            <span className="font-bold"> {employeeToDelete?.apellidosNombres}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
