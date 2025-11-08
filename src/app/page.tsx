"use client";

import { useState, useEffect, useMemo } from "react";
import type { AttendanceRecord, AttendanceStatus, Employee, Sede } from "@/types";
import { AttendanceSummary } from "@/components/attendance/AttendanceSummary";
import { EmployeeRow } from "@/components/attendance/EmployeeRow";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from "firebase/firestore";
import { CoordinatorsList } from "@/components/coordinators/CoordinatorsList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow as UiTableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [currentDate, setCurrentDate] = useState("");
  const firestore = useFirestore();
  const [selectedSede, setSelectedSede] = useState<string>("todos");
  const { toast } = useToast();

  const { data: employeesData = [], loading: loadingEmployees } = useCollection<Employee>(
    firestore ? collection(firestore, 'empleados') : null
  );

  const { data: sedesData = [], loading: loadingSedes } = useCollection<Sede>(
    firestore ? collection(firestore, 'sedes') : null
  );

  const employees: Employee[] = useMemo(() => {
    return employeesData.map(emp => ({...emp, id: emp.dni}));
  }, [employeesData]);

  const filteredEmployees = useMemo(() => {
    if (selectedSede === "todos") {
      return employees;
    }
    return employees.filter(employee => employee.sede?.nombre === selectedSede);
  }, [employees, selectedSede]);

  const [attendances, setAttendances] = useState<Map<string, AttendanceStatus>>(new Map());

  // Fetch today's attendances when component mounts or firestore instance changes
  useEffect(() => {
    const fetchTodaysAttendances = async () => {
      if (!firestore) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      today.setHours(23, 59, 59, 999);
      const endOfToday = Timestamp.fromDate(today);

      const q = query(
        collection(firestore, "asistencias"),
        where("timestamp", ">=", startOfToday),
        where("timestamp", "<=", endOfToday)
      );
      
      const querySnapshot = await getDocs(q);
      const todaysAttendances = new Map<string, AttendanceStatus>();
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AttendanceRecord;
        todaysAttendances.set(data.employeeId, data.status);
      });
      setAttendances(todaysAttendances);
    };

    fetchTodaysAttendances();
  }, [firestore]);


  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(today);
    setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
  }, []);

  const handleStatusChange = async (employeeId: string, status: AttendanceStatus) => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo conectar a la base de datos.",
        });
        return;
    }

    // Optimistically update UI
    setAttendances(prevAttendances => new Map(prevAttendances).set(employeeId, status));

    try {
        await addDoc(collection(firestore, 'asistencias'), {
            employeeId,
            status,
            timestamp: serverTimestamp()
        });
        toast({
            title: "Asistencia registrada",
            description: `Se guardó el estado de ${status} para el empleado.`,
        });
    } catch (error) {
        console.error("Error writing document: ", error);
        // Revert UI change on error
        setAttendances(prevAttendances => {
            const newAttendances = new Map(prevAttendances);
            // This is a simplified rollback, you might need a more robust solution
            // depending on whether you want to revert to a 'No Registrado' state or previous state
            newAttendances.delete(employeeId); 
            return newAttendances;
        });
        toast({
            variant: "destructive",
            title: "Error al registrar",
            description: "No se pudo guardar la asistencia. Inténtalo de nuevo.",
        });
    }
  };

  const attendanceArray = Array.from(attendances.values());

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm">
      <main className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-bold text-primary mb-1 font-headline tracking-tight">AsistenciaYA</h1>
          {currentDate && <p className="text-lg text-muted-foreground">Hoy es {currentDate}</p>}
        </header>

        <section className="mb-8">
          <AttendanceSummary attendances={attendanceArray} totalEmployees={filteredEmployees.length} />
        </section>

        <Separator className="my-8 bg-border/50" />

        <section>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <h2 className="text-3xl font-bold font-headline text-center md:text-left mb-4 md:mb-0">Lista de Personal</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="sede-filter">Filtrar por Sede:</Label>
              <Select value={selectedSede} onValueChange={setSelectedSede}>
                <SelectTrigger className="w-[180px]" id="sede-filter">
                  <SelectValue placeholder="Todas las sedes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las sedes</SelectItem>
                  {loadingSedes ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : (
                    sedesData.map((sede) => (
                      <SelectItem key={sede.id} value={sede.nombreSede}>{sede.nombreSede}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loadingEmployees && <p>Cargando empleados...</p>}
          {!loadingEmployees && filteredEmployees.length === 0 && selectedSede !== 'todos' && <p>No se encontraron empleados para la sede seleccionada.</p>}
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Table>
              <TableHeader>
                <UiTableRow>
                  <TableHead className="w-[120px]">Avatar</TableHead>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="text-center w-[320px]">Estado de Asistencia</TableHead>
                </UiTableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee, index) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={{ ...employee, avatarUrl: `https://picsum.photos/seed/${index + 1}/150/150` }}
                    currentStatus={attendances.get(employee.id) || 'No Registrado'}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <Separator className="my-8 bg-border/50" />

        <section>
          <CoordinatorsList />
        </section>
      </main>
    </div>
  );
}
