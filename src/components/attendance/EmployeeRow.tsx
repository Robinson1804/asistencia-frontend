
"use client";

import { useState } from 'react';
import type { Employee, AttendanceStatus, Justification } from "@/types";
import { TableRow, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, XCircle, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JustificationModal } from './JustificationModal';

interface EmployeeRowProps {
  employee: Employee;
  currentStatus: AttendanceStatus;
  onStatusChange: (employeeId: string, status: AttendanceStatus) => void;
  index: number;
  currentJustification?: Justification;
  onJustificationSaved: (justification: Justification) => void;
  selectedDate: Date;
  variant?: 'mobile' | 'desktop';
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

export function EmployeeRow({ employee, currentStatus, onStatusChange, index, currentJustification, onJustificationSaved, selectedDate, variant = 'desktop' }: EmployeeRowProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const statusOptions: { value: AttendanceStatus; label: string; icon: React.ElementType, color: string, borderColor: string }[] = [
    { value: 'Ingreso', label: 'Ingreso', icon: CheckCircle2, color: 'text-green-500', borderColor: 'border-green-500' },
    { value: 'Ingreso Tarde', label: 'Tarde', icon: Clock, color: 'text-yellow-500', borderColor: 'border-yellow-500' },
    { value: 'Ausencia', label: 'Ausencia', icon: XCircle, color: 'text-destructive', borderColor: 'border-destructive' },
  ];

  const employeeName = employee.apellidosNombres || "Empleado";

  const groupIndex = Math.floor(index / 11);
  const rowColorClass = groupIndex % 2 === 1 ? 'bg-muted/50' : 'bg-card';

  const isJustifiable = currentStatus === 'Ausencia' || currentStatus === 'Ingreso Tarde';

  const employeeNameWithInfo = (
    <div className="flex items-center gap-2">
      <span>{employeeName}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>
              <AlertCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            <InfoTooltipContent employee={employee} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const justificationButton = (isMobile = false) => (
    <div key="justificar">
      <Label
        onClick={() => setIsModalOpen(true)}
        className={cn(
            "flex flex-col items-center justify-center rounded-md border-2 bg-popover p-2 text-xs font-medium cursor-pointer transition-colors duration-200",
            "border-blue-500 text-blue-500 hover:bg-blue-500/10",
            isMobile ? "h-20 gap-2" : "h-16",
            currentJustification && "border-gray-400 text-gray-400 bg-gray-50 hover:bg-gray-100"
        )}
      >
          <FileText className={cn("mb-1", isMobile ? "h-6 w-6" : "h-5 w-5")} />
          <span>{currentJustification ? 'Justificado' : 'Justificar'}</span>
      </Label>
    </div>
  );

  // Mobile version
  if (variant === 'mobile') {
    return (
      <>
        <div className={rowColorClass}>
          <Card className="p-4 shadow-sm border-0">
            <div className="space-y-3">
              <div className="font-medium text-sm leading-tight flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground text-xs w-6">{index + 1}.</span>
                  {employeeNameWithInfo}
                </div>
              </div>
              <RadioGroup
                value={currentStatus}
                onValueChange={(value) => onStatusChange(employee.id, value as AttendanceStatus)}
                className="grid grid-cols-4 gap-2"
              >
                {statusOptions.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem value={option.value} id={`${employee.id}-${option.value}-mobile`} className="sr-only" />
                    <Label
                      htmlFor={`${employee.id}-${option.value}-mobile`}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-3 text-xs font-medium hover:bg-accent/20 cursor-pointer transition-all duration-200 h-20 gap-2",
                        currentStatus === option.value ? `${option.borderColor} bg-accent/10 shadow-md scale-105` : "text-muted-foreground hover:scale-105"
                      )}
                    >
                      <option.icon className={cn("h-6 w-6 transition-colors", currentStatus === option.value ? option.color : "")} />
                      <span className="text-[10px] font-semibold">{option.label}</span>
                    </Label>
                  </div>
                ))}
                {isJustifiable && justificationButton(true)}
              </RadioGroup>
            </div>
          </Card>
        </div>

        <JustificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={employee}
          date={selectedDate}
          status={currentStatus}
          justification={currentJustification}
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
        </TableCell>
        <TableCell className="py-4">
          <RadioGroup
            value={currentStatus}
            onValueChange={(value) => onStatusChange(employee.id, value as AttendanceStatus)}
            className="grid grid-cols-4 gap-2"
          >
            {statusOptions.map((option) => (
              <div key={option.value}>
                <RadioGroupItem value={option.value} id={`${employee.id}-${option.value}`} className="sr-only" />
                <Label
                  htmlFor={`${employee.id}-${option.value}`}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-xs font-medium hover:bg-accent/10 cursor-pointer transition-colors duration-200 h-16",
                    currentStatus === option.value ? `${option.borderColor} bg-accent/10 shadow-inner` : "text-muted-foreground"
                  )}
                >
                  <option.icon className={cn("h-5 w-5 mb-1 transition-colors", currentStatus === option.value ? option.color : "")} />
                  {option.label}
                </Label>
              </div>
            ))}
            {isJustifiable && justificationButton(false)}
          </RadioGroup>
        </TableCell>
      </TableRow>

      <JustificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={employee}
        date={selectedDate}
        status={currentStatus}
        justification={currentJustification}
        onJustificationSaved={(justification) => {
          onJustificationSaved(justification);
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
