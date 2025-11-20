'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Employee, AttendanceRecord, Division, Coordinador, ScrumMaster } from '@/types';
import { startOfDay, endOfDay, addMonths } from 'date-fns';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceByDivisionChart } from '@/components/dashboard/AttendanceByDivisionChart';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { AttendanceMatrixTable } from '@/components/dashboard/AttendanceMatrixTable';

import { Users, UserCheck, UserX, Clock, HelpCircle } from 'lucide-react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState({
    dateRange: {
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    },
    division: 'all',
    coordinador: 'all',
    scrumMaster: 'all',
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all reference data
  const { data: employeesData } = useCollection<Employee>(
    useMemoFirebase(() => firestore ? collection(firestore, 'empleados') : null, [firestore])
  );
  const { data: divisionsData } = useCollection<Division>(
    useMemoFirebase(() => firestore ? collection(firestore, 'divisiones') : null, [firestore])
  );
  const { data: coordinadoresData } = useCollection<Coordinador>(
    useMemoFirebase(() => firestore ? collection(firestore, 'coordinadoresDivision') : null, [firestore])
  );
  const { data: scrumMastersData } = useCollection<ScrumMaster>(
    useMemoFirebase(() => firestore ? collection(firestore, 'scrumMasters') : null, [firestore])
  );

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!firestore || !filters.dateRange?.from || !filters.dateRange?.to) return;
      setIsLoading(true);

      const start = Timestamp.fromDate(startOfDay(filters.dateRange.from));
      const end = Timestamp.fromDate(endOfDay(filters.dateRange.to));

      const q = query(
        collection(firestore, 'asistencias'),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      );

      try {
        const querySnapshot = await getDocs(q);
        const attendances = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id
            } as AttendanceRecord;
        });
        setAttendanceData(attendances);
      } catch (error) {
        console.error("Error fetching attendance: ", error);
        setAttendanceData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [firestore, filters.dateRange]);

  const filteredEmployees = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.filter(employee => {
      const divisionMatch = filters.division === 'all' || employee.divisionId === filters.division;
      const coordinadorMatch = filters.coordinador === 'all' || employee.coordinadorId === filters.coordinador;
      const scrumMasterMatch = filters.scrumMaster === 'all' || employee.scrumMasterId === filters.scrumMaster;
      return employee.activo && divisionMatch && coordinadorMatch && scrumMasterMatch;
    });
  }, [employeesData, filters]);
  
  // This transformation creates a matrix: { employeeId: { 'YYYY-MM-DD': status, ... }, ... }
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    attendanceData.forEach(att => {
        if (!att.employeeId || !att.timestamp) return;
        const dateStr = att.timestamp.toDate().toISOString().split('T')[0];
        if (!matrix[att.employeeId]) {
            matrix[att.employeeId] = {};
        }
        matrix[att.employeeId][dateStr] = att.status;
    });
    return matrix;
  }, [attendanceData]);

  // For summary cards, we use only the first day of the range
  const singleDayAttendance = useMemo(() => {
    if (!filters.dateRange?.from) return [];
    const startOfRangeStr = filters.dateRange.from.toISOString().split('T')[0];
    return filteredEmployees.map(employee => {
      const status = attendanceMatrix[employee.dni]?.[startOfRangeStr] || 'No Registrado';
      return {
        ...employee,
        status: status,
      };
    });
  }, [filteredEmployees, attendanceMatrix, filters.dateRange.from]);


  const stats = useMemo(() => {
    const total = singleDayAttendance.length;
    const presentes = singleDayAttendance.filter(e => e.status === 'Presente').length;
    const tardanzas = singleDayAttendance.filter(e => e.status === 'Tardanza').length;
    const faltas = singleDayAttendance.filter(e => e.status === 'Falta').length;
    const noRegistrados = total - presentes - tardanzas - faltas;

    return {
      total,
      presentes,
      tardanzas,
      faltas,
      noRegistrados,
    };
  }, [singleDayAttendance]);
  
  const attendanceByDivision = useMemo(() => {
    const result: { name: string, presentes: number, faltas: number }[] = [];
    divisionsData?.forEach(division => {
      const employeesInDivision = singleDayAttendance.filter(e => e.divisionId === division.id);
      if (employeesInDivision.length > 0) {
        result.push({
          name: division.nombreDivision,
          presentes: employeesInDivision.filter(e => e.status === 'Presente' || e.status === 'Tardanza').length,
          faltas: employeesInDivision.filter(e => e.status === 'Falta').length,
        });
      }
    });
    return result;
  }, [singleDayAttendance, divisionsData]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Presente', value: stats.presentes, fill: 'hsl(var(--color-presente))' },
      { name: 'Tardanza', value: stats.tardanzas, fill: 'hsl(var(--color-tardanza))' },
      { name: 'Falta', value: stats.faltas, fill: 'hsl(var(--color-falta))' },
      { name: 'No Registrado', value: stats.noRegistrados, fill: 'hsl(var(--muted))' }
    ];
  }, [stats]);


  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="mb-8">
         <h1 className="text-3xl font-bold">Dashboard Gerencial de Asistencia</h1>
         <p className="text-muted-foreground">Análisis de permanencia por sede y división.</p>
       </div>
       
       <Filters
        filters={filters}
        setFilters={setFilters}
        divisions={divisionsData || []}
        coordinadores={coordinadoresData || []}
        scrumMasters={scrumMastersData || []}
      />

      {isLoading ? (
        <div className="text-center p-8">Cargando datos del dashboard...</div>
      ) : (
        <div className="space-y-8 mt-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Total Empleados" value={stats.total} icon={Users} />
                <StatCard title="Presentes" value={stats.presentes} icon={UserCheck} color="text-[hsl(var(--color-presente))]" />
                <StatCard title="Tardanzas" value={stats.tardanzas} icon={Clock} color="text-[hsl(var(--color-tardanza))]" />
                <StatCard title="Faltas" value={stats.faltas} icon={UserX} color="text-[hsl(var(--color-falta))]" />
                <StatCard title="No Registrados" value={stats.noRegistrados} icon={HelpCircle} color="text-muted-foreground" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AttendanceByDivisionChart data={attendanceByDivision} dataKey="faltas" title="Ausencias por División (Día de Inicio)" color="hsl(var(--color-falta))" />
                    <AttendanceByDivisionChart data={attendanceByDivision} dataKey="presentes" title="Asistencia por División (Día de Inicio)" color="hsl(var(--color-presente))" />
                </div>
                 <div className="w-full">
                   <StatusDistributionChart data={statusDistribution} />
                 </div>
            </div>
            
            <AttendanceMatrixTable
                employees={filteredEmployees}
                attendanceMatrix={attendanceMatrix}
                dateRange={filters.dateRange}
            />
        </div>
      )}
    </div>
  );
}
