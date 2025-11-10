
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Employee, AttendanceRecord, Division, Coordinador, ScrumMaster } from '@/types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceByDivisionChart } from '@/components/dashboard/AttendanceByDivisionChart';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';

import { Users, UserCheck, UserX, Clock } from 'lucide-react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState({
    date: new Date(),
    division: 'all',
    coordinador: 'all',
    scrumMaster: 'all',
  });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data
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
      if (!firestore) return;
      setIsLoading(true);

      const start = Timestamp.fromDate(startOfDay(filters.date));
      const end = Timestamp.fromDate(endOfDay(filters.date));

      const q = query(
        collection(firestore, 'asistencias'),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      );

      const querySnapshot = await getDocs(q);
      const attendances = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendanceData(attendances);
      setIsLoading(false);
    };

    fetchAttendance();
  }, [firestore, filters.date]);

  const filteredEmployees = useMemo(() => {
    if (!employeesData) return [];
    return employeesData.filter(employee => {
      const divisionMatch = filters.division === 'all' || employee.divisionId === filters.division;
      const coordinadorMatch = filters.coordinador === 'all' || employee.coordinadorId === filters.coordinador;
      const scrumMasterMatch = filters.scrumMaster === 'all' || employee.scrumMasterId === filters.scrumMaster;
      return divisionMatch && coordinadorMatch && scrumMasterMatch;
    });
  }, [employeesData, filters]);
  
  const employeesWithAttendance = useMemo(() => {
    return filteredEmployees.map(employee => {
      const attendance = attendanceData.find(att => att.employeeId === employee.dni);
      return {
        ...employee,
        status: attendance?.status || 'No Registrado',
      };
    });
  }, [filteredEmployees, attendanceData]);


  const stats = useMemo(() => {
    const total = employeesWithAttendance.length;
    const presentes = employeesWithAttendance.filter(e => e.status === 'Presente').length;
    const tardanzas = employeesWithAttendance.filter(e => e.status === 'Tardanza').length;
    const faltas = employeesWithAttendance.filter(e => e.status === 'Falta').length;
    const noRegistrados = total - presentes - tardanzas - faltas;

    return {
      total,
      presentes,
      tardanzas,
      faltas,
      noRegistrados,
      asistenciaGeneral: total > 0 ? ((presentes + tardanzas) / total) * 100 : 0,
    };
  }, [employeesWithAttendance]);
  
  const attendanceByDivision = useMemo(() => {
    const result: { name: string, presentes: number, faltas: number }[] = [];
    divisionsData?.forEach(division => {
      const employeesInDivision = employeesWithAttendance.filter(e => e.divisionId === division.id);
      if (employeesInDivision.length > 0) {
        result.push({
          name: division.nombreDivision,
          presentes: employeesInDivision.filter(e => e.status === 'Presente' || e.status === 'Tardanza').length,
          faltas: employeesInDivision.filter(e => e.status === 'Falta').length,
        });
      }
    });
    return result;
  }, [employeesWithAttendance, divisionsData]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Presente', value: stats.presentes, fill: 'var(--color-presente)' },
      { name: 'Tardanza', value: stats.tardanzas, fill: 'var(--color-tardanza)' },
      { name: 'Falta', value: stats.faltas, fill: 'var(--color-falta)' },
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Empleados" value={stats.total} icon={Users} />
                <StatCard title="Presentes" value={stats.presentes} icon={UserCheck} color="text-green-500" />
                <StatCard title="Faltas" value={stats.faltas} icon={UserX} color="text-red-500" />
                <StatCard title="% Asistencia General" value={`${stats.asistenciaGeneral.toFixed(2)}%`} icon={Clock} color="text-purple-500" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AttendanceByDivisionChart data={attendanceByDivision} dataKey="faltas" title="Ausencias por División" color="var(--color-falta)" />
                    <AttendanceByDivisionChart data={attendanceByDivision} dataKey="presentes" title="Asistencia Puntual por División" color="var(--color-presente)" />
                </div>
                 <div className="w-full">
                   <StatusDistributionChart data={statusDistribution} />
                 </div>
            </div>
        </div>
      )}
    </div>
  );
}
