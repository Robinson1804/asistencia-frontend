
'use client';

import { useState, useMemo } from 'react';
import type { Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type FilterStatus = 'Falta' | 'Tardanza' | 'No Registrado';

interface AttendanceDetailTableProps {
  employees: Employee[];
}

export function AttendanceDetailTable({ employees }: AttendanceDetailTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Falta');

  const filteredData = useMemo(() => {
    return employees.filter(employee => employee.status === activeFilter);
  }, [employees, activeFilter]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Falta': return 'destructive';
      case 'Tardanza': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle de Empleados por Estado</CardTitle>
        <div className="flex space-x-2 pt-2">
          {(['Falta', 'Tardanza', 'No Registrado'] as FilterStatus[]).map(status => (
            <Button
              key={status}
              variant={activeFilter === status ? 'default' : 'outline'}
              onClick={() => setActiveFilter(status)}
              className={cn(
                activeFilter === status && status === 'Falta' && 'bg-[hsl(var(--color-falta))] hover:bg-[hsl(var(--color-falta))]',
                activeFilter === status && status === 'Tardanza' && 'bg-[hsl(var(--color-tardanza))] hover:bg-[hsl(var(--color-tardanza))] text-black',
              )}
            >
              {status}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellidos y Nombres</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>División</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.apellidosNombres}</TableCell>
                    <TableCell>{employee.dni}</TableCell>
                    <TableCell>{employee.sede?.nombre || 'N/A'}</TableCell>
                    <TableCell>{employee.division?.nombre || 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(employee.status!)}>
                            {employee.status}
                        </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No hay empleados con el estado "{activeFilter}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
