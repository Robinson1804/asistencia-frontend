
"use client";

import type { Employee, AttendanceStatus } from "@/types";
import { TableRow, TableCell } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeRowProps {
  employee: Employee;
  currentStatus: AttendanceStatus;
  onStatusChange: (employeeId: string, status: AttendanceStatus) => void;
  index: number;
}

export function EmployeeRow({ employee, currentStatus, onStatusChange, index }: EmployeeRowProps) {
  const statusOptions: { value: AttendanceStatus; label: string; icon: React.ElementType, color: string, borderColor: string }[] = [
    { value: 'Presente', label: 'Presente', icon: CheckCircle2, color: 'text-green-500', borderColor: 'border-green-500' },
    { value: 'Tardanza', label: 'Tardanza', icon: Clock, color: 'text-yellow-500', borderColor: 'border-yellow-500' },
    { value: 'Falta', label: 'Falta', icon: XCircle, color: 'text-destructive', borderColor: 'border-destructive' },
  ];
  
  const employeeName = employee.apellidosNombres || "Empleado";

  const groupIndex = Math.floor(index / 11);
  const rowColorClass = groupIndex % 2 === 1 ? 'bg-muted/50' : 'bg-card';


  return (
    <TableRow className={cn("flex flex-col sm:table-row", rowColorClass)}>
       <TableCell className="font-medium sm:py-4 py-2 px-4 border-b sm:border-b-0 flex justify-between items-center">
        <span>{employeeName}</span>
        <div className="sm:hidden">
            <RadioGroup
              value={currentStatus}
              onValueChange={(value) => onStatusChange(employee.id, value as AttendanceStatus)}
              className="grid grid-cols-3 gap-2"
            >
              {statusOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem value={option.value} id={`${employee.id}-${option.value}-mobile`} className="sr-only" />
                  <Label
                    htmlFor={`${employee.id}-${option.value}-mobile`}
                    className={cn(
                      "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 h-10 w-10 text-xs font-medium hover:bg-accent/10 cursor-pointer transition-colors duration-200",
                      currentStatus === option.value ? `${option.borderColor} bg-accent/10 shadow-inner` : "text-muted-foreground"
                    )}
                  >
                    <option.icon className={cn("h-5 w-5 transition-colors", currentStatus === option.value ? option.color : "")} />
                  </Label>
                </div>
              ))}
            </RadioGroup>
        </div>
      </TableCell>
      <TableCell className="sm:py-4 py-3 px-4 hidden sm:table-cell">
        <RadioGroup
          value={currentStatus}
          onValueChange={(value) => onStatusChange(employee.id, value as AttendanceStatus)}
          className="grid grid-cols-3 gap-2"
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
        </RadioGroup>
      </TableCell>
    </TableRow>
  );
}
