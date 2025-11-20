
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AttendanceStatus, Employee, Sede, Justification } from '@/types';
import { AttendanceSummary } from '@/components/attendance/AttendanceSummary';
import { EmployeeRow } from '@/components/attendance/EmployeeRow';
import { DatePicker } from '@/components/attendance/DatePicker';
import { Separator } from '@/components/ui/separator';
import { useAuth, useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, writeBatch, Timestamp, query, where, getDocs, doc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow as UiTableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Save, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [currentDate, setCurrentDate] = useState('');
  const firestore = useFirestore();
  const [selectedSede, setSelectedSede] = useState<string>('todos');
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [nameFilter, setNameFilter] = useState('');
  const [dniFilter, setDniFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const EMPLOYEES_PER_PAGE = 22;

  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'empleados'), orderBy('orden'));
  }, [firestore]);

  const { data: employeesData, isLoading: loadingEmployees } = useCollection<Employee>(employeesQuery);

  const sedesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sedes');
  }, [firestore]);

  const { data: sedesData, isLoading: loadingSedes } = useCollection<Sede>(sedesQuery);

  const employees: Employee[] = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.map((emp) => ({ ...emp, id: emp.dni }));
  }, [employeesData]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      // Solo mostrar empleados activos
      const isActive = employee.activo !== false;
      const sedeMatch = selectedSede === 'todos' || employee.sede?.nombre === selectedSede;
      const nameMatch = employee.apellidosNombres.toLowerCase().includes(nameFilter.toLowerCase());
      const dniMatch = employee.dni.includes(dniFilter);
      return isActive && sedeMatch && nameMatch && dniMatch;
    });
  }, [employees, selectedSede, nameFilter, dniFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSede, nameFilter, dniFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE;
    const endIndex = startIndex + EMPLOYEES_PER_PAGE;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, currentPage]);

  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [initialAttendances, setInitialAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [justifications, setJustifications] = useState<Map<string, Justification>>(new Map());
  const [initialJustifications, setInitialJustifications] = useState<Map<string, Justification>>(new Map());

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
    if (!isUserDataLoading && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
      }
    }
  }, [user, userLoading, router, userData, isUserDataLoading]);


  useEffect(() => {
    const fetchAttendancesForDate = async () => {
      if (!firestore) return;

      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      // Fetch attendances
      const attendanceQuery = query(
        collection(firestore, 'asistencias'),
        where('timestamp', '>=', Timestamp.fromDate(startOfSelectedDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfSelectedDay))
      );
      
      // Fetch justifications
      const justificationQuery = query(
        collection(firestore, 'justificaciones'),
        where('date', '==', Timestamp.fromDate(startOfSelectedDay))
      );

      try {
        const [attendanceSnapshot, justificationSnapshot] = await Promise.all([
          getDocs(attendanceQuery),
          getDocs(justificationQuery),
        ]);

        const todaysAttendances = new Map<string, AttendanceStatus>();
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data() as { employeeId: string; status: AttendanceStatus };
          todaysAttendances.set(data.employeeId, data.status);
        });
        setAttendances(new Map(todaysAttendances));
        setInitialAttendances(new Map(todaysAttendances));

        const todaysJustifications = new Map<string, Justification>();
        justificationSnapshot.forEach((doc) => {
            const data = doc.data() as Justification;
            todaysJustifications.set(data.employeeId, {...data, id: doc.id});
        });
        setJustifications(new Map(todaysJustifications));
        setInitialJustifications(new Map(todaysJustifications));

      } catch (error) {
        console.error('Error fetching data: ', error);
        toast({
          variant: 'destructive',
          title: 'Error al cargar datos',
          description: 'No se pudieron cargar los registros de la fecha seleccionada.',
        });
      }
    };

    fetchAttendancesForDate();
  }, [firestore, selectedDate, toast]);

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(selectedDate);
    setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
  }, [selectedDate]);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setAttendances((prevAttendances) => new Map(prevAttendances).set(employeeId, status));
  };
  
  const handleJustificationSaved = (justification: Justification) => {
    setJustifications(prev => new Map(prev).set(justification.employeeId, justification));
    // No toast here, will be saved on batch commit
  }

  const handleSaveAttendances = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }

    // Create a Set of employee IDs on the current page for quick lookup
    const currentPageEmployeeIds = new Set(paginatedEmployees.map(emp => emp.id));

    const attendanceChanges = new Map<string, AttendanceStatus>();
    attendances.forEach((status, employeeId) => {
      // Only save changes for employees on the current page
      if (currentPageEmployeeIds.has(employeeId) && initialAttendances.get(employeeId) !== status) {
        attendanceChanges.set(employeeId, status);
      }
    });

    const justificationChanges = new Map<string, Justification>();
    justifications.forEach((justification, employeeId) => {
        // Only save changes for employees on the current page
        // New justifications won't have an ID yet
        if (currentPageEmployeeIds.has(employeeId) && (!initialJustifications.has(employeeId) || !justification.id)) {
            justificationChanges.set(employeeId, justification);
        }
    });

    if (attendanceChanges.size === 0 && justificationChanges.size === 0) {
      toast({ title: 'Sin cambios', description: 'No hay nuevas asistencias o justificaciones para guardar en esta página.' });
      return;
    }

    setIsSaving(true);

    try {
      const attendanceDate = startOfDay(selectedDate);
      const attendanceTimestamp = Timestamp.fromDate(attendanceDate);
      const dateStr = attendanceDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // --- OPTIMIZED: Use composite document IDs instead of queries ---
      // Document ID format: {employeeId}_{YYYY-MM-DD}
      // This eliminates the need for queries and 'in' operator limitations

      const batches: any[] = [];
      let currentBatch = writeBatch(firestore);
      let operationCount = 0;
      const MAX_BATCH_SIZE = 500;

      // Handle Attendance Changes with composite IDs
      if (attendanceChanges.size > 0) {
        attendanceChanges.forEach((status, employeeId) => {
          const compositeId = `${employeeId}_${dateStr}`;
          const docRef = doc(firestore, 'asistencias', compositeId);

          const payload = {
            employeeId,
            status,
            timestamp: attendanceTimestamp,
            updatedAt: Timestamp.now(),
          };

          currentBatch.set(docRef, payload, { merge: true });
          operationCount++;

          // Create new batch if we hit the limit
          if (operationCount >= MAX_BATCH_SIZE) {
            batches.push(currentBatch);
            currentBatch = writeBatch(firestore);
            operationCount = 0;
          }
        });
      }

      // Handle Justification Changes
      justificationChanges.forEach((justification) => {
        const docRef = doc(collection(firestore, 'justificaciones'));
        currentBatch.set(docRef, { ...justification, createdAt: serverTimestamp() });
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          batches.push(currentBatch);
          currentBatch = writeBatch(firestore);
          operationCount = 0;
        }
      });

      // Add the last batch if it has operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Commit all batches sequentially with progress feedback
      const totalBatches = batches.length;
      for (let i = 0; i < totalBatches; i++) {
        await batches[i].commit();
        const progress = ((i + 1) / totalBatches) * 100;
        setSavingProgress(Math.round(progress));
      }

      setInitialAttendances(new Map(attendances));
      setInitialJustifications(new Map(justifications));
      setSavingProgress(0);

      toast({
        title: '✓ Cambios guardados exitosamente',
        description: `Se guardaron ${attendanceChanges.size} registros de asistencia${justificationChanges.size > 0 ? ` y ${justificationChanges.size} justificaciones` : ''}.`,
      });
    } catch (error) {
      console.error('Error writing batch: ', error);
      setSavingProgress(0);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
      setSavingProgress(0);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const attendanceArray = Array.from(attendances.values());

  if (userLoading || isUserDataLoading || !user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background/80">
        <p>Cargando...</p>
      </div>
    );
  }

  // Prevent rendering if user is an admin (redirect will handle it)
  if (userData.role === 'admin') {
    return <div className="flex items-center justify-center min-h-screen"><p>Redirigiendo al panel de administrador...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm">
      <header className="bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-3 py-3 md:p-4">
          <div className="flex md:hidden items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-primary font-headline tracking-tight">Permanencia OTIN</h1>
            <div className="flex items-center gap-2">
              {userData?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Panel de Administrador">
                    <UserCog className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} aria-label="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="md:hidden text-xs text-muted-foreground text-center">
            {user.email}
          </div>

          <div className="hidden md:flex justify-between items-center">
            <div className="flex-1"></div>
            <h1 className="text-2xl font-bold text-primary font-headline tracking-tight text-center">Permanencia OTIN</h1>
            <div className="flex-1 flex items-center justify-end gap-4">
              {userData?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="icon" aria-label="Panel de Administrador">
                    <UserCog className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
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
          <div className="md:hidden space-y-4 mb-6">
            <h2 className="text-2xl font-bold font-headline text-center">Lista de Personal</h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date-filter-mobile" className="text-xs font-medium">Fecha</Label>
                <DatePicker date={selectedDate} setDate={setSelectedDate} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sede-filter-mobile" className="text-xs font-medium">Sede</Label>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-full" id="sede-filter-mobile">
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las sedes</SelectItem>
                    {loadingSedes ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      (sedesData || []).map((sede) => (
                        <SelectItem key={sede.id} value={sede.nombreSede}>
                          {sede.nombreSede}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold font-headline text-center md:text-left">Lista de Personal</h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="date-filter">Fecha:</Label>
                <DatePicker date={selectedDate} setDate={setSelectedDate} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sede-filter">Sede:</Label>
                <Select value={selectedSede} onValueChange={setSelectedSede}>
                  <SelectTrigger className="w-[180px]" id="sede-filter">
                    <SelectValue placeholder="Todas las sedes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las sedes</SelectItem>
                    {loadingSedes ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      (sedesData || []).map((sede) => (
                        <SelectItem key={sede.id} value={sede.nombreSede}>
                          {sede.nombreSede}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAttendances} disabled={isSaving} className="min-w-[200px]">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? (savingProgress > 0 ? `Guardando ${savingProgress}%` : 'Guardando...') : 'Guardar Asistencias'}
              </Button>
            </div>
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
              className="max-w-xs"
            />
          </div>

          {loadingEmployees && (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          )}

          {!loadingEmployees && filteredEmployees.length === 0 && (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">
                {selectedSede !== 'todos' || nameFilter || dniFilter
                  ? 'No se encontraron empleados con los filtros actuales.'
                  : 'No hay empleados registrados.'}
              </p>
            </div>
          )}

          <div className="md:hidden space-y-3 pb-24">
            {paginatedEmployees.map((employee, index) => {
              const globalIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE + index;
              return (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  currentStatus={attendances.get(employee.id) || 'No Registrado'}
                  onStatusChange={handleStatusChange}
                  index={globalIndex}
                  currentJustification={justifications.get(employee.id)}
                  onJustificationSaved={handleJustificationSaved}
                  selectedDate={selectedDate}
                  variant="mobile"
                />
              );
            })}

            {/* Pagination controls for mobile */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-20">
            <Button
              onClick={handleSaveAttendances}
              disabled={isSaving}
              className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
              size="lg"
            >
              {isSaving && savingProgress > 0 && (
                <div
                  className="absolute left-0 top-0 h-full bg-primary/20 transition-all duration-300"
                  style={{ width: `${savingProgress}%` }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center">
                <Save className="mr-2 h-5 w-5" />
                {isSaving ? (savingProgress > 0 ? `Guardando ${savingProgress}%` : 'Guardando...') : 'Guardar Asistencias'}
              </div>
            </Button>
          </div>

          <div className="hidden md:block rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <UiTableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead className="text-center w-[440px] sm:w-[440px]">Estado de Asistencia</TableHead>
                </UiTableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map((employee, index) => {
                  const globalIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE + index;
                  return (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                      currentStatus={attendances.get(employee.id) || 'No Registrado'}
                      onStatusChange={handleStatusChange}
                      index={globalIndex}
                      currentJustification={justifications.get(employee.id)}
                      onJustificationSaved={handleJustificationSaved}
                      selectedDate={selectedDate}
                      variant="desktop"
                    />
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination controls for desktop */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} ({filteredEmployees.length} empleados)
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

    