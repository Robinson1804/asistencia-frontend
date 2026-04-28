'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApiData } from '@/hooks/use-api-data';
import { apiFetch } from '@/lib/api';
import { format, startOfDay, eachDayOfInterval, getDay, startOfMonth, endOfMonth } from 'date-fns';
import type { Employee, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede, AttendanceStatus, AttendanceRecord } from '@/types';
import { EditableAttendanceMatrix } from '@/components/attendance/EditableAttendanceMatrix';
import { Filters } from '@/components/dashboard/Filters';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

function makeInitialFilters() {
  const now = new Date();
  return {
    dateRange: { from: startOfMonth(now), to: endOfMonth(now) } as { from: Date; to: Date } | undefined,
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    division: 'all', coordinador: 'all', scrumMaster: 'all',
    proyecto: [] as string[], tipoContrato: [] as string[], sede: [] as string[],
  };
}

function mapEmployee(row: any): Employee {
  return {
    ...row,
    apellidosNombres: row.apellidos_nombres,
    divisionId: row.division_id,
    coordinadorId: row.coordinador_id,
    scrumMasterId: row.scrum_master_id,
    sedeId: row.sede_id,
    proyectoId: row.proyecto_id,
    tipoContratoId: row.tipo_contrato_id,
    proyecto: row.nombre_proyecto ? { nombre: row.nombre_proyecto } : undefined,
    modalidad: row.nombre_modalidad ? { nombre: row.nombre_modalidad } : undefined,
    coordinador: row.nombre_coordinador ? { nombre: row.nombre_coordinador } : undefined,
    scrumMaster: row.nombre_scrum_master ? { nombre: row.nombre_scrum_master } : undefined,
    division: row.nombre_division ? { nombre: row.nombre_division } : undefined,
    sede: row.nombre_sede ? { nombre: row.nombre_sede } : undefined,
  };
}

export default function AttendanceMatrixPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState(makeInitialFilters);
  const [matrixFilters, setMatrixFilters] = useState({ name: '', dni: '' });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, AttendanceStatus>>>({});

  const { data: rawEmployees } = useApiData<any>('/api/empleados');
  const { data: divisionsData } = useApiData<Division>('/api/divisiones');
  const { data: coordinadoresData } = useApiData<Coordinador>('/api/coordinadores');
  const { data: scrumMastersData } = useApiData<ScrumMaster>('/api/scrum-masters');
  const { data: proyectosData } = useApiData<Proyecto>('/api/proyectos');
  const { data: tiposContratoData } = useApiData<TipoContrato>('/api/tipos-contrato?activo=true');
  const { data: sedesData } = useApiData<Sede>('/api/sedes?activo=true');

  const employeesData = useMemo(() => rawEmployees?.map(mapEmployee) || [], [rawEmployees]);


  useEffect(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) { setIsLoading(false); return; }
    setIsLoading(true);
    const from = format(startOfDay(filters.dateRange.from), 'yyyy-MM-dd');
    const to = format(startOfDay(filters.dateRange.to), 'yyyy-MM-dd');
    apiFetch(`/api/asistencias?from=${from}&to=${to}`)
      .then(data => { setAttendanceData(data); setPendingChanges({}); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [filters.dateRange]);

  const workingDays = useMemo(() => {
    const { from, to } = filters.dateRange || {};
    if (!from || !to) return [];
    return eachDayOfInterval({ start: from, end: to }).filter(d => { const dw = getDay(d); return dw !== 0 && dw !== 6; });
  }, [filters.dateRange]);

  const filteredEmployees = useMemo(() => employeesData.filter((e: Employee) => {
    const dm = filters.division === 'all' || e.divisionId === filters.division;
    const cm = filters.coordinador === 'all' || e.coordinadorId === filters.coordinador;
    const sm = filters.scrumMaster === 'all' || e.scrumMasterId === filters.scrumMaster;
    const pm = filters.proyecto.length === 0 || (e.proyectoId && filters.proyecto.includes(e.proyectoId));
    const tm = filters.tipoContrato.length === 0 || (e.tipoContratoId && filters.tipoContrato.includes(e.tipoContratoId));
    const sem = filters.sede.length === 0 || (e.sedeId && filters.sede.includes(e.sedeId));
    return e.activo && dm && cm && sm && pm && tm && sem;
  }), [employeesData, filters]);

  const matrixEmployees = useMemo(() => {
    let emps = filteredEmployees;
    if (matrixFilters.name) emps = emps.filter((e: Employee) => e.apellidosNombres.toLowerCase().includes(matrixFilters.name.toLowerCase()));
    if (matrixFilters.dni) emps = emps.filter((e: Employee) => e.dni.includes(matrixFilters.dni));
    return emps;
  }, [filteredEmployees, matrixFilters]);

  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};
    const ids = new Set(filteredEmployees.map((e: Employee) => e.dni));
    attendanceData.forEach((att: any) => {
      if (!att.dni || !ids.has(att.dni)) return;
      if (!matrix[att.dni]) matrix[att.dni] = {};
      matrix[att.dni][String(att.fecha).slice(0, 10)] = att.status;
    });
    return matrix;
  }, [attendanceData, filteredEmployees]);

  const handleAttendanceChange = (employeeDni: string, dateStr: string, status: AttendanceStatus) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      if (!next[employeeDni]) next[employeeDni] = {};
      const original = attendanceMatrix[employeeDni]?.[dateStr] || 'No Registrado';
      if (status === original) {
        delete next[employeeDni][dateStr];
        if (Object.keys(next[employeeDni]).length === 0) delete next[employeeDni];
      } else {
        next[employeeDni][dateStr] = status;
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    const changesCount = Object.values(pendingChanges).reduce((acc, d) => acc + Object.keys(d).length, 0);
    if (changesCount === 0) { toast({ title: 'Sin cambios' }); return; }
    setIsSaving(true);
    try {
      // Agrupar por fecha para enviar en batches por fecha
      const byDate: Record<string, any[]> = {};
      Object.entries(pendingChanges).forEach(([dni, dates]) => {
        const emp = employeesData.find((e: Employee) => e.dni === dni);
        if (!emp) return;
        Object.entries(dates).forEach(([fecha, status]) => {
          if (!byDate[fecha]) byDate[fecha] = [];
          byDate[fecha].push({ employee_id: emp.id, status });
        });
      });

      await Promise.all(Object.entries(byDate).map(([fecha, records]) =>
        apiFetch('/api/asistencias/batch', { method: 'POST', body: JSON.stringify({ fecha, records }) })
      ));

      // Refrescar
      const from = format(startOfDay(filters.dateRange!.from), 'yyyy-MM-dd');
      const to = format(startOfDay(filters.dateRange!.to), 'yyyy-MM-dd');
      const refreshed = await apiFetch(`/api/asistencias?from=${from}&to=${to}`);
      setAttendanceData(refreshed);
      setPendingChanges({});
      toast({ title: '✓ Cambios guardados', description: `${changesCount} registros guardados.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Registro de Asistencia</h1>
        <p className="text-muted-foreground">Gestiona la asistencia de los empleados por rango de fechas.</p>
      </div>
      <Filters
        filters={filters} setFilters={setFilters}
        divisions={divisionsData || []} coordinadores={coordinadoresData || []}
        scrumMasters={scrumMastersData || []} proyectos={proyectosData || []}
        tiposContrato={tiposContratoData || []} sedes={sedesData || []}
        onClear={() => { setFilters(makeInitialFilters()); setMatrixFilters({ name: '', dni: '' }); }}
      />
      {isLoading ? (
        <div className="text-center p-8">Cargando datos...</div>
      ) : (
        <div className="mt-8">
          <EditableAttendanceMatrix
            employees={matrixEmployees} attendanceMatrix={attendanceMatrix}
            workingDays={workingDays} filters={matrixFilters} setFilters={setMatrixFilters}
            onAttendanceChange={handleAttendanceChange} pendingChanges={pendingChanges}
            onSave={handleSaveChanges} isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
