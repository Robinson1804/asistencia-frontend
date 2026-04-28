
"use client";

import { useState, useEffect } from 'react';
import type { Employee, Justification, TurnoNumber, TurnoStatus, TurnoStatuses } from '@/types';
import { TURNOS, computeDailyStatus } from '@/types';
import { TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { JustificationModal } from './JustificationModal';

interface EmployeeRowProps {
  employee: Employee;
  currentTurno: TurnoNumber;
  turnoStatuses: TurnoStatuses;
  currentStatus: string;
  onStatusChange: (employeeId: string, status: TurnoStatus) => void;
  index: number;
  currentJustification?: Justification;
  onJustificationSaved: (justification: Justification) => void;
  selectedDate: Date;
  variant?: 'mobile' | 'desktop';
  readOnly?: boolean;
  allowEditJustification?: boolean;
}

const InfoTooltipContent = ({ employee }: { employee: Employee }) => (
  <div className="p-2 text-sm">
    {employee.proyecto?.nombre && <p><strong>Proyecto:</strong> {employee.proyecto.nombre}</p>}
    {employee.coordinador?.nombre && <p><strong>Coordinador:</strong> {employee.coordinador.nombre}</p>}
    {employee.scrumMaster?.nombre && <p><strong>Scrum Master:</strong> {employee.scrumMaster.nombre}</p>}
    {employee.division?.nombre && <p><strong>División:</strong> {employee.division.nombre}</p>}
    {employee.modalidad?.nombre && <p><strong>Modalidad:</strong> {employee.modalidad.nombre}</p>}
  </div>
);

function InfoIcon({ employee }: { employee: Employee }) {
  const [isTouch, setIsTouch] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  if (isTouch) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-3">
          <InfoTooltipContent employee={employee} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button">
            <AlertCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          <InfoTooltipContent employee={employee} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getContractBadgeClass(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes('orden') || t.includes('servicio') || t.includes('os'))
    return 'bg-purple-100 text-purple-700 border-purple-200';
  if (t.includes('cas'))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (t.includes('nombrado') || t.includes('nombramiento'))
    return 'bg-green-100 text-green-700 border-green-200';
  if (t.includes('locacion') || t.includes('locación') || t.includes('snp'))
    return 'bg-pink-100 text-pink-700 border-pink-200';
  if (t.includes('contrato') || t.includes('plazo'))
    return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function TurnoIndicators({ statuses, currentTurno }: { statuses: TurnoStatuses; currentTurno: TurnoNumber }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      {TURNOS.map(t => {
        const s = statuses[t.turno];
        const isActive = t.turno === currentTurno;
        return (
          <TooltipProvider key={t.turno}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold border',
                  isActive && 'ring-1 ring-offset-1 ring-primary',
                  s === 'Presente' ? 'bg-green-500 text-white border-green-600'
                    : s === 'Falta' ? 'bg-red-500 text-white border-red-600'
                    : 'bg-gray-200 text-gray-500 border-gray-300'
                )}>
                  {t.turno}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t.label}: {s ?? 'No registrado'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

function DailyStatusBadge({ statuses }: { statuses: TurnoStatuses }) {
  const daily = computeDailyStatus(statuses);
  if (!daily) return null;
  const cls = daily === 'Presente'
    ? 'bg-green-100 text-green-700 border-green-200'
    : daily === 'Tardanza'
    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ml-1 ${cls}`}>
      Día: {daily}
    </span>
  );
}

function StatusDisplay({ status }: { status: string }) {
  if (status === 'Presente') return (
    <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
      <CheckCircle2 className="h-4 w-4" /> Presente
    </span>
  );
  if (status === 'Falta') return (
    <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
      <XCircle className="h-4 w-4" /> Falta
    </span>
  );
  if (status === 'Tardanza') return (
    <span className="flex items-center gap-1 text-yellow-600 font-semibold text-sm">
      <Clock className="h-4 w-4" /> Tardanza
    </span>
  );
  return <span className="text-muted-foreground text-sm italic">No registrado</span>;
}

export function EmployeeRow({
  employee, currentTurno, turnoStatuses, currentStatus,
  onStatusChange, index, currentJustification, onJustificationSaved,
  selectedDate, variant = 'desktop', readOnly = false, allowEditJustification = false
}: EmployeeRowProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusOptions: { value: TurnoStatus; icon: React.ElementType; color: string; borderColor: string }[] = [
    { value: 'Presente', icon: CheckCircle2, color: 'text-green-500', borderColor: 'border-green-500' },
    { value: 'Falta', icon: XCircle, color: 'text-destructive', borderColor: 'border-destructive' },
  ];

  const employeeName = employee.apellidosNombres || "Empleado";
  const groupIndex = Math.floor(index / 11);
  const rowColorClass = groupIndex % 2 === 1 ? 'bg-muted/50' : 'bg-card';
  const isFalta = currentStatus === 'Falta';

  const employeeNameWithInfo = (
    <div className="flex items-center gap-2">
      <span>{employeeName}</span>
      <InfoIcon employee={employee} />
    </div>
  );

  const badges = (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {employee.sede?.nombre && (
        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {employee.sede.nombre}
        </span>
      )}
      {employee.tipoContrato?.tipo && (
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getContractBadgeClass(employee.tipoContrato.tipo)}`}>
          {employee.tipoContrato.tipo}
        </span>
      )}
    </div>
  );

  const turnoIndicatorsWithStatus = (
    <div className="flex items-center gap-2 mt-1">
      <TurnoIndicators statuses={turnoStatuses} currentTurno={currentTurno} />
      <DailyStatusBadge statuses={turnoStatuses} />
    </div>
  );

  const justificationButton = (isMobile = false) => (
    <button
      type="button"
      onClick={() => setIsModalOpen(true)}
      className={cn(
        "flex flex-col items-center justify-center rounded-md border-2 p-2 text-xs font-medium cursor-pointer transition-colors duration-200",
        isMobile ? "h-20 gap-2 min-w-[60px]" : "h-16 min-w-[56px]",
        currentJustification
          ? "border-gray-400 text-gray-400 bg-gray-50 hover:bg-gray-100"
          : "border-blue-500 text-blue-500 hover:bg-blue-500/10"
      )}
    >
      <FileText className={cn("mb-1", isMobile ? "h-6 w-6" : "h-5 w-5")} />
      <span>{currentJustification ? 'Justificado' : 'Justificar'}</span>
    </button>
  );

  const statusButtons = (isMobile = false) => (
    <div className={cn("flex gap-2 justify-center", isMobile && "flex-wrap justify-start")}>
      {statusOptions.map(option => {
        const isSelected = currentStatus === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !readOnly && onStatusChange(employee.id, option.value)}
            disabled={readOnly}
            className={cn(
              "flex flex-col items-center justify-center rounded-md border-2 font-medium transition-all duration-200",
              isMobile ? "h-20 gap-2 min-w-[70px] text-xs p-3" : "h-16 min-w-[80px] text-xs p-2",
              isSelected
                ? `${option.borderColor} bg-accent/10 shadow-inner`
                : "border-muted text-muted-foreground bg-popover hover:bg-accent/10",
              readOnly && "cursor-default opacity-75"
            )}
          >
            <option.icon className={cn(
              "transition-colors",
              isMobile ? "h-6 w-6" : "h-5 w-5 mb-1",
              isSelected ? option.color : ""
            )} />
            {option.value}
          </button>
        );
      })}
      {(isFalta || (readOnly && currentJustification)) && justificationButton(isMobile)}
    </div>
  );

  // Mobile version
  if (variant === 'mobile') {
    return (
      <>
        <div className={rowColorClass}>
          <Card className="p-4 shadow-sm border-0">
            <div className="space-y-2">
              <div className="font-medium text-sm leading-tight flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground text-xs w-6">{index + 1}.</span>
                  {employeeNameWithInfo}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {employee.sede?.nombre && (
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {employee.sede.nombre}
                  </span>
                )}
                {employee.tipoContrato?.tipo && (
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getContractBadgeClass(employee.tipoContrato.tipo)}`}>
                    {employee.tipoContrato.tipo}
                  </span>
                )}
              </div>
              {turnoIndicatorsWithStatus}
              {readOnly
                ? <div className="flex items-center gap-2">
                    <StatusDisplay status={currentStatus} />
                    {(isFalta || currentJustification) && justificationButton(true)}
                  </div>
                : statusButtons(true)
              }
            </div>
          </Card>
        </div>

        <JustificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={employee}
          date={selectedDate}
          turno={currentTurno}
          justification={currentJustification}
          allowEdit={allowEditJustification}
          onJustificationSaved={(justification) => {
            onJustificationSaved(justification);
            setIsModalOpen(false);
          }}
        />
      </>
    );
  }

  // Desktop version
  return (
    <>
      <TableRow className={rowColorClass}>
        <TableCell className="w-[50px] font-medium py-4 text-muted-foreground">{index + 1}</TableCell>
        <TableCell className="font-medium py-4">
          {employeeNameWithInfo}
          {badges}
          {turnoIndicatorsWithStatus}
        </TableCell>
        <TableCell className="py-4">
          {readOnly
            ? <div className="flex items-center justify-between w-full pr-4">
                <StatusDisplay status={currentStatus} />
                {(isFalta || currentJustification) && <div className="ml-8">{justificationButton(false)}</div>}
              </div>
            : statusButtons(false)
          }
        </TableCell>
      </TableRow>

      <JustificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={employee}
        date={selectedDate}
        turno={currentTurno}
        justification={currentJustification}
        onJustificationSaved={(justification) => {
          onJustificationSaved(justification);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
