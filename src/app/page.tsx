"use client";

import { useState, useEffect, useMemo } from "react";
import type { AttendanceRecord, AttendanceStatus, Employee } from "@/types";
import { AttendanceSummary } from "@/components/attendance/AttendanceSummary";
import { EmployeeCard } from "@/components/attendance/EmployeeCard";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { CoordinatorsList } from "@/components/coordinators/CoordinatorsList";

export default function Home() {
  const [currentDate, setCurrentDate] = useState("");
  const firestore = useFirestore();

  const { data: employeesData = [], loading } = useCollection<Employee>(
    firestore ? collection(firestore, 'empleados') : null
  );

  const employees: Employee[] = useMemo(() => {
    return employeesData.map(emp => ({...emp, id: emp.dni}));
  }, [employeesData]);

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (employees.length > 0) {
        const initialAttendances = employees.map(emp => ({
            employeeId: emp.id,
            status: 'No Registrado' as AttendanceStatus
        }));
        setAttendances(initialAttendances);
    }
  }, [employees]); 
   
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', options).format(today);
    setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
  }, []);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setAttendances(prevAttendances =>
      prevAttendances.map(att =>
        att.employeeId === employeeId
          ? { ...att, status, timestamp: new Date() }
          : att
      )
    );
  };

  return (
    <div className="min-h-screen bg-background/80 backdrop-blur-sm">
      <main className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-bold text-primary mb-1 font-headline tracking-tight">AsistenciaYA</h1>
          {currentDate && <p className="text-lg text-muted-foreground">Hoy es {currentDate}</p>}
        </header>

        <section className="mb-8">
          <AttendanceSummary attendances={attendances} totalEmployees={employees.length} />
        </section>

        <Separator className="my-8 bg-border/50" />

        <section>
          <h2 className="text-3xl font-bold mb-6 font-headline text-center md:text-left">Lista de Personal</h2>
          {loading && <p>Cargando empleados...</p>}
          {!loading && employees.length === 0 && <p>No se encontraron empleados.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee, index) => {
              const attendance = attendances.find(a => a.employeeId === employee.id);
              return (
                <EmployeeCard
                  key={employee.id}
                  employee={{ ...employee, avatarUrl: `https://picsum.photos/seed/${index + 1}/150/150` }}
                  currentStatus={attendance?.status || 'No Registrado'}
                  onStatusChange={handleStatusChange}
                />
              );
            })}
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
