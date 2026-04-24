'use client';

import { useState, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Search, UserCheck, UserX, Clock, FileCheck } from 'lucide-react';
import { DatePicker } from '@/components/attendance/DatePicker';
import * as XLSX from 'xlsx';

type Periodo = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';
type StatusFilter = 'todos' | 'falta' | 'tardanza';
type JustFilter = 'todos' | 'si' | 'no';

interface ReporteRow {
  fecha: string;
  status: string;
  apellidos_nombres: string;
  dni: string;
  nombre_sede: string | null;
  justificacion_tipo: string | null;
  justificacion_notas: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  Presente: 'Presente',
  Tardanza: 'Tardanza injustificada',
  'Tardanza Justificada': 'Tardanza justificada',
  Falta: 'Falta injustificada',
  'Falta Justificada': 'Falta justificada',
};

const STATUS_BADGE: Record<string, string> = {
  Presente: 'bg-green-100 text-green-800',
  Tardanza: 'bg-yellow-100 text-yellow-800',
  'Tardanza Justificada': 'bg-orange-100 text-orange-800',
  Falta: 'bg-red-100 text-red-800',
  'Falta Justificada': 'bg-blue-100 text-blue-800',
};

function getDateRange(periodo: Periodo, desde: Date, hasta: Date): { from: string; to: string } {
  const now = new Date();
  switch (periodo) {
    case 'hoy':
      return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'semana':
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'mes':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'anio':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
    case 'personalizado':
      return { from: format(desde, 'yyyy-MM-dd'), to: format(hasta, 'yyyy-MM-dd') };
  }
}

export default function ReportesPage() {
  const { toast } = useToast();

  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [justFilter, setJustFilter] = useState<JustFilter>('todos');
  const [desde, setDesde] = useState<Date>(new Date());
  const [hasta, setHasta] = useState<Date>(new Date());
  const [data, setData] = useState<ReporteRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setSearched(true);
    try {
      const { from, to } = getDateRange(periodo, desde, hasta);
      const params = new URLSearchParams({ from, to, status: statusFilter });
      if (statusFilter !== 'todos') params.set('justificado', justFilter);
      const rows = await apiFetch(`/api/reportes/asistencias?${params}`);
      setData(rows);
    } catch {
      toast({ variant: 'destructive', title: 'Error al generar reporte' });
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => ({
    presentes: data.filter(r => r.status === 'Presente').length,
    tardanzasInj: data.filter(r => r.status === 'Tardanza').length,
    tardanzasJust: data.filter(r => r.status === 'Tardanza Justificada').length,
    faltasInj: data.filter(r => r.status === 'Falta').length,
    faltasJust: data.filter(r => r.status === 'Falta Justificada').length,
  }), [data]);

  const handleExport = () => {
    const { from, to } = getDateRange(periodo, desde, hasta);
    const rows = data.map((r, i) => ({
      '#': i + 1,
      'Fecha': format(new Date(r.fecha), 'dd/MM/yyyy'),
      'Apellidos y Nombres': r.apellidos_nombres,
      'DNI': r.dni,
      'Sede': r.nombre_sede ?? '-',
      'Estado': STATUS_LABELS[r.status] ?? r.status,
      'Tipo Justificación': r.justificacion_tipo ?? '-',
      'Notas Justificación': r.justificacion_notas ?? '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 24 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `Reporte_Asistencias_${from}_${to}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reportes de Asistencia</h1>
        <p className="text-muted-foreground">Genera reportes por período y tipo de registro.</p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Período */}
            <div className="space-y-1">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                  <SelectItem value="anio">Este año</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango personalizado */}
            {periodo === 'personalizado' && (
              <>
                <div className="space-y-1">
                  <Label>Desde</Label>
                  <DatePicker date={desde} setDate={setDesde} />
                </div>
                <div className="space-y-1">
                  <Label>Hasta</Label>
                  <DatePicker date={hasta} setDate={setHasta} />
                </div>
              </>
            )}

            {/* Estado */}
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as StatusFilter); setJustFilter('todos'); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="falta">Solo faltas</SelectItem>
                  <SelectItem value="tardanza">Solo tardanzas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sub-filtro justificado (solo si no es "todos") */}
            {statusFilter !== 'todos' && (
              <div className="space-y-1">
                <Label>Justificación</Label>
                <Select value={justFilter} onValueChange={v => setJustFilter(v as JustFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="si">Solo justificadas</SelectItem>
                    <SelectItem value="no">Solo no justificadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSearch} disabled={isLoading} className="self-end">
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? 'Generando...' : 'Generar reporte'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {searched && !isLoading && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Presentes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{summary.presentes}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Tard. injust.
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{summary.tardanzasInj}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileCheck className="h-3 w-3" /> Tard. just.
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{summary.tardanzasJust}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserX className="h-3 w-3" /> Faltas injust.
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{summary.faltasInj}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileCheck className="h-3 w-3" /> Faltas just.
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-2xl font-bold">{summary.faltasJust}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Resultados — {data.length} registros</CardTitle>
                <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay registros para los filtros seleccionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Apellidos y Nombres</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Sede</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo Justificación</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={`${row.dni}-${row.fecha}-${i}`}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(row.fecha), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{row.apellidos_nombres}</TableCell>
                          <TableCell className="text-sm">{row.dni}</TableCell>
                          <TableCell className="text-sm">{row.nombre_sede ?? '-'}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_LABELS[row.status] ?? row.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{row.justificacion_tipo ?? '-'}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={row.justificacion_notas ?? ''}>
                            {row.justificacion_notas ?? '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
