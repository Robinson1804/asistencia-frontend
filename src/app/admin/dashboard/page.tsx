
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Employee, AttendanceRecord, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, AttendanceStatus } from '@/types';
import { startOfDay, endOfDay, eachDayOfInterval, getDay, subDays } from 'date-fns';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceByDivisionChart } from '@/components/dashboard/AttendanceByDivisionChart';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { AttendanceMatrixTable } from '@/components/dashboard/AttendanceMatrixTable';
import { TopAbsencesChart } from '@/components/dashboard/TopAbsencesChart';


import { Users, UserCheck, UserX, Clock, HelpCircle } from 'lucide-react';

const initialFilters = {
    dateRange: {
      from: subDays(startOfDay(new Date()), 7),
      to: endOfDay(new Date()),
    },
    division: 'all',
    coordinador: 'all',
    scrumMaster: 'all',
    proyecto: 'all',
    tipoContrato: 'all',
    name: '',
    dni: '',
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState(initialFilters);

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'No Registrado' | null>(null);

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

  const workingDays = useMemo(() => {
    const { from, to } = filters.dateRange;
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
      const tipoContratoMatch = filters.tipoContrato === 'all' || employee.tipoContratoId === filters.tipoContrato;
      const nameMatch = filters.name === '' || employee.apellidosNombres.toLowerCase().includes(filters.name.toLowerCase());
      const dniMatch = filters.dni === '' || employee.dni.includes(filters.dni);

      return employee.activo && divisionMatch && coordinadorMatch && scrumMasterMatch && proyectoMatch && tipoContratoMatch && nameMatch && dniMatch;
    });

    if (statusFilter) {
      const employeeIdsWithStatus = new Set<string>();
      
      attendanceData.forEach(att => {
        if (att.status === statusFilter) {
          employeeIdsWithStatus.add(att.employeeId);
        }
      });
      
      // Special case for 'No Registrado'
      if (statusFilter === 'No Registrado') {
          const registeredEmployeeIds = new Set(attendanceData.map(att => att.employeeId));
          employees.forEach(emp => {
              if (!registeredEmployeeIds.has(emp.dni)) {
                  employeeIdsWithStatus.add(emp.dni);
              }
          })
      }

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
      return { total: filteredEmployees.length, ingresos: 0, ingresosTarde: 0, ausencias: 0, noRegistrados: 0 };
    }

    let totalIngresos = 0;
    let totalIngresosTarde = 0;
    let totalAusencias = 0;
    let totalNoRegistrados = 0;

    workingDays.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        filteredEmployees.forEach(employee => {
            const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
            switch (status) {
                case 'Ingreso':
                    totalIngresos++;
                    break;
                case 'Ingreso Tarde':
                    totalIngresosTarde++;
                    break;
                case 'Ausencia':
                    totalAusencias++;
                    break;
                case 'No Registrado':
                    totalNoRegistrados++;
                    break;
            }
        });
    });

    const numDays = workingDays.length;
    return {
        total: filteredEmployees.length,
        ingresos: Math.round(totalIngresos / numDays),
        ingresosTarde: Math.round(totalIngresosTarde / numDays),
        ausencias: Math.round(totalAusencias / numDays),
        noRegistrados: Math.round(totalNoRegistrados / numDays),
    };

  }, [filteredEmployees, attendanceMatrix, workingDays]);
  
  const attendanceByDivision = useMemo(() => {
    if (!divisionsData || filteredEmployees.length === 0 || workingDays.length === 0) return [];

    const divisionStats: Record<string, { ingresos: number, ausencias: number, employeeCount: number }> = {};

    divisionsData.forEach(division => {
        const employeesInDivision = filteredEmployees.filter(e => e.divisionId === division.id);
        if (employeesInDivision.length > 0) {
            if (!divisionStats[division.id]) {
                divisionStats[division.id] = { ingresos: 0, ausencias: 0, employeeCount: employeesInDivision.length };
            }
    
            workingDays.forEach(day => {
                const dateStr = day.toISOString().split('T')[0];
                employeesInDivision.forEach(employee => {
                    const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
                    if (status === 'Ingreso' || status === 'Ingreso Tarde') {
                        divisionStats[division.id].ingresos++;
                    } else if (status === 'Ausencia') {
                        divisionStats[division.id].ausencias++;
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
          ingresos: totalPossibleAttendances > 0 ? (stats.ingresos / totalPossibleAttendances) * 100 : 0,
          ausencias: totalPossibleAttendances > 0 ? (stats.ausencias / totalPossibleAttendances) * 100 : 0,
        };
    })
    .sort((a, b) => b.ausencias - a.ausencias);

  }, [filteredEmployees, divisionsData, attendanceMatrix, workingDays]);

  const sortedAttendanceByDivisionIngresos = useMemo(() => {
    return [...attendanceByDivision].sort((a,b) => b.ingresos - a.ingresos);
  }, [attendanceByDivision]);
  
  const sortedAttendanceByDivisionAusencias = useMemo(() => {
    return [...attendanceByDivision].sort((a,b) => b.ausencias - a.ausencias);
  }, [attendanceByDivision]);


  const statusDistribution = useMemo(() => {
    return [
      { name: 'Ingreso', value: stats.ingresos, fill: 'hsl(var(--color-ingreso))' },
      { name: 'Ingreso Tarde', value: stats.ingresosTarde, fill: 'hsl(var(--color-ingreso-tarde))' },
      { name: 'Ausencia', value: stats.ausencias, fill: 'hsl(var(--color-ausencia))' },
      { name: 'No Registrado', value: stats.noRegistrados, fill: 'hsl(var(--muted))' }
    ].filter(item => item.name !== 'No Registrado'); // Exclude 'No Registrado'
  }, [stats]);

  const topAbsences = useMemo(() => {
    if (filteredEmployees.length === 0 || workingDays.length === 0) return [];

    const absencesCount = filteredEmployees.map(employee => {
        let faltas = 0;
        workingDays.forEach(day => {
            const dateStr = day.toISOString().split('T')[0];
            const status = attendanceMatrix[employee.dni]?.[dateStr];
            if (status === 'Ausencia') {
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

  const handleStatusFilter = (status: AttendanceStatus | 'No Registrado' | null) => {
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
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <div className="text-center p-8">Cargando datos del dashboard...</div>
      ) : (
        <div className="space-y-8 mt-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Total Empleados" value={stats.total} icon={Users} />
                <StatCard 
                  title="Prom. Ingresos" 
                  value={stats.ingresos} 
                  icon={UserCheck} 
                  color="text-[hsl(var(--color-ingreso))]" 
                  onClick={() => handleStatusFilter('Ingreso')}
                  isActive={statusFilter === 'Ingreso'}
                />
                <StatCard 
                  title="Prom. Ingresos Tarde" 
                  value={stats.ingresosTarde} 
                  icon={Clock} 
                  color="text-[hsl(var(--color-ingreso-tarde))]"
                  onClick={() => handleStatusFilter('Ingreso Tarde')}
                  isActive={statusFilter === 'Ingreso Tarde'}
                />
                <StatCard 
                  title="Prom. Ausencias" 
                  value={stats.ausencias} 
                  icon={UserX} 
                  color="text-[hsl(var(--color-ausencia))]"
                  onClick={() => handleStatusFilter('Ausencia')}
                  isActive={statusFilter === 'Ausencia'}
                />
                <StatCard 
                  title="Prom. No Registrados" 
                  value={stats.noRegistrados} 
                  icon={HelpCircle} 
                  color="text-muted-foreground"
                  onClick={() => handleStatusFilter('No Registrado')}
                  isActive={statusFilter === 'No Registrado'}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StatusDistributionChart data={statusDistribution} title="Distribución Promedio de Estados" />
                <TopAbsencesChart data={topAbsences} title="Top 10 Empleados con más Ausencias" />
                <AttendanceByDivisionChart data={sortedAttendanceByDivisionAusencias} dataKey="ausencias" title="Prom. % Ausencias por División" color="hsl(var(--color-ausencia))" />
                <AttendanceByDivisionChart data={sortedAttendanceByDivisionIngresos} dataKey="ingresos" title="Prom. % Ingresos por División" color="hsl(var(--color-ingreso))" />
            </div>
            
            <AttendanceMatrixTable
                employees={filteredEmployees}
                attendanceMatrix={attendanceMatrix}
                dateRange={filters.dateRange}
                workingDays={workingDays}
            />
        </div>
      )}
    </div>
  );
}
