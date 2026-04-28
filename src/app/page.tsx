'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Justification, TurnoNumber, TurnoStatus, TurnoStatuses } from '@/types';
import { TURNOS, getActiveTurno } from '@/types';
import { AttendanceSummary } from '@/components/attendance/AttendanceSummary';
import { EmployeeRow } from '@/components/attendance/EmployeeRow';
import { DatePicker } from '@/components/attendance/DatePicker';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow as UiTableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Save, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { AttendanceStatus } from '@/types';

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

  // Turno
  const [selectedTurno, setSelectedTurno] = useState<TurnoNumber>(() => getActiveTurno());
  const [pendingTurno, setPendingTurno] = useState<TurnoNumber | null>(null);

  // Data
  const [allTurnoData, setAllTurnoData] = useState<any[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, TurnoStatus>>(new Map());
  const [justifications, setJustifications] = useState<Map<string, Justification>>(new Map());
  const [initialJustifications, setInitialJustifications] = useState<Map<string, Justification>>(new Map());

  // Modal
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
    if (!userLoading && user?.role === 'admin') router.push('/admin');
    if (!userLoading && user?.role === 'scrum_master') router.push('/scrum');
  }, [user, userLoading, router]);

  useEffect(() => {
    Promise.all([apiFetch('/api/empleados'), apiFetch('/api/sedes?activo=true')])
      .then(([emps, sds]) => { setEmployees(emps); setSedes(sds); })
      .finally(() => setLoadingEmployees(false));
  }, []);

  const loadTurnoData = useCallback(async (date: Date) => {
    const fecha = format(date, 'yyyy-MM-dd');
    try {
      const [turnoData, justifs] = await Promise.all([
        apiFetch(`/api/asistencias-turno?fecha=${fecha}`),
        apiFetch(`/api/justificaciones?fecha=${fecha}`),
      ]);
      setAllTurnoData(turnoData);
      const justMap = new Map<string, Justification>();
      justifs.forEach((j: any) => {
        const t = j.turno ?? 0;
        justMap.set(`${j.dni}-${t}`, { employeeId: j.employee_id, date: fecha, type: j.tipo, notes: j.notas, turno: j.turno });
      });
      setJustifications(justMap);
      setInitialJustifications(new Map(justMap));
      setPendingChanges(new Map());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadTurnoData(selectedDate); }, [selectedDate, loadTurnoData]);

  useEffect(() => {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const str = new Intl.DateTimeFormat('es-ES', opts).format(selectedDate);
    setCurrentDate(str.charAt(0).toUpperCase() + str.slice(1));
  }, [selectedDate]);

  useEffect(() => { setCurrentPage(1); }, [selectedSede, nameFilter, dniFilter]);

  // Derived maps
  const turnoMap = useMemo(() => {
    const map = new Map<string, TurnoStatuses>();
    allTurnoData.forEach(r => {
      if (!map.has(r.dni)) map.set(r.dni, {});
      (map.get(r.dni) as any)[r.turno] = r.status;
    });
    return map;
  }, [allTurnoData]);

  const currentTurnoLoaded = useMemo(() => {
    const map = new Map<string, TurnoStatus>();
    allTurnoData.filter(r => r.turno === selectedTurno).forEach(r => map.set(r.dni, r.status as TurnoStatus));
    return map;
  }, [allTurnoData, selectedTurno]);

  const getEffectiveStatus = useCallback((dni: string): TurnoStatus | 'No Registrado' => {
    if (pendingChanges.has(dni)) return pendingChanges.get(dni)!;
    return currentTurnoLoaded.get(dni) ?? 'No Registrado';
  }, [pendingChanges, currentTurnoLoaded]);

  const hasUnsavedChanges = useMemo(() => {
    for (const [dni, status] of pendingChanges) {
      if (currentTurnoLoaded.get(dni) !== status) return true;
    }
    return false;
  }, [pendingChanges, currentTurnoLoaded]);

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
    tipoContrato: e.tipo_contrato ? { tipo: e.tipo_contrato } : undefined,
  })), [employees]);

  const filteredEmployees = useMemo(() => mappedEmployees.filter(e => {
    const sedeMatch = selectedSede === 'todos' || e.nombre_sede === selectedSede;
    const nameMatch = e.apellidosNombres?.toLowerCase().includes(nameFilter.toLowerCase());
    const dniMatch = e.dni?.includes(dniFilter);
    return e.activo !== false && sedeMatch && nameMatch && dniMatch;
  }), [mappedEmployees, selectedSede, nameFilter, dniFilter]);

  const inactiveOrdenes = useMemo(() => {
    const s = new Set<number>();
    employees.filter(e => e.activo === false && e.orden != null).forEach(e => s.add(parseInt(String(e.orden), 10)));
    return s;
  }, [employees]);

  const allWithGaps = useMemo(() => {
    const sorted = [...filteredEmployees].filter(e => e.orden != null).sort((a, b) => parseInt(String(a.orden)) - parseInt(String(b.orden)));
    const result: any[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const emp = sorted[i];
      const empOrden = parseInt(String(emp.orden), 10);
      if (i > 0) {
        const prevOrden = parseInt(String(sorted[i - 1].orden), 10);
        for (let gap = prevOrden + 1; gap < empOrden; gap++) {
          if (!inactiveOrdenes.has(gap)) result.push({ isGap: true, id: `gap-${gap}`, orden: gap });
        }
      }
      result.push(emp);
    }
    return result;
  }, [filteredEmployees, inactiveOrdenes]);

  const totalPages = Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const empStart = (currentPage - 1) * EMPLOYEES_PER_PAGE;
    let empCount = 0;
    const result: any[] = [];
    for (const item of allWithGaps) {
      if (item.isGap) {
        const prevPage = Math.floor((empCount - 1) / EMPLOYEES_PER_PAGE);
        const nextPage = Math.floor(empCount / EMPLOYEES_PER_PAGE);
        if ((prevPage === currentPage - 1 || nextPage === currentPage - 1) && empCount > empStart - EMPLOYEES_PER_PAGE) {
          result.push(item);
        }
      } else {
        if (empCount >= empStart && empCount < empStart + EMPLOYEES_PER_PAGE) result.push(item);
        empCount++;
        if (empCount >= empStart + EMPLOYEES_PER_PAGE) break;
      }
    }
    return result;
  }, [allWithGaps, currentPage]);

  const attendanceArray = useMemo(() =>
    filteredEmployees.map(emp => getEffectiveStatus(emp.id) as AttendanceStatus),
    [filteredEmployees, getEffectiveStatus]
  );

  // Handlers
  const handleStatusChange = (dni: string, status: TurnoStatus) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      currentTurnoLoaded.get(dni) === status ? next.delete(dni) : next.set(dni, status);
      return next;
    });
  };

  const handleJustificationSaved = async (justification: Justification & { turno?: TurnoNumber }) => {
    const t = justification.turno ?? selectedTurno;
    const emp = employees.find(e => e.dni === justification.employeeId);
    if (!emp) return;
    try {
      await apiFetch('/api/justificaciones', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: emp.id,
          fecha: format(selectedDate, 'yyyy-MM-dd'),
          tipo: justification.type,
          notas: justification.notes,
          turno: t,
        }),
      });
      const key = `${justification.employeeId}-${t}`;
      const saved = { ...justification, turno: t };
      setJustifications(prev => new Map(prev).set(key, saved));
      setInitialJustifications(prev => new Map(prev).set(key, saved));
      toast({ title: '✓ Justificación guardada' });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar justificación' });
    }
  };

  const handleTurnoChange = (turno: TurnoNumber) => {
    if (turno === selectedTurno) return;
    if (hasUnsavedChanges) { setPendingTurno(turno); setShowUnsavedModal(true); }
    else { setSelectedTurno(turno); setPendingChanges(new Map()); }
  };

  const handleDateChange = (date: Date) => {
    if (hasUnsavedChanges) { setPendingDate(date); setShowUnsavedModal(true); }
    else setSelectedDate(date);
  };

  const handleSaveAttendances = async () => {
    const changes: any[] = [];
    pendingChanges.forEach((status, dni) => {
      if (currentTurnoLoaded.get(dni) === status) return;
      const emp = employees.find(e => e.dni === dni);
      if (emp) changes.push({ employee_id: emp.id, status });
    });
    if (changes.length === 0) { toast({ title: 'Sin cambios' }); return; }
    setIsSaving(true);
    try {
      const fecha = format(selectedDate, 'yyyy-MM-dd');
      await apiFetch('/api/asistencias-turno/batch', { method: 'POST', body: JSON.stringify({ fecha, turno: selectedTurno, records: changes }) });
      await loadTurnoData(selectedDate);
      toast({ title: '✓ Cambios guardados', description: `${changes.length} registros guardados.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally { setIsSaving(false); }
  };

  const handleSaveAndContinue = async () => {
    await handleSaveAttendances();
    if (pendingDate) { setSelectedDate(pendingDate); setPendingDate(null); }
    else if (pendingTurno) { setSelectedTurno(pendingTurno); setPendingTurno(null); setPendingChanges(new Map()); }
    setShowUnsavedModal(false);
  };

  const handleDiscardAndContinue = () => {
    setPendingChanges(new Map());
    if (pendingDate) { setSelectedDate(pendingDate); setPendingDate(null); }
    else if (pendingTurno) { setSelectedTurno(pendingTurno); setPendingTurno(null); }
    setShowUnsavedModal(false);
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  if (!user || user.role === 'admin') return <div className="flex items-center justify-center min-h-screen"><p>Redirigiendo...</p></div>;

  const turnoLabel = TURNOS.find(t => t.turno === selectedTurno)?.label ?? '';

  const TurnoSelector = ({ className = '' }: { className?: string }) => (
    <div className={`flex gap-2 ${className}`}>
      {TURNOS.map(t => (
        <Button key={t.turno} variant={selectedTurno === t.turno ? 'default' : 'outline'}
          size="sm" onClick={() => handleTurnoChange(t.turno)}>
          {t.label}
        </Button>
      ))}
    </div>
  );

  const PaginationControls = ({ size = 'default' }: { size?: 'sm' | 'default' }) => totalPages > 1 ? (
    <div className="flex items-center justify-center gap-3">
      <Button variant="outline" size={size} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
        <ChevronLeft className="h-4 w-4" />{size === 'default' && <span className="ml-1">Anterior</span>}
      </Button>
      <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} ({filteredEmployees.length} empleados)</span>
      <Button variant="outline" size={size} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
        {size === 'default' && <span className="mr-1">Siguiente</span>}<ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm">
      <header className="bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 py-3 md:p-4">
          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-primary">Permanencia OTIN</h1>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveAttendances} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />{isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex md:hidden gap-2 mb-2">
            <Select value={selectedSede} onValueChange={setSelectedSede}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Todas las sedes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las sedes</SelectItem>
                {sedes.filter((s: any) => s.activo !== false).map(s => <SelectItem key={s.id} value={s.nombre_sede}>{s.nombre_sede}</SelectItem>)}
              </SelectContent>
            </Select>
            <DatePicker date={selectedDate} setDate={handleDateChange} />
          </div>
          <div className="flex md:hidden gap-1">
            {TURNOS.map(t => (
              <Button key={t.turno} size="sm" variant={selectedTurno === t.turno ? 'default' : 'outline'}
                className="flex-1 text-xs h-7" onClick={() => handleTurnoChange(t.turno)}>{t.short}</Button>
            ))}
          </div>
          {/* Desktop */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex-1" />
            <h1 className="text-2xl font-bold text-primary text-center">Permanencia OTIN</h1>
            <div className="flex-1 flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
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
          {/* Desktop top bar */}
          <div className="hidden md:flex justify-between items-center mb-4 gap-4">
            <h2 className="text-3xl font-bold">Lista de Personal</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><Label>Fecha:</Label><DatePicker date={selectedDate} setDate={handleDateChange} /></div>
              <div className="flex items-center gap-2">
                <Label>Sede:</Label>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas las sedes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las sedes</SelectItem>
                    {sedes.filter((s: any) => s.activo !== false).map(s => <SelectItem key={s.id} value={s.nombre_sede}>{s.nombre_sede}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAttendances} disabled={isSaving} className="min-w-[200px]">
                <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Registros'}
              </Button>
            </div>
          </div>

          {/* Turno selector (desktop) */}
          <div className="hidden md:flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground">Horario de registro:</span>
            <TurnoSelector />
            <span className="text-xs text-muted-foreground ml-auto">Registrando horario {turnoLabel}</span>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Input placeholder="Filtrar por apellidos y nombres..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="max-w-sm" />
            <Input placeholder="Filtrar por DNI..." value={dniFilter} onChange={e => setDniFilter(e.target.value)} className="max-w-xs" />
            {(nameFilter || dniFilter || selectedSede !== 'todos') && (
              <Button variant="outline" size="sm" onClick={() => { setNameFilter(''); setDniFilter(''); setSelectedSede('todos'); }}>
                <X className="mr-2 h-4 w-4" /> Limpiar filtros
              </Button>
            )}
          </div>

          {loadingEmployees && <div className="flex justify-center py-12"><p className="text-muted-foreground">Cargando empleados...</p></div>}

          {/* Top pagination */}
          <div className="py-3 mb-2"><PaginationControls size="sm" /></div>

          {/* Mobile list */}
          <div className="md:hidden space-y-2">
            {(() => {
              let empSeq = (currentPage - 1) * EMPLOYEES_PER_PAGE;
              return paginatedEmployees.map(item => {
                if (item.isGap) return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2 rounded border border-dashed border-border/40 bg-muted/20">
                    <span className="text-xs text-muted-foreground/50 w-6">{item.orden}</span>
                    <span className="text-xs text-muted-foreground/40 italic">— asiento vacío —</span>
                  </div>
                );
                const idx = empSeq++;
                return (
                  <EmployeeRow key={item.id} employee={item} currentTurno={selectedTurno}
                    turnoStatuses={turnoMap.get(item.id) ?? {}}
                    currentStatus={getEffectiveStatus(item.id)}
                    onStatusChange={handleStatusChange} index={idx}
                    currentJustification={justifications.get(`${item.id}-${selectedTurno}`) as any}
                    onJustificationSaved={handleJustificationSaved as any}
                    selectedDate={selectedDate} variant="mobile" />
                );
              });
            })()}
            <div className="py-4"><PaginationControls size="sm" /></div>
            <Button onClick={handleSaveAttendances} disabled={isSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Registros'}
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <UiTableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead className="text-center w-[500px]">Horario {turnoLabel} — Registro</TableHead>
                </UiTableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let empSeq = (currentPage - 1) * EMPLOYEES_PER_PAGE;
                  return paginatedEmployees.map(item => {
                    if (item.isGap) return (
                      <UiTableRow key={item.id} className="border-dashed bg-muted/10 hover:bg-muted/10">
                        <TableCell className="text-muted-foreground/40 text-xs py-2">{item.orden}</TableCell>
                        <TableCell className="text-muted-foreground/40 text-xs italic py-2" colSpan={2}>— asiento vacío —</TableCell>
                      </UiTableRow>
                    );
                    const idx = empSeq++;
                    return (
                      <EmployeeRow key={item.id} employee={item} currentTurno={selectedTurno}
                        turnoStatuses={turnoMap.get(item.id) ?? {}}
                        currentStatus={getEffectiveStatus(item.id)}
                        onStatusChange={handleStatusChange} index={idx}
                        currentJustification={justifications.get(`${item.id}-${selectedTurno}`) as any}
                        onJustificationSaved={handleJustificationSaved as any}
                        selectedDate={selectedDate} variant="desktop" />
                    );
                  });
                })()}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 py-4 px-4 border-t">
              <PaginationControls />
              <Button onClick={handleSaveAttendances} disabled={isSaving} className="min-w-[200px]">
                <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Registros'}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={showUnsavedModal} onOpenChange={(open) => { if (!open) setShowUnsavedModal(false); }}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Cambios sin guardar
            </DialogTitle>
            <DialogDescription>
              Tienes cambios pendientes para el horario {turnoLabel}. ¿Qué deseas hacer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleSaveAndContinue} disabled={isSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar y continuar'}
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndContinue} className="w-full">Descartar cambios</Button>
            <Button variant="outline" onClick={() => setShowUnsavedModal(false)} className="w-full">Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
