'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiData } from '@/hooks/use-api-data';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortCol = 'apellidosNombres' | 'dni' | 'proyecto' | 'sede' | 'scrumMaster';
type SortDir = 'asc' | 'desc';

export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [nameFilter, setNameFilter] = useState(searchParams.get('name') || '');
  const [dniFilter, setDniFilter] = useState(searchParams.get('dni') || '');
  const [proyectoFilter, setProyectoFilter] = useState(searchParams.get('proyecto') || 'todos');
  const [sedeFilter, setSedeFilter] = useState(searchParams.get('sede') || 'todos');
  const [scrumMasterFilter, setScrumMasterFilter] = useState(searchParams.get('scrumMaster') || 'todos');
  const [tipoContratoFilter, setTipoContratoFilter] = useState(searchParams.get('tipoContrato') || 'todos');
  const [sortColumn, setSortColumn] = useState<SortCol>((searchParams.get('sortBy') as SortCol) || 'apellidosNombres');
  const [sortDirection, setSortDirection] = useState<SortDir>((searchParams.get('sortDir') as SortDir) || 'asc');

  const { data: proyectosData } = useApiData<any>('/api/proyectos');
  const { data: sedesData } = useApiData<any>('/api/sedes?activo=true');
  const { data: scrumMastersData } = useApiData<any>('/api/scrum-masters');
  const { data: tiposContratoData } = useApiData<any>('/api/tipos-contrato');

  useEffect(() => {
    api.getEmpleados().then(setEmployees).finally(() => setLoadingEmployees(false));
  }, []);

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
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [nameFilter, dniFilter, proyectoFilter, sedeFilter, scrumMasterFilter, tipoContratoFilter, sortColumn, sortDirection]);

  const handleSort = (col: SortCol) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
  };

  const filtered = useMemo(() => {
    return employees
      .filter(e => {
        const nm = e.apellidos_nombres?.toLowerCase().includes(nameFilter.toLowerCase());
        const dm = e.dni?.includes(dniFilter);
        const pm = proyectoFilter === 'todos' || e.proyecto_id === proyectoFilter;
        const sm = sedeFilter === 'todos' || e.sede_id === sedeFilter;
        const scm = scrumMasterFilter === 'todos' || e.scrum_master_id === scrumMasterFilter;
        const tm = tipoContratoFilter === 'todos' || e.tipo_contrato_id === tipoContratoFilter;
        return nm && dm && pm && sm && scm && tm;
      })
      .sort((a, b) => {
        let av = '', bv = '';
        if (sortColumn === 'apellidosNombres') { av = a.apellidos_nombres || ''; bv = b.apellidos_nombres || ''; }
        else if (sortColumn === 'dni') { av = a.dni || ''; bv = b.dni || ''; }
        else if (sortColumn === 'proyecto') { av = a.nombre_proyecto || ''; bv = b.nombre_proyecto || ''; }
        else if (sortColumn === 'sede') { av = a.nombre_sede || ''; bv = b.nombre_sede || ''; }
        else if (sortColumn === 'scrumMaster') { av = a.nombre_scrum_master || ''; bv = b.nombre_scrum_master || ''; }
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [employees, nameFilter, dniFilter, proyectoFilter, sedeFilter, scrumMasterFilter, tipoContratoFilter, sortColumn, sortDirection]);

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await api.deleteEmpleado(employeeToDelete.id);
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
      toast({ title: 'Empleado eliminado', description: `${employeeToDelete.apellidos_nombres} ha sido eliminado.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    } finally { setEmployeeToDelete(null); }
  };

  const handleExport = () => {
    const data = filtered.map(e => ({
      'Apellidos y Nombres': e.apellidos_nombres,
      'DNI': e.dni,
      'Email': e.email || '-',
      'Teléfono': e.telefono || '-',
      'Proyecto': e.nombre_proyecto || '-',
      'Scrum Master': e.nombre_scrum_master || '-',
      'División': e.nombre_division || '-',
      'Sede': e.nombre_sede || '-',
      'Modalidad': e.nombre_modalidad || '-',
      'Tipo Contrato': e.tipo_contrato || '-',
      'Estado': e.activo ? 'Activo' : 'Inactivo',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSX.writeFile(wb, `Empleados_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast({ title: 'Exportación exitosa', description: `${data.length} empleados exportados.` });
  };

  const renderSort = (col: SortCol) => sortColumn === col ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />) : null;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={() => router.push('/admin/employees/new')}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Empleado
          </Button>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-lg bg-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Buscar por Apellidos y Nombres</Label>
            <Input placeholder="Ej: Juan Pérez..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Buscar por DNI</Label>
            <Input placeholder="Ej: 12345678..." value={dniFilter} onChange={e => setDniFilter(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={proyectoFilter} onValueChange={setProyectoFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(proyectosData || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.codigo_proyecto} - {p.nombre_proyecto}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sede</Label>
            <Select value={sedeFilter} onValueChange={setSedeFilter}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {(sedesData || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_sede}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scrum Master</Label>
            <Select value={scrumMasterFilter} onValueChange={setScrumMasterFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(scrumMastersData || []).map((sm: any) => <SelectItem key={sm.id} value={sm.id}>{sm.nombre_scrum_master}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <Select value={tipoContratoFilter} onValueChange={setTipoContratoFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(tiposContratoData || []).map((tc: any) => <SelectItem key={tc.id} value={tc.id}>{tc.tipo_contrato}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Button variant="ghost" onClick={() => handleSort('apellidosNombres')} className="px-0 flex items-center">Apellidos y Nombres {renderSort('apellidosNombres')}</Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('dni')} className="px-0 flex items-center">DNI {renderSort('dni')}</Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('scrumMaster')} className="px-0 flex items-center">Scrum Master {renderSort('scrumMaster')}</Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('proyecto')} className="px-0 flex items-center">Proyecto {renderSort('proyecto')}</Button></TableHead>
              <TableHead><Button variant="ghost" onClick={() => handleSort('sede')} className="px-0 flex items-center">Sede {renderSort('sede')}</Button></TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingEmployees ? (
              <TableRow><TableCell colSpan={6} className="text-center">Cargando empleados...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center">No se encontraron empleados.</TableCell></TableRow>
            ) : filtered.map(emp => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.apellidos_nombres}</TableCell>
                <TableCell>{emp.dni}</TableCell>
                <TableCell>{emp.nombre_scrum_master || 'N/A'}</TableCell>
                <TableCell>{emp.nombre_proyecto || 'N/A'}</TableCell>
                <TableCell>{emp.nombre_sede || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/employees/${emp.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEmployeeToDelete(emp)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esto desactivará al empleado <span className="font-bold">{employeeToDelete?.apellidos_nombres}</span>.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
