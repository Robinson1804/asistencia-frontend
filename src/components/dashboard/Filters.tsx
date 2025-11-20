'use client';
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Division, Coordinador, ScrumMaster } from "@/types";
import { DateRange } from "react-day-picker";

interface FiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  divisions: Division[];
  coordinadores: Coordinador[];
  scrumMasters: ScrumMaster[];
}

export function Filters({ filters, setFilters, divisions, coordinadores, scrumMasters }: FiltersProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    if (dateRange?.from && dateRange?.to) {
        handleFilterChange('dateRange', dateRange);
    } else if (dateRange?.from) {
        handleFilterChange('dateRange', {from: dateRange.from, to: dateRange.from});
    }
  }

  return (
    <Card>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 items-end">
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
      </CardContent>
    </Card>
  );
}
