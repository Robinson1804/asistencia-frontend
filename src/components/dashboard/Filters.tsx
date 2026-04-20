
'use client';
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Division, Coordinador, ScrumMaster, Proyecto, TipoContrato, Sede } from "@/types";
import { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { MultiSelect } from "../ui/MultiSelect";
import { startOfMonth, endOfMonth } from "date-fns";

interface FiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  divisions: Division[];
  coordinadores: Coordinador[];
  scrumMasters: ScrumMaster[];
  proyectos: Proyecto[];
  tiposContrato: TipoContrato[];
  sedes: Sede[];
  onClear: () => void;
}

// Generate month options for the current and previous year
const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const currentYear = new Date().getFullYear();
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Current year
  for (let m = 0; m < 12; m++) {
    options.push({
      value: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
      label: `${months[m]} ${currentYear}`
    });
  }
  // Previous year
  for (let m = 0; m < 12; m++) {
    options.push({
      value: `${currentYear - 1}-${String(m + 1).padStart(2, '0')}`,
      label: `${months[m]} ${currentYear - 1}`
    });
  }
  return options;
};

const monthOptions = generateMonthOptions();

export function Filters({ filters, setFilters, divisions, coordinadores, scrumMasters, proyectos, tiposContrato, sedes, onClear }: FiltersProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleMonthChange = (month: string) => {
    if (month === 'custom') {
      handleFilterChange('month', 'custom');
      return;
    }
    const [year, monthNum] = month.split('-').map(Number);
    const date = new Date(year, monthNum - 1, 1);
    const from = startOfMonth(date);
    const to = endOfMonth(date);
    setFilters((prev: any) => ({
      ...prev,
      month,
      dateRange: { from, to }
    }));
  };

  const handleDateChange = (dateRange: DateRange | undefined) => {
    if (dateRange?.from && !dateRange.to) {
      setFilters((prev: any) => ({
        ...prev,
        dateRange: { from: dateRange.from, to: dateRange.from },
        month: 'custom'
      }));
    } else {
      setFilters((prev: any) => ({
        ...prev,
        dateRange,
        month: 'custom'
      }));
    }
  };

  const tiposContratoOptions = tiposContrato.map((t: any) => ({
      value: t.id,
      label: t.tipo_contrato ?? t.tipoContrato ?? ''
  }));

  const sedesOptions = sedes.map((s: any) => ({
      value: s.id,
      label: s.nombre_sede ?? s.nombreSede ?? ''
  }));

  const proyectosOptions = proyectos.map((p: any) => ({
      value: p.id,
      label: p.codigo_proyecto ?? p.codigoProyecto ?? ''
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <Button variant="ghost" onClick={onClear}>
                <X className="mr-2 h-4 w-4" />
                Limpiar Filtros
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label>Mes</Label>
            <Select value={filters.month} onValueChange={handleMonthChange}>
              <SelectTrigger><SelectValue placeholder="Seleccionar mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Rango personalizado</SelectItem>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rango de Fechas {filters.month !== 'custom' && <span className="text-xs text-muted-foreground">(opcional)</span>}</Label>
            <DateRangePicker
              date={filters.dateRange}
              setDate={handleDateChange}
            />
          </div>
          <div className="space-y-2">
            <Label>Sede</Label>
            <MultiSelect
                options={sedesOptions}
                selected={filters.sede}
                onChange={(value) => handleFilterChange('sede', value)}
                placeholder="Todas las sedes"
            />
          </div>
          <div className="space-y-2">
            <Label>División</Label>
            <Select value={filters.division} onValueChange={(value) => handleFilterChange('division', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre_division ?? d.nombreDivision}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coordinador</Label>
            <Select value={filters.coordinador} onValueChange={(value) => handleFilterChange('coordinador', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {coordinadores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre_coordinador ?? c.nombreCoordinador}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scrum Master</Label>
            <Select value={filters.scrumMaster} onValueChange={(value) => handleFilterChange('scrumMaster', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {scrumMasters.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre_scrum_master ?? s.nombreScrumMaster}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proyecto</Label>
            <MultiSelect
                options={proyectosOptions}
                selected={filters.proyecto}
                onChange={(value) => handleFilterChange('proyecto', value)}
                placeholder="Todos los proyectos"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <MultiSelect
                options={tiposContratoOptions}
                selected={filters.tipoContrato}
                onChange={(value) => handleFilterChange('tipoContrato', value)}
                placeholder="Seleccionar..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
