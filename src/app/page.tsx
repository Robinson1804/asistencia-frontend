
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { AttendanceStatus, Employee, Sede, Justification } from '@/types';
import { AttendanceSummary } from '@/components/attendance/AttendanceSummary';
import { EmployeeRow } from '@/components/attendance/EmployeeRow';
import { DatePicker } from '@/components/attendance/DatePicker';
import { Separator } from '@/components/ui/separator';
import { useAuth, useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, writeBatch, Timestamp, query, where, getDocs, doc, orderBy, addDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow as UiTableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Save, UserCog } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { signOut } from 'firebase/auth';
import Link from 'next/link';

export default function Home() {
  const [currentDate, setCurrentDate] = useState('');
  const firestore = useFirestore();
  const [selectedSede, setSelectedSede] = useState<string>('todos');
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
    if (selectedSede === 'todos') {
      return employees;
    }
    return employees.filter((employee) => employee.sede?.nombre === selectedSede);
  }, [employees, selectedSede]);

  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [initialAttendances, setInitialAttendances] = useState<Map<string, AttendanceStatus>>(new Map());
  const [justifications, setJustifications] = useState<Map<string, Justification>>(new Map());

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
        setJustifications(todaysJustifications);

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
     toast({
        title: "Justificación Guardada",
        description: "La justificación se ha guardado correctamente."
    })
  }

  const handleSaveAttendances = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }

    const changes = new Map<string, AttendanceStatus>();
    attendances.forEach((status, employeeId) => {
      if (initialAttendances.get(employeeId) !== status) {
        changes.set(employeeId, status);
      }
    });

    if (changes.size === 0) {
      toast({ title: 'Sin cambios', description: 'No hay nuevas asistencias para guardar.' });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);
    
    const attendanceDate = startOfDay(selectedDate);
    const attendanceTimestamp = Timestamp.fromDate(attendanceDate);

    // Find existing attendance records to update them
    const attendanceQuery = query(
        collection(firestore, 'asistencias'),
        where('timestamp', '==', attendanceTimestamp),
        where('employeeId', 'in', Array.from(changes.keys()))
    );

    const querySnapshot = await getDocs(attendanceQuery);
    const existingDocs = new Map<string, string>(); // employeeId -> docId
    querySnapshot.forEach(doc => {
        existingDocs.set(doc.data().employeeId, doc.id);
    });

    changes.forEach((status, employeeId) => {
        const docId = existingDocs.get(employeeId);
        const docRef = docId ? doc(firestore, 'asistencias', docId) : doc(collection(firestore, 'asistencias'));

        const payload = {
            employeeId,
            status,
            timestamp: attendanceTimestamp,
        };
        if (docId) {
            batch.update(docRef, payload);
        } else {
            batch.set(docRef, payload);
        }
    });

    try {
      await batch.commit();
      setInitialAttendances(new Map(attendances));
      toast({
        title: 'Asistencia guardada',
        description: `Se guardaron ${changes.size} registros de asistencia.`,
      });
    } catch (error) {
      console.error('Error writing batch: ', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
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
              <Button onClick={handleSaveAttendances} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar Asistencias'}
              </Button>
            </div>
          </div>

          {loadingEmployees && (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          )}

          {!loadingEmployees && filteredEmployees.length === 0 && (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">
                {selectedSede !== 'todos'
                  ? 'No se encontraron empleados para la sede seleccionada.'
                  : 'No hay empleados registrados.'}
              </p>
            </div>
          )}

          <div className="md:hidden space-y-3 pb-24">
            {filteredEmployees.map((employee, index) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                currentStatus={attendances.get(employee.id) || 'No Registrado'}
                onStatusChange={handleStatusChange}
                index={index}
                currentJustification={justifications.get(employee.id)}
                onJustificationSaved={handleJustificationSaved}
                selectedDate={selectedDate}
              />
            ))}
          </div>

          <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-20">
            <Button
              onClick={handleSaveAttendances}
              disabled={isSaving}
              className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
            >
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? 'Guardando...' : 'Guardar Asistencias'}
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
                {filteredEmployees.map((employee, index) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    currentStatus={attendances.get(employee.id) || 'No Registrado'}
                    onStatusChange={handleStatusChange}
                    index={index}
                    currentJustification={justifications.get(employee.id)}
                    onJustificationSaved={handleJustificationSaved}
                    selectedDate={selectedDate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
