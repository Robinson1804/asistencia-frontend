'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Justification, TurnoNumber, TurnoStatus, TurnoStatuses } from '@/types';
import { TURNOS, getActiveTurno, computeDailyStatus } from '@/types';
import { EmployeeRow } from '@/components/attendance/EmployeeRow';
import { DatePicker } from '@/components/attendance/DatePicker';
import { useAuthContext } from '@/context/auth-context';
import { apiFetch } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow as UiTableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Save, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const EMPLOYEES_PER_PAGE = 22;

export default function ScrumPage() {
  const { user, logout } = useAuthContext();
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

  const [selectedTurno, setSelectedTurno] = useState<TurnoNumber>(() => getActiveTurno());
  const [allTurnoData, setAllTurnoData] = useState<any[]>([]);
  const [justifications, setJustifications] = useState<Map<string, Justification>>(new Map());
  const [initialJustifications, setInitialJustifications] = useState<Map<string, Justification>>(new Map());

  const scrumMasterId = user?.scrumMasterId;

  useEffect(() => {
    if (!scrumMasterId) return;
    Promise.all([
      apiFetch(`/api/empleados?scrum_master_id=${scrumMasterId}`),
      apiFetch('/api/sedes?activo=true'),
    ])
      .then(([emps, sds]) => { setEmployees(emps); setSedes(sds); })
      .finally(() => setLoadingEmployees(false));
  }, [scrumMasterId]);

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
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadTurnoData(selectedDate); }, [selectedDate, loadTurnoData]);

  useEffect(() => {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const str = new Intl.DateTimeFormat('es-ES', opts).format(selectedDate);
    setCurrentDate(str.charAt(0).toUpperCase() + str.slice(1));
  }, [selectedDate]);

  useEffect(() => { setCurrentPage(1); }, [selectedSede, nameFilter, dniFilter, selectedTurno]);

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

  const getEffectiveStatus = useCallback((dni: string): TurnoStatus | 'No Registrado' =>
    currentTurnoLoaded.get(dni) ?? 'No Registrado',
    [currentTurnoLoaded]
  );

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

  const totalPages = Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * EMPLOYEES_PER_PAGE;
    return filteredEmployees.slice(start, start + EMPLOYEES_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  // Summary counts
  const summaryStats = useMemo(() => {
    const ts = filteredEmployees.map(e => turnoMap.get(e.id) ?? {});
    const statuses = ts.map(s => computeDailyStatus(s)).filter(Boolean);
    return {
      presente: statuses.filter(s => s === 'Presente').length,
      tardanza: statuses.filter(s => s === 'Tardanza').length,
      falta: statuses.filter(s => s === 'Falta').length,
      sinRegistro: filteredEmployees.length - statuses.length,
    };
  }, [filteredEmployees, turnoMap]);

  const hasNewJustifications = useMemo(() => {
    for (const [key] of justifications) {
      if (!initialJustifications.has(key)) return true;
    }
    return false;
  }, [justifications, initialJustifications]);

  const handleJustificationSaved = (justification: Justification & { turno?: TurnoNumber }) => {
    const t = justification.turno ?? selectedTurno;
    setJustifications(prev => new Map(prev).set(`${justification.employeeId}-${t}`, { ...justification, turno: t }));
  };

  const handleSaveJustifications = async () => {
    const justChanges: any[] = [];
    justifications.forEach((j, key) => {
      if (initialJustifications.has(key)) return;
      const emp = employees.find(e => e.dni === j.employeeId);
      if (emp) justChanges.push({ employee_id: emp.id, fecha: format(selectedDate, 'yyyy-MM-dd'), tipo: j.type, notas: j.notes, turno: j.turno ?? selectedTurno });
    });
    if (justChanges.length === 0) { toast({ title: 'Sin justificaciones nuevas' }); return; }
    setIsSaving(true);
    try {
      await Promise.all(justChanges.map(j => apiFetch('/api/justificaciones', { method: 'POST', body: JSON.stringify(j) })));
      await loadTurnoData(selectedDate);
      toast({ title: '✓ Justificaciones guardadas', description: `${justChanges.length} justificaciones guardadas.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally { setIsSaving(false); }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  const turnoLabel = TURNOS.find(t => t.turno === selectedTurno)?.label ?? '';

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
            <h1 className="text-lg font-bold text-primary">Asistencia — Scrum</h1>
            <div className="flex items-center gap-2">
              {hasNewJustifications && (
                <Button size="sm" onClick={handleSaveJustifications} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />{isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              )}
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
            <DatePicker date={selectedDate} setDate={setSelectedDate} />
          </div>
          <div className="flex md:hidden gap-1">
            {TURNOS.map(t => (
              <Button key={t.turno} size="sm" variant={selectedTurno === t.turno ? 'default' : 'outline'}
                className="flex-1 text-xs h-7" onClick={() => setSelectedTurno(t.turno)}>{t.short}</Button>
            ))}
          </div>
          {/* Desktop */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex-1" />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">Asistencia — Scrum Master</h1>
              <p className="text-xs text-muted-foreground">Vista de solo lectura · Solo puede agregar justificaciones</p>
            </div>
            <div className="flex-1 flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 md:p-8">
        <div className="mb-4 text-center md:text-left">
          {currentDate && <p className="text-sm md:text-lg text-muted-foreground">{currentDate}</p>}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Presente', value: summaryStats.presente, cls: 'text-green-600' },
            { label: 'Tardanza', value: summaryStats.tardanza, cls: 'text-yellow-600' },
            { label: 'Falta', value: summaryStats.falta, cls: 'text-red-600' },
            { label: 'Sin registro', value: summaryStats.sinRegistro, cls: 'text-muted-foreground' },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-lg border p-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${stat.cls}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Separator className="my-6 bg-border/50" />

        <section>
          {/* Desktop top bar */}
          <div className="hidden md:flex justify-between items-center mb-4 gap-4">
            <h2 className="text-3xl font-bold">Lista de Personal</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><Label>Fecha:</Label><DatePicker date={selectedDate} setDate={setSelectedDate} /></div>
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
              {hasNewJustifications && (
                <Button onClick={handleSaveJustifications} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Justificaciones'}
                </Button>
              )}
            </div>
          </div>

          {/* Turno selector (desktop) */}
          <div className="hidden md:flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground">Ver horario:</span>
            <div className="flex gap-2">
              {TURNOS.map(t => (
                <Button key={t.turno} variant={selectedTurno === t.turno ? 'default' : 'outline'}
                  size="sm" onClick={() => setSelectedTurno(t.turno)}>
                  {t.label}
                </Button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">Visualizando horario {turnoLabel}</span>
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
            {paginatedEmployees.map((item, idx) => (
              <EmployeeRow key={item.id} employee={item} currentTurno={selectedTurno}
                turnoStatuses={turnoMap.get(item.id) ?? {}}
                currentStatus={getEffectiveStatus(item.id)}
                onStatusChange={() => {}}
                index={(currentPage - 1) * EMPLOYEES_PER_PAGE + idx}
                currentJustification={justifications.get(`${item.id}-${selectedTurno}`) as any}
                onJustificationSaved={handleJustificationSaved as any}
                selectedDate={selectedDate} variant="mobile" readOnly />
            ))}
            <div className="py-4"><PaginationControls size="sm" /></div>
            {hasNewJustifications && (
              <Button onClick={handleSaveJustifications} disabled={isSaving} className="w-full">
                <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Justificaciones'}
              </Button>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <UiTableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead className="text-center w-[300px]">Estado — Horario {turnoLabel}</TableHead>
                </UiTableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((item, idx) => (
                  <EmployeeRow key={item.id} employee={item} currentTurno={selectedTurno}
                    turnoStatuses={turnoMap.get(item.id) ?? {}}
                    currentStatus={getEffectiveStatus(item.id)}
                    onStatusChange={() => {}}
                    index={(currentPage - 1) * EMPLOYEES_PER_PAGE + idx}
                    currentJustification={justifications.get(`${item.id}-${selectedTurno}`) as any}
                    onJustificationSaved={handleJustificationSaved as any}
                    selectedDate={selectedDate} variant="desktop" readOnly />
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 py-4 px-4 border-t">
              <PaginationControls />
              {hasNewJustifications && (
                <Button onClick={handleSaveJustifications} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />{isSaving ? 'Guardando...' : 'Guardar Justificaciones'}
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
