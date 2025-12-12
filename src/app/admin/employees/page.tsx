
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Employee, Proyecto, Sede, ScrumMaster, TipoContrato } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortableColumns = 'apellidosNombres' | 'dni' | 'proyecto' | 'sede' | 'scrumMaster';
type SortDirection = 'asc' | 'desc';

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Initialize from URL params
  const [nameFilter, setNameFilter] = useState(searchParams.get('name') || '');
  const [dniFilter, setDniFilter] = useState(searchParams.get('dni') || '');
  const [proyectoFilter, setProyectoFilter] = useState(searchParams.get('proyecto') || 'todos');
  const [sedeFilter, setSedeFilter] = useState(searchParams.get('sede') || 'todos');
  const [scrumMasterFilter, setScrumMasterFilter] = useState(searchParams.get('scrumMaster') || 'todos');
  const [tipoContratoFilter, setTipoContratoFilter] = useState(searchParams.get('tipoContrato') || 'todos');
  const [sortColumn, setSortColumn] = useState<SortableColumns>((searchParams.get('sortBy') as SortableColumns) || 'apellidosNombres');
  const [sortDirection, setSortDirection] = useState<SortDirection>((searchParams.get('sortDir') as SortDirection) || 'asc');

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (nameFilter) params.set('name', nameFilter);
    if (dniFilter) params.set('dni', dniFilter);
    if (proyectoFilter !== 'todos') params.set('proyecto', proyectoFilter);
    if (sedeFilter !== 'todos') params.set('sede', sedeFilter);
    if (scrumMasterFilter !== 'todos') params.set('scrumMaster', scrumMasterFilter);
    if (tipoContratoFilter !== 'todos') params.set('tipoContrato', tipoContratoFilter);
    params.set('sortBy', sortColumn);
    params.set('sortDir', sortDirection);

    // Use replaceState to avoid adding to history stack
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [nameFilter, dniFilter, proyectoFilter, sedeFilter, scrumMasterFilter, tipoContratoFilter, sortColumn, sortDirection]);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'empleados'));
  }, [firestore]);

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'proyectos');
  }, [firestore]);

  const sedesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sedes');
  }, [firestore]);

  const scrumMastersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'scrumMasters');
  }, [firestore]);
  
  const tiposContratoQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tiposContrato');
  }, [firestore]);

  const { data: employeesData, isLoading: loadingEmployees } = useCollection<Employee>(employeesQuery);
  const { data: projectsData } = useCollection<Proyecto>(projectsQuery);
  const { data: sedesData } = useCollection<Sede>(sedesQuery);
  const { data: scrumMastersData } = useCollection<ScrumMaster>(scrumMastersQuery);
  const { data: tiposContratoData } = useCollection<TipoContrato>(tiposContratoQuery);

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
        const proyectoMatch = proyectoFilter === 'todos' || employee.proyectoId === proyectoFilter;
        const sedeMatch = sedeFilter === 'todos' || employee.sedeId === sedeFilter;
        const scrumMasterMatch = scrumMasterFilter === 'todos' || employee.scrumMasterId === scrumMasterFilter;
        const tipoContratoMatch = tipoContratoFilter === 'todos' || employee.tipoContratoId === tipoContratoFilter;
        return nameMatch && dniMatch && proyectoMatch && sedeMatch && scrumMasterMatch && tipoContratoMatch;
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

  }, [employeesData, nameFilter, dniFilter, proyectoFilter, sedeFilter, scrumMasterFilter, tipoContratoFilter, sortColumn, sortDirection]);

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

  const handleExportExcel = () => {
    const dataToExport = filteredAndSortedEmployees.map((employee) => ({
      'Apellidos y Nombres': employee.apellidosNombres,
      'DNI': employee.dni,
      'Email': employee.email || '-',
      'Teléfono': employee.telefono || '-',
      'Correo Personal': employee.correoPersonal || '-',
      'Proyecto': employee.proyecto?.nombre || '-',
      'Código Proyecto': employee.proyecto?.codigo || '-',
      'Coordinador': employee.coordinador?.nombre || '-',
      'Scrum Master': employee.scrumMaster?.nombre || '-',
      'División': employee.division?.nombre || '-',
      'Sede': employee.sede?.nombre || '-',
      'Modalidad': employee.modalidad?.nombre || '-',
      'Tipo Contrato': employee.tipoContrato?.tipo || '-',
      'DTT': employee.dtt?.nombre || '-',
      'Estado': employee.activo ? 'Activo' : 'Inactivo',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');

    // Ajustar ancho de columnas
    worksheet['!cols'] = [
      { wch: 35 }, // Apellidos y Nombres
      { wch: 12 }, // DNI
      { wch: 30 }, // Email
      { wch: 12 }, // Teléfono
      { wch: 30 }, // Correo Personal
      { wch: 25 }, // Proyecto
      { wch: 15 }, // Código Proyecto
      { wch: 20 }, // Coordinador
      { wch: 20 }, // Scrum Master
      { wch: 20 }, // División
      { wch: 15 }, // Sede
      { wch: 15 }, // Modalidad
      { wch: 18 }, // Tipo Contrato
      { wch: 20 }, // DTT
      { wch: 10 }, // Estado
    ];

    const fileName = `Empleados_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${dataToExport.length} empleados.`,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={filteredAndSortedEmployees.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => router.push('/admin/employees/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Empleado
          </Button>
        </div>
      </div>

       <div className="mb-6 p-4 border rounded-lg bg-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name-filter">Buscar por Apellidos y Nombres</Label>
            <Input
              id="name-filter"
              placeholder="Ej: Juan Pérez..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni-filter">Buscar por DNI</Label>
            <Input
              id="dni-filter"
              placeholder="Ej: 12345678..."
              value={dniFilter}
              onChange={(e) => setDniFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="proyecto-filter">Proyecto</Label>
            <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
              <SelectTrigger id="proyecto-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proyectos</SelectItem>
                {(projectsData || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigoProyecto} - {p.nombreProyecto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-filter">Sede</Label>
            <Select value={sedeFilter} onValueChange={setSedeFilter}>
              <SelectTrigger id="sede-filter">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sedes</SelectItem>
                {(sedesData || []).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nombreSede}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scrummaster-filter">Scrum Master</Label>
            <Select value={scrumMasterFilter} onValueChange={setScrumMasterFilter}>
              <SelectTrigger id="scrummaster-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(scrumMastersData || []).map(sm => (
                  <SelectItem key={sm.id} value={sm.id}>{sm.nombreScrumMaster}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipocontrato-filter">Tipo de Contrato</Label>
            <Select value={tipoContratoFilter} onValueChange={setTipoContratoFilter}>
              <SelectTrigger id="tipocontrato-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(tiposContratoData || []).map(tc => (
                  <SelectItem key={tc.id} value={tc.id}>{tc.tipoContrato}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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

    