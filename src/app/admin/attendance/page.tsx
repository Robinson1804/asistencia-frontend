'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, writeBatch, doc } from 'firebase/firestore';
import type { Employee, Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede, AttendanceStatus, AttendanceRecord } from '@/types';
import { startOfDay, endOfDay, eachDayOfInterval, getDay, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

import { EditableAttendanceMatrix } from '@/components/attendance/EditableAttendanceMatrix';
import { Filters } from '@/components/dashboard/Filters';
import { useToast } from '@/hooks/use-toast';

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

export default function AttendanceMatrixPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [matrixFilters, setMatrixFilters] = useState({ name: '', dni: '' });

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Pending changes cache: { employeeDni: { dateStr: status } }
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, AttendanceStatus>>>({});

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

  // Fetch attendance data
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !filters.dateRange?.from || !filters.dateRange?.to) {
        setAttendanceData([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const start = Timestamp.fromDate(startOfDay(filters.dateRange.from));
      const end = Timestamp.fromDate(endOfDay(filters.dateRange.to));

      try {
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

        setAttendanceData(attendances);
        // Clear pending changes when data refreshes
        setPendingChanges({});
      } catch (error) {
        console.error("Error fetching data: ", error);
        setAttendanceData([]);
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

    return employees;
  }, [filteredEmployees, matrixFilters]);

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
      matrix[att.employeeId][dateStr] = att.status;
    });
    return matrix;
  }, [attendanceData, filteredEmployees]);

  const handleAttendanceChange = (employeeDni: string, dateStr: string, status: AttendanceStatus) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      if (!newChanges[employeeDni]) {
        newChanges[employeeDni] = {};
      }

      // Check if the new status is different from original
      const originalStatus = attendanceMatrix[employeeDni]?.[dateStr] || 'No Registrado';
      if (status === originalStatus) {
        // Remove from pending changes if it's the same as original
        delete newChanges[employeeDni][dateStr];
        if (Object.keys(newChanges[employeeDni]).length === 0) {
          delete newChanges[employeeDni];
        }
      } else {
        newChanges[employeeDni][dateStr] = status;
      }

      return newChanges;
    });
  };

  const handleSaveChanges = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
      return;
    }

    const changesCount = Object.values(pendingChanges).reduce((acc, dateChanges) => acc + Object.keys(dateChanges).length, 0);

    if (changesCount === 0) {
      toast({ title: 'Sin cambios', description: 'No hay cambios pendientes para guardar.' });
      return;
    }

    setIsSaving(true);

    try {
      const batches: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(firestore);
      let operationCount = 0;
      const MAX_BATCH_SIZE = 500;

      Object.entries(pendingChanges).forEach(([employeeDni, dateChanges]) => {
        Object.entries(dateChanges).forEach(([dateStr, status]) => {
          const compositeId = `${employeeDni}_${dateStr}`;
          const docRef = doc(firestore, 'asistencias', compositeId);

          // Usar startOfDay igual que el registrador para consistencia
          // Parsear la fecha y usar startOfDay para asegurar consistencia
          const attendanceDate = startOfDay(parseISO(dateStr));
          const attendanceTimestamp = Timestamp.fromDate(attendanceDate);

          const payload = {
            employeeId: employeeDni,
            status,
            timestamp: attendanceTimestamp,
            updatedAt: Timestamp.now(),
          };

          currentBatch.set(docRef, payload, { merge: true });
          operationCount++;

          if (operationCount >= MAX_BATCH_SIZE) {
            batches.push(currentBatch);
            currentBatch = writeBatch(firestore);
            operationCount = 0;
          }
        });
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      // Refrescar datos de asistencia después de guardar
      const start = Timestamp.fromDate(startOfDay(filters.dateRange!.from));
      const end = Timestamp.fromDate(endOfDay(filters.dateRange!.to));

      const attendanceQuery = query(
        collection(firestore, 'asistencias'),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendances = attendanceSnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as AttendanceRecord));

      setAttendanceData(attendances);
      setPendingChanges({});

      toast({
        title: '✓ Cambios guardados exitosamente',
        description: `Se guardaron ${changesCount} registros de asistencia.`,
      });
    } catch (error) {
      console.error('Error saving changes: ', error);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setMatrixFilters({ name: '', dni: '' });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Registro de Asistencia</h1>
        <p className="text-muted-foreground">Gestiona la asistencia de los empleados por rango de fechas.</p>
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
        <div className="text-center p-8">Cargando datos...</div>
      ) : (
        <div className="mt-8">
          <EditableAttendanceMatrix
            employees={matrixEmployees}
            attendanceMatrix={attendanceMatrix}
            workingDays={workingDays}
            filters={matrixFilters}
            setFilters={setMatrixFilters}
            onAttendanceChange={handleAttendanceChange}
            pendingChanges={pendingChanges}
            onSave={handleSaveChanges}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
