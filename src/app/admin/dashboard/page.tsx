
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Employee, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede, AttendanceStatus, AttendanceRecord } from '@/types';
import { startOfDay, endOfDay, eachDayOfInterval, getDay } from 'date-fns';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceByDivisionChart } from '@/components/dashboard/AttendanceByDivisionChart';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { AttendanceMatrixTable } from '@/components/dashboard/AttendanceMatrixTable';
import { TopAbsencesChart } from '@/components/dashboard/TopAbsencesChart';


import { Users, UserCheck, UserX, Clock } from 'lucide-react';

const initialFilters = {
    dateRange: undefined,
    division: 'all',
    coordinador: 'all',
    scrumMaster: 'all',
    proyecto: 'all',
    tipoContrato: [],
    name: '',
    dni: '',
    sede: 'all',
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState(initialFilters);

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | null>(null);

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
  const { data: proyectosData } = useCollection<Proyecto>(
    useMemoFirebase(() => firestore ? collection(firestore, 'proyectos') : null, [firestore])
  );
  const { data: tiposContratoData } = useCollection<TipoContrato>(
    useMemoFirebase(() => firestore ? collection(firestore, 'tiposContrato') : null, [firestore])
  );
  const { data: sedesData } = useCollection<Sede>(
    useMemoFirebase(() => firestore ? collection(firestore, 'sedes') : null, [firestore])
  );

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!firestore || !filters.dateRange?.from || !filters.dateRange?.to) {
        setAttendanceData([]);
        setIsLoading(false);
        return;
      };
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

  const workingDays = useMemo(() => {
    const { from, to } = filters.dateRange || {};
    if (!from || !to) return [];
    return eachDayOfInterval({ start: from, end: to }).filter(day => {
        const dayOfWeek = getDay(day);
        return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }, [filters.dateRange]);


  const filteredEmployees = useMemo(() => {
    if (!employeesData) return [];
    
    let employees = employeesData.filter(employee => {
      const divisionMatch = filters.division === 'all' || employee.divisionId === filters.division;
      const coordinadorMatch = filters.coordinador === 'all' || employee.coordinadorId === filters.coordinador;
      const scrumMasterMatch = filters.scrumMaster === 'all' || employee.scrumMasterId === filters.scrumMaster;
      const proyectoMatch = filters.proyecto === 'all' || employee.proyectoId === filters.proyecto;
      const tipoContratoMatch = filters.tipoContrato.length === 0 || (employee.tipoContratoId && filters.tipoContrato.includes(employee.tipoContratoId));
      const nameMatch = filters.name === '' || employee.apellidosNombres.toLowerCase().includes(filters.name.toLowerCase());
      const dniMatch = filters.dni === '' || employee.dni.includes(filters.dni);
      const sedeMatch = filters.sede === 'all' || employee.sedeId === filters.sede;


      return employee.activo && divisionMatch && coordinadorMatch && scrumMasterMatch && proyectoMatch && tipoContratoMatch && nameMatch && dniMatch && sedeMatch;
    });

    if (statusFilter) {
      const employeeIdsWithStatus = new Set<string>();
      
      attendanceData.forEach(att => {
        if (att.status === statusFilter) {
          employeeIdsWithStatus.add(att.employeeId);
        }
      });
      
      employees = employees.filter(emp => employeeIdsWithStatus.has(emp.dni));
    }

    return employees;

  }, [employeesData, filters, statusFilter, attendanceData]);
  
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    const filteredEmployeeIds = new Set(filteredEmployees.map(e => e.dni));

    attendanceData.forEach(att => {
        if (!att.employeeId || !att.timestamp || !filteredEmployeeIds.has(att.employeeId)) return;
        const dateStr = att.timestamp.toDate().toISOString().split('T')[0];
        if (!matrix[att.employeeId]) {
            matrix[att.employeeId] = {};
        }
        matrix[att.employeeId][dateStr] = att.status;
    });
    return matrix;
  }, [attendanceData, filteredEmployees]);

  const stats = useMemo(() => {
    if (filteredEmployees.length === 0 || workingDays.length === 0) {
      return { total: filteredEmployees.length, presentes: 0, tardanzas: 0, faltas: 0 };
    }

    let totalPresentes = 0;
    let totalTardanzas = 0;
    let totalFaltas = 0;

    workingDays.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        filteredEmployees.forEach(employee => {
            const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
            switch (status) {
                case 'Presente':
                    totalPresentes++;
                    break;
                case 'Tardanza':
                    totalTardanzas++;
                    break;
                case 'Falta':
                    totalFaltas++;
                    break;
            }
        });
    });

    const numDays = workingDays.length;
    return {
        total: filteredEmployees.length,
        presentes: Math.round(totalPresentes / numDays),
        tardanzas: Math.round(totalTardanzas / numDays),
        faltas: Math.round(totalFaltas / numDays),
    };

  }, [filteredEmployees, attendanceMatrix, workingDays]);
  
  const attendanceByDivision = useMemo(() => {
    if (!divisionsData || filteredEmployees.length === 0 || workingDays.length === 0) return [];

    const divisionStats: Record<string, { presentes: number, faltas: number, employeeCount: number }> = {};

    divisionsData.forEach(division => {
        const employeesInDivision = filteredEmployees.filter(e => e.divisionId === division.id);
        if (employeesInDivision.length > 0) {
            if (!divisionStats[division.id]) {
                divisionStats[division.id] = { presentes: 0, faltas: 0, employeeCount: employeesInDivision.length };
            }
    
            workingDays.forEach(day => {
                const dateStr = day.toISOString().split('T')[0];
                employeesInDivision.forEach(employee => {
                    const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
                    if (status === 'Presente' || status === 'Tardanza') {
                        divisionStats[division.id].presentes++;
                    } else if (status === 'Falta') {
                        divisionStats[division.id].faltas++;
                    }
                });
            });
        }
    });

    return Object.entries(divisionStats).map(([divisionId, stats]) => {
        const division = divisionsData.find(d => d.id === divisionId);
        const totalPossibleAttendances = stats.employeeCount * workingDays.length;
        return {
          name: division?.nombreDivision || 'N/A',
          presentes: totalPossibleAttendances > 0 ? (stats.presentes / totalPossibleAttendances) * 100 : 0,
          faltas: totalPossibleAttendances > 0 ? (stats.faltas / totalPossibleAttendances) * 100 : 0,
        };
    })

  }, [filteredEmployees, divisionsData, attendanceMatrix, workingDays]);

  const sortedAttendanceByDivisionIngresos = useMemo(() => {
    return [...attendanceByDivision].sort((a,b) => b.presentes - a.presentes);
  }, [attendanceByDivision]);
  
  const sortedAttendanceByDivisionAusencias = useMemo(() => {
    return [...attendanceByDivision].sort((a,b) => b.faltas - a.faltas);
  }, [attendanceByDivision]);


  const statusDistribution = useMemo(() => {
    const data = [
      { name: 'Ingresos', value: stats.presentes, fill: 'hsl(var(--color-ingreso))' },
      { name: 'Ingresos Tarde', value: stats.tardanzas, fill: 'hsl(var(--color-ingreso-tarde))' },
      { name: 'Ausencias', value: stats.faltas, fill: 'hsl(var(--color-ausencia))' },
    ];
    return data.filter(item => item.value > 0);
  }, [stats]);

  const topAbsences = useMemo(() => {
    if (filteredEmployees.length === 0 || workingDays.length === 0) return [];

    const absencesCount = filteredEmployees.map(employee => {
        let faltas = 0;
        workingDays.forEach(day => {
            const dateStr = day.toISOString().split('T')[0];
            const status = attendanceMatrix[employee.dni]?.[dateStr];
            if (status === 'Falta') {
                faltas++;
            }
        });
        return { name: employee.apellidosNombres, ausencias: faltas };
    });

    return absencesCount
        .filter(item => item.ausencias > 0)
        .sort((a, b) => b.ausencias - a.ausencias)
        .slice(0, 10);
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  const handleStatusFilter = (status: AttendanceStatus | null) => {
    setStatusFilter(prev => prev === status ? null : status);
  }

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setStatusFilter(null);
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="mb-8">
         <h1 className="text-3xl font-bold">Dashboard Gerencial</h1>
         <p className="text-muted-foreground">Análisis de registros por sede y división.</p>
       </div>
       
       <Filters
        filters={filters}
        setFilters={setFilters}
        divisions={divisionsData || []}
        coordinadores={coordinadoresData || []}
        scrumMasters={scrumMastersData || []}
        proyectos={proyectosData || []}
        tiposContrato={tiposContratoData || []}
        sedes={sedesData || []}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <div className="text-center p-8">Cargando datos del dashboard...</div>
      ) : (
        <div className="space-y-8 mt-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Empleados" value={stats.total} icon={Users} />
                <StatCard 
                  title="Prom. Ingresos" 
                  value={stats.presentes} 
                  icon={UserCheck} 
                  color="text-[hsl(var(--color-ingreso))]" 
                  onClick={() => handleStatusFilter('Presente')}
                  isActive={statusFilter === 'Presente'}
                />
                <StatCard 
                  title="Prom. Ingresos Tarde" 
                  value={stats.tardanzas} 
                  icon={Clock} 
                  color="text-[hsl(var(--color-ingreso-tarde))]"
                  onClick={() => handleStatusFilter('Tardanza')}
                  isActive={statusFilter === 'Tardanza'}
                />
                <StatCard 
                  title="Prom. Ausencias" 
                  value={stats.faltas} 
                  icon={UserX} 
                  color="text-[hsl(var(--color-ausencia))]"
                  onClick={() => handleStatusFilter('Falta')}
                  isActive={statusFilter === 'Falta'}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StatusDistributionChart data={statusDistribution} title="Distribución Promedio de Estados" />
                <TopAbsencesChart data={topAbsences} title="Top 10 Empleados con más Ausencias" />
                <AttendanceByDivisionChart data={sortedAttendanceByDivisionAusencias} dataKey="faltas" title="Prom. % Ausencias por División" color="hsl(var(--color-ausencia))" />
                <AttendanceByDivisionChart data={sortedAttendanceByDivisionIngresos} dataKey="presentes" title="Prom. % Ingresos por División" color="hsl(var(--color-ingreso))" />
            </div>
            
            <AttendanceMatrixTable
                employees={filteredEmployees}
                attendanceMatrix={attendanceMatrix}
                workingDays={workingDays}
            />
        </div>
      )}
    </div>
  );
}
