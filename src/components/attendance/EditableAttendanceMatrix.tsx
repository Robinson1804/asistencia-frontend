'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Employee, AttendanceStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, HelpCircle, ChevronLeft, ChevronRight, FileCheck, Save, ArrowUpDown, ArrowDown, ArrowUp, Download, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface EditableAttendanceMatrixProps {
  employees: Employee[];
  attendanceMatrix: Record<string, Record<string, string>>;
  workingDays: Date[];
  filters: { name: string; dni: string };
  setFilters: (filters: { name: string; dni: string }) => void;
  onAttendanceChange: (employeeDni: string, dateStr: string, status: AttendanceStatus) => void;
  pendingChanges: Record<string, Record<string, AttendanceStatus>>;
  onSave: () => void;
  isSaving: boolean;
}

const ITEMS_PER_PAGE = 15;

type SortOrder = 'none' | 'desc' | 'asc';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'Presente', label: 'Presente', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  { value: 'Tardanza', label: 'Tardanza', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' },
  { value: 'Falta', label: 'Falta', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
];

export function EditableAttendanceMatrix({
  employees,
  attendanceMatrix,
  workingDays,
  filters,
  setFilters,
  onAttendanceChange,
  pendingChanges,
  onSave,
  isSaving
}: EditableAttendanceMatrixProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortByAbsence, setSortByAbsence] = useState<SortOrder>('none');

  // Count pending changes
  const pendingChangesCount = useMemo(() => {
    let count = 0;
    Object.values(pendingChanges).forEach(dateChanges => {
      count += Object.keys(dateChanges).length;
    });
    return count;
  }, [pendingChanges]);

  // Calculate absence percentage for each employee
  const calculateAbsencePercentage = (employeeDni: string): number => {
    if (workingDays.length === 0) return 0;

    let absences = 0;
    workingDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      // Check pending changes first, then original matrix
      const status: string = pendingChanges[employeeDni]?.[dateStr] || attendanceMatrix[employeeDni]?.[dateStr] || 'No Registrado';
      if (status === 'Falta' || status === 'Falta Justificada') {
        absences++;
      }
    });

    return (absences / workingDays.length) * 100;
  };

  // Sort employees by absence percentage
  const sortedEmployees = useMemo(() => {
    if (sortByAbsence === 'none') return employees;

    return [...employees].sort((a, b) => {
      const aPercentage = calculateAbsencePercentage(a.dni);
      const bPercentage = calculateAbsencePercentage(b.dni);

      if (sortByAbsence === 'desc') {
        return bPercentage - aPercentage;
      } else {
        return aPercentage - bPercentage;
      }
    });
  }, [employees, sortByAbsence, workingDays, attendanceMatrix, pendingChanges]);

  const totalPages = Math.ceil(sortedEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedEmployees, currentPage]);

  // Reset to page 1 when employees change
  useEffect(() => {
    setCurrentPage(1);
  }, [employees.length, sortByAbsence]);

  const handleSortClick = () => {
    setSortByAbsence(prev => {
      if (prev === 'none') return 'desc';
      if (prev === 'desc') return 'asc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    if (sortByAbsence === 'desc') return <ArrowDown className="h-3 w-3 ml-1" />;
    if (sortByAbsence === 'asc') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Presente':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'Tardanza':
        return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'Falta':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'Falta Justificada':
        return <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Presente':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'Tardanza':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Falta':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'Falta Justificada':
        return 'bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800/20';
    }
  };

  const getAbsenceColor = (percentage: number) => {
    if (percentage >= 20) return 'text-red-600 dark:text-red-400 font-bold';
    if (percentage >= 10) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
    return 'text-green-600 dark:text-green-400';
  };

  const statusLabels: Record<string, string> = {
    Presente: 'Presente',
    Tardanza: 'Tardanza',
    Falta: 'Falta Injustificada',
    'Falta Justificada': 'Falta Justificada',
    'No Registrado': 'No Registrado',
  };

  const handleStatusSelect = (employeeDni: string, dateStr: string, status: AttendanceStatus) => {
    onAttendanceChange(employeeDni, dateStr, status);
  };

  const handleExportExcel = () => {
    // Preparar datos para Excel usando todos los empleados filtrados (no paginados)
    const excelData = sortedEmployees.map((employee) => {
      const row: Record<string, string | number> = {
        'Apellidos y Nombres': employee.apellidosNombres,
        'DNI': employee.dni,
      };

      // Agregar columnas por cada día
      workingDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayHeader = format(day, 'EEE d', { locale: es });
        const originalStatus = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
        const currentStatus = pendingChanges[employee.dni]?.[dateStr] || originalStatus;

        // Usar abreviaciones para el Excel
        const statusAbbrev: Record<string, string> = {
          'Presente': 'P',
          'Tardanza': 'T',
          'Falta': 'F',
          'Falta Justificada': 'FJ',
          'No Registrado': '-',
        };
        row[dayHeader] = statusAbbrev[currentStatus] || currentStatus;
      });

      // Agregar columna de % Ausencias
      const absencePercentage = calculateAbsencePercentage(employee.dni);
      row['% Ausencias'] = `${absencePercentage.toFixed(1)}%`;

      return row;
    });

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 35 }, // Apellidos y Nombres
      { wch: 12 }, // DNI
      ...workingDays.map(() => ({ wch: 8 })), // Días
      { wch: 12 }, // % Ausencias
    ];
    worksheet['!cols'] = colWidths;

    // Generar nombre del archivo con fecha
    const dateRange = workingDays.length > 0
      ? `${format(workingDays[0], 'dd-MM-yyyy')}_${format(workingDays[workingDays.length - 1], 'dd-MM-yyyy')}`
      : format(new Date(), 'dd-MM-yyyy');
    const fileName = `Asistencias_${dateRange}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Matriz de Registros</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {pendingChangesCount > 0 && (
              <Badge variant="secondary" className="mr-2">
                {pendingChangesCount} cambio{pendingChangesCount > 1 ? 's' : ''} pendiente{pendingChangesCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button variant="outline" onClick={handleExportExcel} disabled={sortedEmployees.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button onClick={onSave} disabled={isSaving || pendingChangesCount === 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <Label htmlFor="matrix-name-filter">Apellidos y Nombres</Label>
            <Input
              id="matrix-name-filter"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="Buscar por nombre..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="matrix-dni-filter">DNI</Label>
            <Input
              id="matrix-dni-filter"
              value={filters.dni}
              onChange={(e) => setFilters({ ...filters, dni: e.target.value })}
              placeholder="Buscar por DNI..."
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-md border">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="sticky left-0 z-20 bg-card min-w-[250px] font-semibold border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                  >
                    Empleado
                  </TableHead>
                  {workingDays.map((day) => (
                    <TableHead key={day.toISOString()} className="text-center min-w-[70px]">
                      <div className="flex flex-col items-center">
                        <span className="text-xs capitalize">{format(day, 'EEE', { locale: es })}</span>
                        <span>{format(day, 'd')}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead
                    className="text-center min-w-[100px] bg-muted/50 font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={handleSortClick}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center">
                        <span className="text-xs">% Ausencias</span>
                        {getSortIcon()}
                      </div>
                      <span className="text-[10px] text-muted-foreground">({workingDays.length} días)</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((employee) => {
                    const absencePercentage = calculateAbsencePercentage(employee.dni);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell
                          className="font-medium sticky left-0 z-10 bg-card min-w-[250px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate max-w-[200px]">{employee.apellidosNombres}</span>
                              <span className="text-xs text-muted-foreground">{employee.dni}</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <button type="button" className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0">
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-semibold">Proyecto:</span> {employee.proyecto?.nombre || '-'}</p>
                                    <p><span className="font-semibold">Coordinador:</span> {employee.coordinador?.nombre || '-'}</p>
                                    <p><span className="font-semibold">Scrum Master:</span> {employee.scrumMaster?.nombre || '-'}</p>
                                    <p><span className="font-semibold">División:</span> {employee.division?.nombre || '-'}</p>
                                    <p><span className="font-semibold">Modalidad:</span> {employee.modalidad?.nombre || '-'}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        {workingDays.map((day) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const originalStatus = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
                          const currentStatus = pendingChanges[employee.dni]?.[dateStr] || originalStatus;
                          const hasChange = pendingChanges[employee.dni]?.[dateStr] !== undefined;

                          return (
                            <TableCell
                              key={dateStr}
                              className={cn(
                                'text-center p-1',
                                getStatusColor(currentStatus),
                                hasChange && 'ring-2 ring-primary ring-inset'
                              )}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="w-full h-full flex justify-center items-center p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex justify-center">
                                            {getStatusIcon(currentStatus)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{statusLabels[currentStatus] || currentStatus}</p>
                                          {hasChange && <p className="text-xs text-primary">Cambio pendiente</p>}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="center">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground mb-2 text-center">
                                      {format(day, 'EEEE d MMM', { locale: es })}
                                    </p>
                                    {STATUS_OPTIONS.map((option) => (
                                      <button
                                        key={option.value}
                                        onClick={() => handleStatusSelect(employee.dni, dateStr, option.value)}
                                        className={cn(
                                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                          currentStatus === option.value
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                        )}
                                      >
                                        <span className={currentStatus === option.value ? 'text-primary-foreground' : option.color}>
                                          {option.icon}
                                        </span>
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        })}
                        <TableCell className={cn('text-center bg-muted/30', getAbsenceColor(absencePercentage))}>
                          {absencePercentage.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={workingDays.length + 2} className="h-24 text-center">
                      No hay empleados para mostrar con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, employees.length)} de {employees.length} empleados
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Presente</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span>Tardanza</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Falta Injust.</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <FileCheck className="h-4 w-4 text-blue-600" />
            <span>Falta Just.</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <span>No Registrado</span>
          </div>
          <div className="border-l pl-4 flex items-center gap-2 text-sm">
            <span className="font-medium">% Ausencias:</span>
            <span className="text-green-600">&lt;10%</span>
            <span className="text-yellow-600">10-20%</span>
            <span className="text-red-600">&gt;20%</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          💡 Haz clic en cualquier celda para cambiar el estado. Los cambios se guardan en caché hasta que presiones "Guardar Cambios".
        </p>
      </CardContent>
    </Card>
  );
}
