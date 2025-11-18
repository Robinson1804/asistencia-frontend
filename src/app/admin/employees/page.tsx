
'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
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
import { PlusCircle, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

type SortableColumns = 'apellidosNombres' | 'dni' | 'proyecto' | 'sede' | 'scrumMaster';
type SortDirection = 'asc' | 'desc';

export default function EmployeesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<SortableColumns>('apellidosNombres');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'empleados'));
  }, [firestore]);

  const { data: employeesData, isLoading: loadingEmployees } = useCollection<Employee>(employeesQuery);

  const handleSort = (column: SortableColumns) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedEmployees = useMemo(() => {
    if (!employeesData) return [];
    
    const filtered = employeesData
      .map(emp => ({...emp, id: emp.dni}))
      .filter(employee => {
        const nameMatch = employee.apellidosNombres.toLowerCase().includes(nameFilter.toLowerCase());
        const dniMatch = employee.dni.includes(dniFilter);
        return nameMatch && dniMatch;
      });

    return filtered.sort((a, b) => {
        let aValue: string, bValue: string;

        switch(sortColumn) {
            case 'proyecto':
                aValue = a.proyecto?.nombre || '';
                bValue = b.proyecto?.nombre || '';
                break;
            case 'sede':
                aValue = a.sede?.nombre || '';
                bValue = b.sede?.nombre || '';
                break;
            case 'scrumMaster':
                aValue = a.scrumMaster?.nombre || '';
                bValue = b.scrumMaster?.nombre || '';
                break;
            default: // apellidosNombres, dni
                aValue = a[sortColumn] || '';
                bValue = b[sortColumn] || '';
        }

        if (aValue.toLowerCase() < bValue.toLowerCase()) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue.toLowerCase() > bValue.toLowerCase()) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });

  }, [employeesData, nameFilter, dniFilter, sortColumn, sortDirection]);

  const renderSortIcon = (column: SortableColumns) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />;
  };

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

       <div className="mb-6 flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Filtrar por apellidos y nombres..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="max-w-sm"
        />
        <Input
          placeholder="Filtrar por DNI..."
          value={dniFilter}
          onChange={(e) => setDniFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                 <Button variant="ghost" onClick={() => handleSort('apellidosNombres')} className="px-0">
                    Apellidos y Nombres
                    {renderSortIcon('apellidosNombres')}
                 </Button>
              </TableHead>
              <TableHead>
                 <Button variant="ghost" onClick={() => handleSort('dni')} className="px-0">
                    DNI
                    {renderSortIcon('dni')}
                 </Button>
              </TableHead>
               <TableHead>
                 <Button variant="ghost" onClick={() => handleSort('scrumMaster')} className="px-0">
                    Scrum Master
                    {renderSortIcon('scrumMaster')}
                 </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('proyecto')} className="px-0">
                    Proyecto
                    {renderSortIcon('proyecto')}
                </Button>
              </TableHead>
              <TableHead>
                 <Button variant="ghost" onClick={() => handleSort('sede')} className="px-0">
                    Sede
                    {renderSortIcon('sede')}
                 </Button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingEmployees ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Cargando empleados...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedEmployees.length === 0 ? (
                 <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No se encontraron empleados con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.apellidosNombres}</TableCell>
                  <TableCell>{employee.dni}</TableCell>
                  <TableCell>{employee.scrumMaster?.nombre || 'N/A'}</TableCell>
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
