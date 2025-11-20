
'use client';
import { useMemo } from 'react';
import type { Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AttendanceMatrixTableProps {
  employees: Employee[];
  attendanceMatrix: Record<string, Record<string, string>>;
  workingDays: Date[];
}

export function AttendanceMatrixTable({ employees, attendanceMatrix, workingDays }: AttendanceMatrixTableProps) {

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Presente': return 'default';
      case 'Tardanza': return 'secondary';
      case 'Falta': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'Presente': return 'bg-green-100 dark:bg-green-900/50';
        case 'Tardanza': return 'bg-yellow-100 dark:bg-yellow-900/50';
        case 'Falta': return 'bg-red-100 dark:bg-red-900/50';
        default: return 'bg-gray-100 dark:bg-gray-800/50';
    }
  }
  
  const statusDisplay: Record<string, string> = {
    'Presente': 'Presente',
    'Tardanza': 'Tardanza',
    'Falta': 'Falta',
    'No Registrado': 'N/R'
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Registros</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 w-[250px] font-semibold">Empleado</TableHead>
                {workingDays.map(day => (
                  <TableHead key={day.toISOString()} className="text-center">
                    <div className="flex flex-col items-center">
                        <span className="text-xs capitalize">{format(day, 'EEE', { locale: es })}</span>
                        <span>{format(day, 'd')}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length > 0 ? (
                employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10 w-[250px]">{employee.apellidosNombres}</TableCell>
                    {workingDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const status = attendanceMatrix[employee.dni]?.[dateStr] || 'No Registrado';
                      return (
                        <TableCell key={dateStr} className={cn("text-center p-2", getStatusColor(status))}>
                          <Badge variant={getStatusVariant(status)} className="w-24 justify-center text-[10px] p-1">
                            {statusDisplay[status] || status}
                          </Badge>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={workingDays.length + 1} className="h-24 text-center">
                    No hay empleados para mostrar con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
