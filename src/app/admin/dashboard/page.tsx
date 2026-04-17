
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Employee, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede, AttendanceStatus, AttendanceRecord, Justification } from '@/types';
import { startOfDay, endOfDay, eachDayOfInterval, getDay, startOfMonth, endOfMonth, format } from 'date-fns';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { DivisionGroupedChart } from '@/components/dashboard/DivisionGroupedChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { AttendanceMatrixTable } from '@/components/dashboard/AttendanceMatrixTable';
import { DailyLineChart } from '@/components/dashboard/DailyLineChart';
import { TopDivisionsChart } from '@/components/dashboard/TopDivisionsChart';
import { EmployeeRankingTable } from '@/components/dashboard/EmployeeRankingTable';

import { Users, UserCheck, UserX, Clock, AlertCircle, CheckCircle } from 'lucide-react';

// Obtener el mes actual
const now = new Date();
const currentMonthStart = startOfMonth(now);
const currentMonthEnd = endOfMonth(now);

const initialFilters = {
    dateRange: { from: currentMonthStart, to: currentMonthEnd } as { from: Date; to: Date } | undefined,
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` as string,
    division: 'all' as string,
    coordinador: 'all' as string,
    scrumMaster: 'all' as string,
    proyecto: [] as string[],
    tipoContrato: [] as string[],
    sede: [] as string[],
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState(initialFilters);
  const [matrixFilters, setMatrixFilters] = useState({ name: '', dni: '' });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [justificationsData, setJustificationsData] = useState<Justification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // Set default contract types when data loads
  useEffect(() => {
    if (tiposContratoData && tiposContratoData.length > 0 && filters.tipoContrato.length === 0) {
      const defaultTypes = tiposContratoData
        .filter(t =>
          t.tipoContrato.toLowerCase().includes('locacion') ||
          t.tipoContrato.toLowerCase().includes('locación') ||
          t.tipoContrato.toLowerCase().includes('orden de servicio')
        )
        .map(t => t.id);

      if (defaultTypes.length > 0) {
        setFilters(prev => ({ ...prev, tipoContrato: defaultTypes }));
      }
    }
  }, [tiposContratoData]);

  // Fetch attendance and justifications data
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !filters.dateRange?.from || !filters.dateRange?.to) {
        setAttendanceData([]);
        setJustificationsData([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const start = Timestamp.fromDate(startOfDay(filters.dateRange.from));
      const end = Timestamp.fromDate(endOfDay(filters.dateRange.to));

      try {
        // Fetch attendances
        const attendanceQuery = query(
          collection(firestore, 'asistencias'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendances = attendanceSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as AttendanceRecord));

        // Fetch justifications for the same period
        const justificationQuery = query(
          collection(firestore, 'justificaciones'),
          where('date', '>=', start),
          where('date', '<=', end)
        );
        const justificationSnapshot = await getDocs(justificationQuery);
        const justifications = justificationSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Justification));

        setAttendanceData(attendances);
        setJustificationsData(justifications);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setAttendanceData([]);
        setJustificationsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, filters.dateRange]);

  const workingDays = useMemo(() => {
    const { from, to } = filters.dateRange || {};
    if (!from || !to) return [];

    // Limitar hasta la fecha actual (no mostrar días futuros)
    const today = startOfDay(new Date());
    const effectiveTo = to > today ? today : to;

    if (from > effectiveTo) return [];

    return eachDayOfInterval({ start: from, end: effectiveTo }).filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }, [filters.dateRange]);

  // Create a map of justifications by employeeId and date
  const justificationMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    justificationsData.forEach(j => {
      if (!j.employeeId || !j.date) return;
      // Usar format para consistencia
      const dateStr = format(j.date.toDate(), 'yyyy-MM-dd');
      if (!map[j.employeeId]) {
        map[j.employeeId] = {};
      }
      map[j.employeeId][dateStr] = true;
    });
    return map;
  }, [justificationsData]);

  const filteredEmployees = useMemo(() => {
    if (!employeesData) return [];

    return employeesData.filter(employee => {
      const divisionMatch = filters.division === 'all' || employee.divisionId === filters.division;
      const coordinadorMatch = filters.coordinador === 'all' || employee.coordinadorId === filters.coordinador;
      const scrumMasterMatch = filters.scrumMaster === 'all' || employee.scrumMasterId === filters.scrumMaster;
      const proyectoMatch = filters.proyecto.length === 0 || (employee.proyectoId && filters.proyecto.includes(employee.proyectoId));
      const tipoContratoMatch = filters.tipoContrato.length === 0 || (employee.tipoContratoId && filters.tipoContrato.includes(employee.tipoContratoId));
      const sedeMatch = filters.sede.length === 0 || (employee.sedeId && filters.sede.includes(employee.sedeId));

      return employee.activo && divisionMatch && coordinadorMatch && scrumMasterMatch && proyectoMatch && tipoContratoMatch && sedeMatch;
    });
  }, [employeesData, filters]);

  // Filtered employees for matrix (with name/dni filters)
  const matrixEmployees = useMemo(() => {
    let employees = filteredEmployees;

    if (matrixFilters.name) {
      employees = employees.filter(e =>
        e.apellidosNombres.toLowerCase().includes(matrixFilters.name.toLowerCase())
      );
    }
    if (matrixFilters.dni) {
      employees = employees.filter(e => e.dni.includes(matrixFilters.dni));
    }

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
  }, [filteredEmployees, matrixFilters, statusFilter, attendanceData]);

  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    const filteredEmployeeIds = new Set(filteredEmployees.map(e => e.dni));

    attendanceData.forEach(att => {
      if (!att.employeeId || !att.timestamp || !filteredEmployeeIds.has(att.employeeId)) return;
      // Usar format para consistencia con el formato usado en el registrador
      const dateStr = format(att.timestamp.toDate(), 'yyyy-MM-dd');
      if (!matrix[att.employeeId]) {
        matrix[att.employeeId] = {};
      }
      // Check if there's a justification for this absence
      let status: string = att.status;
      if (status === 'Falta' && justificationMap[att.employeeId]?.[dateStr]) {
        status = 'Falta Justificada';
      }
      matrix[att.employeeId][dateStr] = status;
    });
    return matrix;
  }, [attendanceData, filteredEmployees, justificationMap]);

  // Calculate stats - using TOTALS, not averages
  const stats = useMemo(() => {
    if (filteredEmployees.length === 0 || workingDays.length === 0) {
      return {
        total: filteredEmployees.length,
        presentes: 0,
        tardanzas: 0,
        faltas: 0,
        faltasJustificadas: 0,
        faltasInjustificadas: 0,
        totalRegistros: 0
      };
    }

    let totalPresentes = 0;
    let totalTardanzas = 0;
    let totalFaltas = 0;
    let totalFaltasJustificadas = 0;

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
          case 'Falta Justificada':
            totalFaltasJustificadas++;
            break;
        }
      });
    });

    const totalFaltasTotal = totalFaltas + totalFaltasJustificadas;
    const totalRegistros = totalPresentes + totalTardanzas + totalFaltasTotal;

    return {
      total: filteredEmployees.length,
      presentes: totalPresentes,
      tardanzas: totalTardanzas,
      faltas: totalFaltasTotal,
      faltasJustificadas: totalFaltasJustificadas,
      faltasInjustificadas: totalFaltas,
      totalRegistros
    };
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  // Division grouped data with 4 states
  const divisionGroupedData = useMemo(() => {
    if (!divisionsData || filteredEmployees.length === 0 || workingDays.length === 0) return [];

    const divisionStats: Record<string, {
      presentes: number,
      tardanzas: number,
      faltas: number,
      faltasJustificadas: number,
      employeeCount: number
    }> = {};

    divisionsData.forEach(division => {
      const employeesInDivision = filteredEmployees.filter(e => e.divisionId === division.id);
      if (employeesInDivision.length > 0) {
        divisionStats[division.id] = {
          presentes: 0,
          tardanzas: 0,
          faltas: 0,
          faltasJustificadas: 0,
          employeeCount: employeesInDivision.length
        };

        workingDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          employeesInDivision.forEach(employee => {
            const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
            switch (status) {
              case 'Presente':
                divisionStats[division.id].presentes++;
                break;
              case 'Tardanza':
                divisionStats[division.id].tardanzas++;
                break;
              case 'Falta':
                divisionStats[division.id].faltas++;
                break;
              case 'Falta Justificada':
                divisionStats[division.id].faltasJustificadas++;
                break;
            }
          });
        });
      }
    });

    return Object.entries(divisionStats).map(([divisionId, stat]) => {
      const division = divisionsData.find(d => d.id === divisionId);
      const totalPossible = stat.employeeCount * workingDays.length;
      return {
        name: division?.nombreDivision || 'N/A',
        Presentes: totalPossible > 0 ? Number(((stat.presentes / totalPossible) * 100).toFixed(1)) : 0,
        Tardanzas: totalPossible > 0 ? Number(((stat.tardanzas / totalPossible) * 100).toFixed(1)) : 0,
        'Faltas Injustificadas': totalPossible > 0 ? Number(((stat.faltas / totalPossible) * 100).toFixed(1)) : 0,
        'Faltas Justificadas': totalPossible > 0 ? Number(((stat.faltasJustificadas / totalPossible) * 100).toFixed(1)) : 0,
      };
    }).filter(d => d.name !== 'N/A');
  }, [filteredEmployees, divisionsData, attendanceMatrix, workingDays]);

  // Status distribution for donut chart (Faltas Justificadas se integran con Presentes)
  const statusDistribution = useMemo(() => {
    return [
      { name: 'Presentes', value: stats.presentes + stats.faltasJustificadas, fill: 'hsl(var(--color-ingreso))' },
      { name: 'Tardanzas', value: stats.tardanzas, fill: 'hsl(var(--color-ingreso-tarde))' },
      { name: 'Faltas Injustificadas', value: stats.faltasInjustificadas, fill: 'hsl(var(--color-ausencia))' },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Top divisiones con más tardanzas
  const topDivisionsTardanzas = useMemo(() => {
    if (!divisionsData || !employeesData || workingDays.length === 0) return [];

    const divisionTardanzas: Record<string, { name: string; tardanzas: number; totalPossible: number }> = {};

    divisionsData.forEach(division => {
      const employeesInDivision = employeesData.filter(e => e.activo && e.divisionId === division.id);
      if (employeesInDivision.length === 0) return;

      let tardanzas = 0;
      const totalPossible = employeesInDivision.length * workingDays.length;

      workingDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        employeesInDivision.forEach(employee => {
          const status = attendanceMatrix[employee.dni]?.[dateStr];
          if (status === 'Tardanza') tardanzas++;
        });
      });

      divisionTardanzas[division.id] = {
        name: division.nombreDivision,
        tardanzas,
        totalPossible
      };
    });

    return Object.values(divisionTardanzas)
      .map(d => ({
        name: d.name,
        value: d.tardanzas,
        percentage: d.totalPossible > 0 ? (d.tardanzas / d.totalPossible) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .filter(d => d.value > 0);
  }, [divisionsData, employeesData, attendanceMatrix, workingDays]);

  // Top divisiones con más faltas
  const topDivisionsFaltas = useMemo(() => {
    if (!divisionsData || !employeesData || workingDays.length === 0) return [];

    const divisionFaltas: Record<string, { name: string; faltas: number; totalPossible: number }> = {};

    divisionsData.forEach(division => {
      const employeesInDivision = employeesData.filter(e => e.activo && e.divisionId === division.id);
      if (employeesInDivision.length === 0) return;

      let faltas = 0;
      const totalPossible = employeesInDivision.length * workingDays.length;

      workingDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        employeesInDivision.forEach(employee => {
          const status = attendanceMatrix[employee.dni]?.[dateStr];
          if (status === 'Falta' || status === 'Falta Justificada') faltas++;
        });
      });

      divisionFaltas[division.id] = {
        name: division.nombreDivision,
        faltas,
        totalPossible
      };
    });

    return Object.values(divisionFaltas)
      .map(d => ({
        name: d.name,
        value: d.faltas,
        percentage: d.totalPossible > 0 ? (d.faltas / d.totalPossible) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .filter(d => d.value > 0);
  }, [divisionsData, employeesData, attendanceMatrix, workingDays]);

  // Empleados con más tardanzas
  const employeesTardanzas = useMemo(() => {
    if (!filteredEmployees || workingDays.length === 0) return [];

    const totalPossible = workingDays.length;

    return filteredEmployees
      .map(employee => {
        let tardanzas = 0;
        workingDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = attendanceMatrix[employee.dni]?.[dateStr];
          if (status === 'Tardanza') tardanzas++;
        });
        return {
          name: employee.apellidosNombres,
          dni: employee.dni,
          count: tardanzas,
          percentage: totalPossible > 0 ? (tardanzas / totalPossible) * 100 : 0
        };
      })
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  // Empleados con más faltas
  const employeesFaltas = useMemo(() => {
    if (!filteredEmployees || workingDays.length === 0) return [];

    const totalPossible = workingDays.length;

    return filteredEmployees
      .map(employee => {
        let faltas = 0;
        workingDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const status = attendanceMatrix[employee.dni]?.[dateStr];
          if (status === 'Falta' || status === 'Falta Justificada') faltas++;
        });
        return {
          name: employee.apellidosNombres,
          dni: employee.dni,
          count: faltas,
          percentage: totalPossible > 0 ? (faltas / totalPossible) * 100 : 0
        };
      })
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  // Daily line chart data
  const dailyLineData = useMemo(() => {
    if (workingDays.length === 0 || filteredEmployees.length === 0) return [];

    return workingDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let presentes = 0, tardanzas = 0, faltas = 0, faltasJustificadas = 0;

      filteredEmployees.forEach(employee => {
        const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
        switch (status) {
          case 'Presente': presentes++; break;
          case 'Tardanza': tardanzas++; break;
          case 'Falta': faltas++; break;
          case 'Falta Justificada': faltasJustificadas++; break;
        }
      });

      return {
        date: format(day, 'dd/MM'),
        fullDate: dateStr,
        Presentes: presentes,
        Tardanzas: tardanzas,
        'Faltas Injustificadas': faltas,
        'Faltas Justificadas': faltasJustificadas,
      };
    });
  }, [workingDays, filteredEmployees, attendanceMatrix]);

  const handleStatusFilter = (status: AttendanceStatus | null) => {
    setStatusFilter(prev => prev === status ? null : status);
  }

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setMatrixFilters({ name: '', dni: '' });
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
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total Empleados" value={stats.total} icon={Users} />
            <StatCard
              title="Total Presentes"
              value={stats.presentes}
              icon={UserCheck}
              color="text-[hsl(var(--color-ingreso))]"
              onClick={() => handleStatusFilter('Presente')}
              isActive={statusFilter === 'Presente'}
            />
            <StatCard
              title="Total Tardanzas"
              value={stats.tardanzas}
              icon={Clock}
              color="text-[hsl(var(--color-ingreso-tarde))]"
              onClick={() => handleStatusFilter('Tardanza')}
              isActive={statusFilter === 'Tardanza'}
            />
            <StatCard
              title="Total Ausencias"
              value={stats.faltas}
              subtitle={`${stats.faltasJustificadas} just. / ${stats.faltasInjustificadas} injust.`}
              icon={UserX}
              color="text-[hsl(var(--color-ausencia))]"
              onClick={() => handleStatusFilter('Falta')}
              isActive={statusFilter === 'Falta'}
            />
            <StatCard
              title="Total Registros"
              value={stats.totalRegistros}
              icon={CheckCircle}
              color="text-primary"
            />
          </div>

          {/* Gráficos de distribución lado a lado */}
          <div className="grid gap-4 lg:grid-cols-3">
            <DonutChart
              data={statusDistribution}
              title="Distribución de Estados"
              total={stats.totalRegistros}
            />
            <div className="lg:col-span-2">
              <DivisionGroupedChart
                data={divisionGroupedData}
                title="Distribución de Estados por División (%)"
              />
            </div>
          </div>

          {/* Gráfico lineal diario */}
          <DailyLineChart
            data={dailyLineData}
            title="Registros Diarios por Estado"
          />

          {/* Top Divisiones - Tardanzas y Faltas */}
          <div className="grid gap-4 md:grid-cols-2">
            <TopDivisionsChart
              data={topDivisionsTardanzas}
              title="Top Divisiones con más Tardanzas"
              color="hsl(var(--color-ingreso-tarde))"
              valueLabel="Tardanzas"
            />
            <TopDivisionsChart
              data={topDivisionsFaltas}
              title="Top Divisiones con más Faltas"
              color="hsl(var(--color-ausencia))"
              valueLabel="Faltas"
            />
          </div>

          {/* Ranking de Empleados - Tardanzas y Faltas */}
          <div className="grid gap-4 md:grid-cols-2">
            <EmployeeRankingTable
              data={employeesTardanzas}
              title="Empleados con más Tardanzas"
              countLabel="Tardanzas"
              color="yellow"
            />
            <EmployeeRankingTable
              data={employeesFaltas}
              title="Empleados con más Faltas"
              countLabel="Faltas"
              color="red"
            />
          </div>

          {/* Matriz de Registros */}
          <AttendanceMatrixTable
            employees={matrixEmployees}
            attendanceMatrix={attendanceMatrix}
            workingDays={workingDays}
            filters={matrixFilters}
            setFilters={setMatrixFilters}
          />
        </div>
      )}
    </div>
  );
}
