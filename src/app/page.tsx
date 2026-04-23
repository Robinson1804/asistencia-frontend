'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AttendanceStatus, Justification } from '@/types';
import { AttendanceSummary } from '@/components/attendance/AttendanceSummary';
import { EmployeeRow } from '@/components/attendance/EmployeeRow';
import { DatePicker } from '@/components/attendance/DatePicker';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/auth-context';
import { api, apiFetch } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow as UiTableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Save, UserCog, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const EMPLOYEES_PER_PAGE = 22;

export default function Home() {
  const { user, isLoading: userLoading, logout } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedSede, setSelectedSede] = useState('todos');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [nameFilter, setNameFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [initialAttendances, setInitialAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [justifications, setJustifications] = useState<Map<string, Justification>>(new Map());
  const [initialJustifications, setInitialJustifications] = useState<Map<string, Justification>>(new Map());

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
    if (!userLoading && user?.role === 'admin') router.push('/admin');
  }, [user, userLoading, router]);

  useEffect(() => {
    Promise.all([api.getEmpleados(), api.getSedes()])
      .then(([emps, sds]) => { setEmployees(emps); setSedes(sds); })
      .finally(() => setLoadingEmployees(false));
  }, []);

  useEffect(() => {
    const fetchAttendances = async () => {
      const fecha = format(selectedDate, 'yyyy-MM-dd');
      try {
        const [asistencias, justifs] = await Promise.all([
          apiFetch(`/api/asistencias?fecha=${fecha}`),
          apiFetch(`/api/justificaciones?fecha=${fecha}`),
        ]);
        const attMap = new Map<string, AttendanceStatus>();
        asistencias.forEach((a: any) => attMap.set(a.dni, a.status));
        setAttendances(new Map(attMap));
        setInitialAttendances(new Map(attMap));

        const justMap = new Map<string, Justification>();
        justifs.forEach((j: any) => justMap.set(j.dni, {
          ...j,
          employeeId: j.dni,
          type: j.tipo,
          notes: j.notas,
        }));
        setJustifications(new Map(justMap));
        setInitialJustifications(new Map(justMap));
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error al cargar datos' });
      }
    };
    fetchAttendances();
  }, [selectedDate]);

  useEffect(() => {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const str = new Intl.DateTimeFormat('es-ES', opts).format(selectedDate);
    setCurrentDate(str.charAt(0).toUpperCase() + str.slice(1));
  }, [selectedDate]);

  useEffect(() => { setCurrentPage(1); }, [selectedSede, nameFilter, dniFilter]);

  const mappedEmployees = useMemo(() => employees.map(e => ({
    ...e,
    id: e.dni,
    apellidosNombres: e.apellidos_nombres,
    sede: e.nombre_sede ? { nombre: e.nombre_sede } : undefined,
    proyecto: e.nombre_proyecto ? { nombre: e.nombre_proyecto } : undefined,
    modalidad: e.nombre_modalidad ? { nombre: e.nombre_modalidad } : undefined,
    coordinador: e.nombre_coordinador ? { nombre: e.nombre_coordinador } : undefined,
    scrumMaster: e.nombre_scrum_master ? { nombre: e.nombre_scrum_master } : undefined,
    division: e.nombre_division ? { nombre: e.nombre_division } : undefined,
  })), [employees]);

  const filteredEmployees = useMemo(() => mappedEmployees.filter(e => {
    const active = e.activo !== false;
    const sedeMatch = selectedSede === 'todos' || e.nombre_sede === selectedSede;
    const nameMatch = e.apellidosNombres?.toLowerCase().includes(nameFilter.toLowerCase());
    const dniMatch = e.dni?.includes(dniFilter);
    return active && sedeMatch && nameMatch && dniMatch;
  }), [mappedEmployees, selectedSede, nameFilter, dniFilter]);

  const totalPages = Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE);

  type GapRow = { isGap: true; orden: number; id: string };
  type DisplayRow = (typeof filteredEmployees[0] & { isGap: false }) | GapRow;

  // Ordenes ocupados por empleados inactivos — no deben generar gap visual.
  const inactiveOrdenes = useMemo(() => {
    const set = new Set<number>();
    employees.forEach(e => {
      if (e.activo === false && e.orden) set.add(parseInt(e.orden, 10));
    });
    return set;
  }, [employees]);

  // Inserta filas vacías donde hay saltos en el número de orden.
  // Solo cuando no hay filtro de nombre/DNI (carece de sentido en búsqueda).
  // Los ordenes de empleados inactivos no generan gap: ellos tenían ese puesto.
  const allWithGaps = useMemo((): DisplayRow[] => {
    if (nameFilter || dniFilter) return filteredEmployees.map(e => ({ ...e, isGap: false as const }));
    const result: DisplayRow[] = [];
    filteredEmployees.forEach((emp, i) => {
      const cur = parseInt(emp.orden ?? '0', 10);
      const prev = i > 0 ? parseInt(filteredEmployees[i - 1].orden ?? '0', 10) : cur;
      if (i > 0) {
        for (let g = prev + 1; g < cur; g++) {
          if (!inactiveOrdenes.has(g)) {
            result.push({ isGap: true, orden: g, id: `gap-${g}` });
          }
        }
      }
      result.push({ ...emp, isGap: false });
    });
    return result;
  }, [filteredEmployees, nameFilter, dniFilter, inactiveOrdenes]);

  // Pagina por cantidad de empleados reales, pero incluye los gaps del rango.
  const paginatedEmployees = useMemo((): DisplayRow[] => {
    const empStart = (currentPage - 1) * EMPLOYEES_PER_PAGE;
    const empEnd = empStart + EMPLOYEES_PER_PAGE;
    let empCount = 0;
    let startIdx = -1;
    let endIdx = allWithGaps.length;
    for (let i = 0; i < allWithGaps.length; i++) {
      const item = allWithGaps[i];
      if (!item.isGap) {
        if (empCount === empStart && startIdx === -1) startIdx = i;
        empCount++;
        if (empCount === empEnd) { endIdx = i + 1; break; }
      }
    }
    if (startIdx === -1) return [];
    return allWithGaps.slice(startIdx, endIdx);
  }, [allWithGaps, currentPage]);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setAttendances(prev => new Map(prev).set(employeeId, status));
  };

  const handleJustificationSaved = (justification: Justification) => {
    setJustifications(prev => new Map(prev).set(justification.employeeId, justification));
    setAttendances(prev => {
      const current = prev.get(justification.employeeId);
      const justified: AttendanceStatus = current === 'Tardanza' ? 'Tardanza Justificada' : 'Falta Justificada';
      return new Map(prev).set(justification.employeeId, justified);
    });
  };

  const handleSaveAttendances = async () => {
    const changes: any[] = [];

    attendances.forEach((status, dni) => {
      if (initialAttendances.get(dni) === status) return;
      const emp = employees.find(e => e.dni === dni);
      if (emp) changes.push({ employee_id: emp.id, status });
    });

    const justChanges: any[] = [];
    justifications.forEach((j, dni) => {
      if (initialJustifications.has(dni)) return;
      const emp = employees.find(e => e.dni === dni);
      if (emp) justChanges.push({ employee_id: emp.id, fecha: format(selectedDate, 'yyyy-MM-dd'), tipo: j.type || 'Justificación', notas: j.notes || '' });
    });

    if (changes.length === 0 && justChanges.length === 0) {
      toast({ title: 'Sin cambios' });
      return;
    }

    setIsSaving(true);
    try {
      const fecha = format(selectedDate, 'yyyy-MM-dd');
      if (changes.length > 0) {
        await apiFetch('/api/asistencias/batch', { method: 'POST', body: JSON.stringify({ fecha, records: changes }) });
        setSavingProgress(50);
      }
      if (justChanges.length > 0) {
        await Promise.all(justChanges.map(j => api.createJustificacion(j)));
      }
      setInitialAttendances(new Map(attendances));
      setInitialJustifications(new Map(justifications));
      setSavingProgress(100);
      toast({ title: '✓ Cambios guardados', description: `${changes.length} registros guardados.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally {
      setIsSaving(false);
      setSavingProgress(0);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    for (const [dni, status] of attendances) {
      if (initialAttendances.get(dni) !== status) return true;
    }
    for (const [dni] of justifications) {
      if (!initialJustifications.has(dni)) return true;
    }
    return false;
  }, [attendances, initialAttendances, justifications, initialJustifications]);

  const handleDateChange = (date: Date) => {
    if (hasUnsavedChanges) {
      setPendingDate(date);
      setShowUnsavedModal(true);
    } else {
      setSelectedDate(date);
    }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveAttendances();
    if (pendingDate) {
      setSelectedDate(pendingDate);
      setPendingDate(null);
    }
    setShowUnsavedModal(false);
  };

  const handleDiscardAndContinue = () => {
    if (pendingDate) {
      setSelectedDate(pendingDate);
      setPendingDate(null);
    }
    setShowUnsavedModal(false);
  };

  const handleLogout = () => { logout(); router.push('/login'); };
  const attendanceArray = Array.from(attendances.values());

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  if (!user || user.role === 'admin') return <div className="flex items-center justify-center min-h-screen"><p>Redirigiendo...</p></div>;

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm">
      <header className="bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 py-3 md:p-4">
          <div className="flex md:hidden items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-primary">Permanencia OTIN</h1>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveAttendances} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex md:hidden gap-2 mb-2">
            <Select value={selectedSede} onValueChange={setSelectedSede}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Todas las sedes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sedes</SelectItem>
                {sedes.filter((s: any) => s.activo !== false).map(s => <SelectItem key={s.id} value={s.nombre_sede}>{s.nombre_sede}</SelectItem>)}
              </SelectContent>
            </Select>
            <DatePicker date={selectedDate} setDate={handleDateChange} />
          </div>
          <div className="hidden md:flex justify-between items-center">
            <div className="flex-1" />
            <h1 className="text-2xl font-bold text-primary text-center">Permanencia OTIN</h1>
            <div className="flex-1 flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 md:p-8">
        <div className="mb-4 md:mb-8 text-center md:text-left">
          {currentDate && <p className="text-sm md:text-lg text-muted-foreground">Registrando para el {currentDate}</p>}
        </div>

        <section className="mb-6 md:mb-8">
          <AttendanceSummary attendances={attendanceArray} totalEmployees={filteredEmployees.length} />
        </section>

        <Separator className="my-6 md:my-8 bg-border/50" />

        <section>
          <div className="hidden md:flex justify-between items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold">Lista de Personal</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Fecha:</Label>
                <DatePicker date={selectedDate} setDate={handleDateChange} />
              </div>
              <div className="flex items-center gap-2">
                <Label>Sede:</Label>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las sedes</SelectItem>
                    {sedes.filter((s: any) => s.activo !== false).map(s => <SelectItem key={s.id} value={s.nombre_sede}>{s.nombre_sede}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAttendances} disabled={isSaving} className="min-w-[200px]">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? `Guardando ${savingProgress}%` : 'Guardar Registros'}
              </Button>
            </div>
          </div>

          <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Input placeholder="Filtrar por apellidos y nombres..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="max-w-sm" />
            <Input placeholder="Filtrar por DNI..." value={dniFilter} onChange={e => setDniFilter(e.target.value)} className="max-w-xs" />
            {(nameFilter || dniFilter || selectedSede !== 'todos') && (
              <Button variant="outline" size="sm" onClick={() => { setNameFilter(''); setDniFilter(''); setSelectedSede('todos'); }}>
                <X className="mr-2 h-4 w-4" /> Limpiar filtros
              </Button>
            )}
          </div>

          {loadingEmployees && <div className="flex justify-center py-12"><p className="text-muted-foreground">Cargando empleados...</p></div>}

          {/* Vista móvil */}
          <div className="md:hidden space-y-2">
            {(() => {
              let empSeq = (currentPage - 1) * EMPLOYEES_PER_PAGE;
              return paginatedEmployees.map(item => {
                if (item.isGap) {
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-2 rounded border border-dashed border-border/40 bg-muted/20">
                      <span className="text-xs text-muted-foreground/50 w-6">{item.orden}</span>
                      <span className="text-xs text-muted-foreground/40 italic">— asiento vacío —</span>
                    </div>
                  );
                }
                const idx = empSeq++;
                return (
                  <EmployeeRow
                    key={item.id}
                    employee={item}
                    currentStatus={attendances.get(item.id) || 'No Registrado'}
                    onStatusChange={handleStatusChange}
                    index={idx}
                    currentJustification={justifications.get(item.id)}
                    onJustificationSaved={handleJustificationSaved}
                    selectedDate={selectedDate}
                    variant="mobile"
                  />
                );
              });
            })()}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Pág. {currentPage}/{totalPages} ({filteredEmployees.length})</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Vista desktop */}
          <div className="hidden md:block rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <UiTableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead className="text-center w-[440px]">Estado del Registro</TableHead>
                </UiTableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let empSeq = (currentPage - 1) * EMPLOYEES_PER_PAGE;
                  return paginatedEmployees.map(item => {
                    if (item.isGap) {
                      return (
                        <UiTableRow key={item.id} className="border-dashed bg-muted/10 hover:bg-muted/10">
                          <TableCell className="text-muted-foreground/40 text-xs py-2">{item.orden}</TableCell>
                          <TableCell className="text-muted-foreground/40 text-xs italic py-2" colSpan={2}>
                            — asiento vacío —
                          </TableCell>
                        </UiTableRow>
                      );
                    }
                    const idx = empSeq++;
                    return (
                      <EmployeeRow
                        key={item.id}
                        employee={item}
                        currentStatus={attendances.get(item.id) || 'No Registrado'}
                        onStatusChange={handleStatusChange}
                        index={idx}
                        currentJustification={justifications.get(item.id)}
                        onJustificationSaved={handleJustificationSaved}
                        selectedDate={selectedDate}
                        variant="desktop"
                      />
                    );
                  });
                })()}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4 border-t">
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} ({filteredEmployees.length} empleados)</span>
                <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Dialog open={showUnsavedModal} onOpenChange={(open) => { if (!open) setShowUnsavedModal(false); }}>
        <DialogContent className="max-w-[360px] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cambios sin guardar
            </DialogTitle>
            <DialogDescription>
              Tienes registros modificados que no se han guardado. ¿Qué deseas hacer antes de cambiar de fecha?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleSaveAndContinue} disabled={isSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndContinue} className="w-full">
              Descartar cambios
            </Button>
            <Button variant="outline" onClick={() => setShowUnsavedModal(false)} className="w-full">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
