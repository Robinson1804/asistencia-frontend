
'use client';
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Division, Coordinador, ScrumMaster, Proyecto, TipoContrato } from "@/types";
import { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { MultiSelect } from "../ui/MultiSelect";

interface FiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  divisions: Division[];
  coordinadores: Coordinador[];
  scrumMasters: ScrumMaster[];
  proyectos: Proyecto[];
  tiposContrato: TipoContrato[];
  onClear: () => void;
}

export function Filters({ filters, setFilters, divisions, coordinadores, scrumMasters, proyectos, tiposContrato, onClear }: FiltersProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    if (dateRange?.from && !dateRange.to) {
      handleFilterChange('dateRange', { from: dateRange.from, to: dateRange.from });
    } else {
      handleFilterChange('dateRange', dateRange);
    }
  }

  const tiposContratoOptions = tiposContrato.map(t => ({
      value: t.id,
      label: t.tipoContrato
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
            <Label>Rango de Fechas</Label>
            <DateRangePicker 
              date={filters.dateRange} 
              setDate={handleDateChange}
            />
          </div>
          <div className="space-y-2">
            <Label>División</Label>
            <Select value={filters.division} onValueChange={(value) => handleFilterChange('division', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.nombreDivision}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coordinador</Label>
            <Select value={filters.coordinador} onValueChange={(value) => handleFilterChange('coordinador', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {coordinadores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombreCoordinador}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scrum Master</Label>
            <Select value={filters.scrumMaster} onValueChange={(value) => handleFilterChange('scrumMaster', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {scrumMasters.map(s => <SelectItem key={s.id} value={s.id}>{s.nombreScrumMaster}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select value={filters.proyecto} onValueChange={(value) => handleFilterChange('proyecto', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {proyectos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombreProyecto}</SelectItem>)}
              </SelectContent>
            </Select>
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
           <div className="space-y-2">
              <Label htmlFor="name-filter">Apellidos y Nombres</Label>
              <Input
                id="name-filter"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                placeholder="Buscar..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dni-filter">DNI</Label>
              <Input
                id="dni-filter"
                value={filters.dni}
                onChange={(e) => handleFilterChange('dni', e.target.value)}
                placeholder="Buscar..."
              />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
