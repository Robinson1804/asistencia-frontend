'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApiData } from '@/hooks/use-api-data';
import { apiFetch } from '@/lib/api';
import { format, startOfDay, endOfDay, eachDayOfInterval, getDay, startOfMonth, endOfMonth } from 'date-fns';
import type { Employee, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede, AttendanceStatus, AttendanceRecord, Justification } from '@/types';

import { Filters } from '@/components/dashboard/Filters';
import { StatCard } from '@/components/dashboard/StatCard';
import { DivisionGroupedChart } from '@/components/dashboard/DivisionGroupedChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { AttendanceMatrixTable } from '@/components/dashboard/AttendanceMatrixTable';
import { DailyLineChart } from '@/components/dashboard/DailyLineChart';
import { TopDivisionsChart } from '@/components/dashboard/TopDivisionsChart';
import { EmployeeRankingTable } from '@/components/dashboard/EmployeeRankingTable';
import { Users, UserCheck, UserX, Clock, CheckCircle } from 'lucide-react';

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

// Mapea filas de PostgreSQL al tipo Employee esperado por los componentes
function mapEmployee(row: any): Employee {
  return {
    ...row,
    id: row.id,
    dni: row.dni,
    apellidosNombres: row.apellidos_nombres,
    activo: row.activo,
    divisionId: row.division_id,
    coordinadorId: row.coordinador_id,
    scrumMasterId: row.scrum_master_id,
    sedeId: row.sede_id,
    proyectoId: row.proyecto_id,
    tipoContratoId: row.tipo_contrato_id,
    modalidadId: row.modalidad_id,
    sede: row.nombre_sede ? { nombre: row.nombre_sede } : undefined,
    division: row.nombre_division ? { nombre: row.nombre_division } : undefined,
    proyecto: row.nombre_proyecto ? { nombre: row.nombre_proyecto } : undefined,
    modalidad: row.nombre_modalidad ? { nombre: row.nombre_modalidad } : undefined,
    coordinador: row.nombre_coordinador ? { nombre: row.nombre_coordinador } : undefined,
    scrumMaster: row.nombre_scrum_master ? { nombre: row.nombre_scrum_master } : undefined,
  };
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [matrixFilters, setMatrixFilters] = useState({ name: '', dni: '' });
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [justificationsData, setJustificationsData] = useState<Justification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | null>(null);

  const { data: rawEmployees } = useApiData<any>('/api/empleados');
  const { data: divisionsData } = useApiData<Division>('/api/divisiones');
  const { data: coordinadoresData } = useApiData<Coordinador>('/api/coordinadores');
  const { data: scrumMastersData } = useApiData<ScrumMaster>('/api/scrum-masters');
  const { data: proyectosData } = useApiData<Proyecto>('/api/proyectos');
  const { data: tiposContratoData } = useApiData<TipoContrato>('/api/tipos-contrato?activo=true');
  const { data: sedesData } = useApiData<Sede>('/api/sedes?activo=true');

  const employeesData = useMemo(() => rawEmployees?.map(mapEmployee) || [], [rawEmployees]);

  // Filtros por defecto de tipo contrato
  useEffect(() => {
    if (tiposContratoData && tiposContratoData.length > 0 && filters.tipoContrato.length === 0) {
      const defaultTypes = tiposContratoData
        .filter((t: any) =>
          t.tipo_contrato?.toLowerCase().includes('locacion') ||
          t.tipo_contrato?.toLowerCase().includes('locación') ||
          t.tipo_contrato?.toLowerCase().includes('orden de servicio')
        )
        .map((t: any) => t.id);
      if (defaultTypes.length > 0) {
        setFilters(prev => ({ ...prev, tipoContrato: defaultTypes }));
      }
    }
  }, [tiposContratoData]);

  // Cargar asistencias y justificaciones por rango de fecha
  useEffect(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) {
      setAttendanceData([]);
      setJustificationsData([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const from = format(startOfDay(filters.dateRange.from), 'yyyy-MM-dd');
    const to = format(endOfDay(filters.dateRange.to), 'yyyy-MM-dd');

    Promise.all([
      apiFetch(`/api/asistencias?from=${from}&to=${to}`),
      apiFetch(`/api/justificaciones`),
    ]).then(([asistencias, justificaciones]) => {
      // Mapear asistencias de PostgreSQL al tipo AttendanceRecord
      const mapped = asistencias.map((a: any) => ({
        ...a,
        employeeId: a.dni,
        timestamp: { toDate: () => new Date(a.fecha) },
        status: a.status,
      }));
      setAttendanceData(mapped);
      setJustificationsData(justificaciones.map((j: any) => ({
        ...j,
        employeeId: j.employee_id,
        date: { toDate: () => new Date(j.fecha) },
      })));
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, [filters.dateRange]);

  const workingDays = useMemo(() => {
    const { from, to } = filters.dateRange || {};
    if (!from || !to) return [];
    const today = startOfDay(new Date());
    const effectiveTo = to > today ? today : to;
    if (from > effectiveTo) return [];
    return eachDayOfInterval({ start: from, end: effectiveTo })
      .filter(day => { const d = getDay(day); return d !== 0 && d !== 6; });
  }, [filters.dateRange]);

  const justificationMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    justificationsData.forEach((j: any) => {
      if (!j.employeeId || !j.date) return;
      const dateStr = format(j.date.toDate(), 'yyyy-MM-dd');
      if (!map[j.employeeId]) map[j.employeeId] = {};
      map[j.employeeId][dateStr] = true;
    });
    return map;
  }, [justificationsData]);

  const filteredEmployees = useMemo(() => {
    return employeesData.filter((employee: Employee) => {
      const divisionMatch = filters.division === 'all' || employee.divisionId === filters.division;
      const coordinadorMatch = filters.coordinador === 'all' || employee.coordinadorId === filters.coordinador;
      const scrumMasterMatch = filters.scrumMaster === 'all' || employee.scrumMasterId === filters.scrumMaster;
      const proyectoMatch = filters.proyecto.length === 0 || (employee.proyectoId && filters.proyecto.includes(employee.proyectoId));
      const tipoContratoMatch = filters.tipoContrato.length === 0 || (employee.tipoContratoId && filters.tipoContrato.includes(employee.tipoContratoId));
      const sedeMatch = filters.sede.length === 0 || (employee.sedeId && filters.sede.includes(employee.sedeId));
      return employee.activo && divisionMatch && coordinadorMatch && scrumMasterMatch && proyectoMatch && tipoContratoMatch && sedeMatch;
    });
  }, [employeesData, filters]);

  const matrixEmployees = useMemo(() => {
    let employees = filteredEmployees;
    if (matrixFilters.name)
      employees = employees.filter((e: Employee) => e.apellidosNombres.toLowerCase().includes(matrixFilters.name.toLowerCase()));
    if (matrixFilters.dni)
      employees = employees.filter((e: Employee) => e.dni.includes(matrixFilters.dni));
    if (statusFilter) {
      const ids = new Set(attendanceData.filter((a: any) => a.status === statusFilter).map((a: any) => a.employeeId));
      employees = employees.filter((emp: Employee) => ids.has(emp.dni));
    }
    return employees;
  }, [filteredEmployees, matrixFilters, statusFilter, attendanceData]);

  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    const ids = new Set(filteredEmployees.map((e: Employee) => e.dni));
    attendanceData.forEach((att: any) => {
      if (!att.employeeId || !att.timestamp || !ids.has(att.employeeId)) return;
      const dateStr = format(att.timestamp.toDate(), 'yyyy-MM-dd');
      if (!matrix[att.employeeId]) matrix[att.employeeId] = {};
      let status = att.status;
      if (status === 'Falta' && justificationMap[att.employeeId]?.[dateStr]) status = 'Falta Justificada';
      matrix[att.employeeId][dateStr] = status;
    });
    return matrix;
  }, [attendanceData, filteredEmployees, justificationMap]);

  const stats = useMemo(() => {
    if (filteredEmployees.length === 0 || workingDays.length === 0)
      return { total: filteredEmployees.length, presentes: 0, tardanzas: 0, faltas: 0, faltasJustificadas: 0, faltasInjustificadas: 0, totalRegistros: 0 };

    let presentes = 0, tardanzas = 0, faltas = 0, faltasJust = 0;
    workingDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      filteredEmployees.forEach((emp: Employee) => {
        const s = attendanceMatrix[emp.dni]?.[dateStr] || 'No Registrado';
        if (s === 'Presente') presentes++;
        else if (s === 'Tardanza') tardanzas++;
        else if (s === 'Falta') faltas++;
        else if (s === 'Falta Justificada') faltasJust++;
      });
    });
    return { total: filteredEmployees.length, presentes, tardanzas, faltas: faltas + faltasJust, faltasJustificadas: faltasJust, faltasInjustificadas: faltas, totalRegistros: presentes + tardanzas + faltas + faltasJust };
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  const statusDistribution = useMemo(() => [
    { name: 'Presentes', value: stats.presentes + stats.faltasJustificadas, fill: 'hsl(var(--color-ingreso))' },
    { name: 'Tardanzas', value: stats.tardanzas, fill: 'hsl(var(--color-ingreso-tarde))' },
    { name: 'Faltas Injustificadas', value: stats.faltasInjustificadas, fill: 'hsl(var(--color-ausencia))' },
  ].filter(i => i.value > 0), [stats]);

  const divisionGroupedData = useMemo(() => {
    if (!divisionsData || filteredEmployees.length === 0 || workingDays.length === 0) return [];
    return divisionsData.map((div: any) => {
      const emps = filteredEmployees.filter((e: Employee) => e.divisionId === div.id);
      if (emps.length === 0) return null;
      let p = 0, t = 0, f = 0, fj = 0;
      const total = emps.length * workingDays.length;
      workingDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        emps.forEach((emp: Employee) => {
          const s = attendanceMatrix[emp.dni]?.[dateStr] || 'No Registrado';
          if (s === 'Presente') p++;
          else if (s === 'Tardanza') t++;
          else if (s === 'Falta') f++;
          else if (s === 'Falta Justificada') fj++;
        });
      });
      return {
        name: div.nombre_division || div.nombreDivision,
        Presentes: total > 0 ? Number(((p / total) * 100).toFixed(1)) : 0,
        Tardanzas: total > 0 ? Number(((t / total) * 100).toFixed(1)) : 0,
        'Faltas Injustificadas': total > 0 ? Number(((f / total) * 100).toFixed(1)) : 0,
        'Faltas Justificadas': total > 0 ? Number(((fj / total) * 100).toFixed(1)) : 0,
      };
    }).filter(Boolean);
  }, [filteredEmployees, divisionsData, attendanceMatrix, workingDays]);

  const dailyLineData = useMemo(() => {
    if (workingDays.length === 0 || filteredEmployees.length === 0) return [];
    return workingDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let p = 0, t = 0, f = 0, fj = 0;
      filteredEmployees.forEach((emp: Employee) => {
        const s = attendanceMatrix[emp.dni]?.[dateStr] || 'No Registrado';
        if (s === 'Presente') p++;
        else if (s === 'Tardanza') t++;
        else if (s === 'Falta') f++;
        else if (s === 'Falta Justificada') fj++;
      });
      return { date: format(day, 'dd/MM'), fullDate: dateStr, Presentes: p, Tardanzas: t, 'Faltas Injustificadas': f, 'Faltas Justificadas': fj };
    });
  }, [workingDays, filteredEmployees, attendanceMatrix]);

  const topDivisionsTardanzas = useMemo(() => {
    if (!divisionsData || workingDays.length === 0) return [];
    return divisionsData.map((div: any) => {
      const emps = employeesData.filter((e: Employee) => e.activo && e.divisionId === div.id);
      if (emps.length === 0) return null;
      let tardanzas = 0;
      const total = emps.length * workingDays.length;
      workingDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        emps.forEach((emp: Employee) => { if (attendanceMatrix[emp.dni]?.[dateStr] === 'Tardanza') tardanzas++; });
      });
      return { name: div.nombre_division || div.nombreDivision, value: tardanzas, percentage: total > 0 ? (tardanzas / total) * 100 : 0 };
    }).filter((d: any) => d && d.value > 0).sort((a: any, b: any) => b.value - a.value);
  }, [divisionsData, employeesData, attendanceMatrix, workingDays]);

  const topDivisionsFaltas = useMemo(() => {
    if (!divisionsData || workingDays.length === 0) return [];
    return divisionsData.map((div: any) => {
      const emps = employeesData.filter((e: Employee) => e.activo && e.divisionId === div.id);
      if (emps.length === 0) return null;
      let faltas = 0;
      const total = emps.length * workingDays.length;
      workingDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        emps.forEach((emp: Employee) => {
          const s = attendanceMatrix[emp.dni]?.[dateStr];
          if (s === 'Falta' || s === 'Falta Justificada') faltas++;
        });
      });
      return { name: div.nombre_division || div.nombreDivision, value: faltas, percentage: total > 0 ? (faltas / total) * 100 : 0 };
    }).filter((d: any) => d && d.value > 0).sort((a: any, b: any) => b.value - a.value);
  }, [divisionsData, employeesData, attendanceMatrix, workingDays]);

  const employeesTardanzas = useMemo(() => {
    if (workingDays.length === 0) return [];
    return filteredEmployees.map((emp: Employee) => {
      let count = 0;
      workingDays.forEach(day => { if (attendanceMatrix[emp.dni]?.[format(day, 'yyyy-MM-dd')] === 'Tardanza') count++; });
      return { name: emp.apellidosNombres, dni: emp.dni, count, percentage: (count / workingDays.length) * 100 };
    }).filter((e: any) => e.count > 0).sort((a: any, b: any) => b.count - a.count);
  }, [filteredEmployees, attendanceMatrix, workingDays]);

  const employeesFaltas = useMemo(() => {
    if (workingDays.length === 0) return [];
    return filteredEmployees.map((emp: Employee) => {
      let count = 0;
      workingDays.forEach(day => {
        const s = attendanceMatrix[emp.dni]?.[format(day, 'yyyy-MM-dd')];
        if (s === 'Falta' || s === 'Falta Justificada') count++;
      });
      return { name: emp.apellidosNombres, dni: emp.dni, count, percentage: (count / workingDays.length) * 100 };
    }).filter((e: any) => e.count > 0).sort((a: any, b: any) => b.count - a.count);
  }, [filteredEmployees, attendanceMatrix, workingDays]);

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
        onClear={() => { setFilters(initialFilters); setMatrixFilters({ name: '', dni: '' }); setStatusFilter(null); }}
      />

      {isLoading ? (
        <div className="text-center p-8">Cargando datos del dashboard...</div>
      ) : (
        <div className="space-y-8 mt-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total Empleados" value={stats.total} icon={Users} />
            <StatCard title="Total Presentes" value={stats.presentes} icon={UserCheck} color="text-[hsl(var(--color-ingreso))]" onClick={() => setStatusFilter(p => p === 'Presente' ? null : 'Presente')} isActive={statusFilter === 'Presente'} />
            <StatCard title="Total Tardanzas" value={stats.tardanzas} icon={Clock} color="text-[hsl(var(--color-ingreso-tarde))]" onClick={() => setStatusFilter(p => p === 'Tardanza' ? null : 'Tardanza')} isActive={statusFilter === 'Tardanza'} />
            <StatCard title="Total Ausencias" value={stats.faltas} subtitle={`${stats.faltasJustificadas} just. / ${stats.faltasInjustificadas} injust.`} icon={UserX} color="text-[hsl(var(--color-ausencia))]" onClick={() => setStatusFilter(p => p === 'Falta' ? null : 'Falta')} isActive={statusFilter === 'Falta'} />
            <StatCard title="Total Registros" value={stats.totalRegistros} icon={CheckCircle} color="text-primary" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DonutChart data={statusDistribution} title="Distribución de Estados" total={stats.totalRegistros} />
            <div className="lg:col-span-2">
              <DivisionGroupedChart data={divisionGroupedData} title="Distribución de Estados por División (%)" />
            </div>
          </div>

          <DailyLineChart data={dailyLineData} title="Registros Diarios por Estado" />

          <div className="grid gap-4 md:grid-cols-2">
            <TopDivisionsChart data={topDivisionsTardanzas} title="Top Divisiones con más Tardanzas" color="hsl(var(--color-ingreso-tarde))" valueLabel="Tardanzas" />
            <TopDivisionsChart data={topDivisionsFaltas} title="Top Divisiones con más Faltas" color="hsl(var(--color-ausencia))" valueLabel="Faltas" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EmployeeRankingTable data={employeesTardanzas} title="Empleados con más Tardanzas" countLabel="Tardanzas" color="yellow" />
            <EmployeeRankingTable data={employeesFaltas} title="Empleados con más Faltas" countLabel="Faltas" color="red" />
          </div>

          <AttendanceMatrixTable employees={matrixEmployees} attendanceMatrix={attendanceMatrix} workingDays={workingDays} filters={matrixFilters} setFilters={setMatrixFilters} />
        </div>
      )}
    </div>
  );
}
