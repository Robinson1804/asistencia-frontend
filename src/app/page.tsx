"use client";

import { useState, useEffect, useMemo } from "react";
import type { AttendanceRecord, AttendanceStatus, Employee } from "@/types";
import { AttendanceSummary } from "@/components/attendance/AttendanceSummary";
import { EmployeeCard } from "@/components/attendance/EmployeeCard";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { collection, DocumentData } from "firebase/firestore";
import { CoordinatorsList } from "@/components/coordinators/CoordinatorsList";

export default function Home() {
  const [currentDate, setCurrentDate] = useState("");
  const firestore = useFirestore();
  const { data: employeesData = [], loading } = useCollection<DocumentData>(
    firestore ? collection(firestore, 'empleados') : null
  );

  /*const employees: Employee[] = useMemo(() => {
    return employeesData.map(emp => ({
      ...emp,
      id: emp.dni, 
    }));
  }, [employeesData]);*/

  const employees: Employee[] = useMemo(() => {
    return employeesData.map(emp => ({
      id: emp.dni || '', // Usar dni como ID
      apellidosNombres: emp.apellidosNombres || '',
      dni: emp.dni || '',
      email: emp.email || '',
      telefono: emp.telefono || null,
      activo: emp.activo !== undefined ? emp.activo : true,
      avatarUrl: emp.avatarUrl || `https://i.pravatar.cc/150?u=${emp.dni}`,

      // Campos anidados - mapear exactamente como están en Firebase
      proyecto: emp.proyecto || undefined,
      dtt: emp.dtt || undefined,
      modalidad: emp.modalidad || undefined,
      sede: emp.sede || undefined,
      tipoContrato: emp.tipoContrato || undefined,

      // IDs
      dttId: emp.dttId,
      proyectoId: emp.proyectoId,
      relacionDivisionId: emp.relacionDivisionId,
      tipoContratoId: emp.tipoContratoId,
      modalidadId: emp.modalidadId,
      sedeId: emp.sedeId,
      fechaInicio: emp.fechaInicio,
      fechaFin: emp.fechaFin,
      createdAt: emp.createdAt
    }));
  }, [employeesData]);

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  /*useEffect(() => {
    if (employees.length > 0) {
      setAttendances(
        employees.map(emp => ({ employeeId: emp.id, status: 'No Registrado' }))
      );
    }
  }, [employees]);*/

  useEffect(() => {
    // Crear attendances para cada empleado inmediatamente
    const initialAttendances = employees.map(emp => ({
      employeeId: emp.id,
      status: 'No Registrado' as AttendanceStatus
    }));
    setAttendances(initialAttendances);
  }, [employees]); // Dependencia de employees

   
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(employee => {
              const attendance = attendances.find(a => a.employeeId === employee.id);
              return (
                <EmployeeCard
                  key={employee.id}
                  employee={{ ...employee, avatarUrl: `https://i.pravatar.cc/150?u=${employee.id}` }}
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
