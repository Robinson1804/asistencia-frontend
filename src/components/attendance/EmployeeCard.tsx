"use client";

import type { Employee, AttendanceStatus } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeCardProps {
  employee: Employee;
  currentStatus: AttendanceStatus;
  onStatusChange: (employeeId: string, status: AttendanceStatus) => void;
}

export function EmployeeCard({ employee, currentStatus, onStatusChange }: EmployeeCardProps) {
  const statusOptions: { value: AttendanceStatus; label: string; icon: React.ElementType, color: string, borderColor: string }[] = [
    { value: 'Presente', label: 'Presente', icon: CheckCircle2, color: 'text-green-500', borderColor: 'border-green-500' },
    { value: 'Tardanza', label: 'Tardanza', icon: Clock, color: 'text-yellow-500', borderColor: 'border-yellow-500' },
    { value: 'Falta', label: 'Falta', icon: XCircle, color: 'text-destructive', borderColor: 'border-destructive' },
  ];
  
  const employeeName = employee.apellidosNombres || "Empleado";

  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-300 ease-in-out bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          <AvatarImage src={employee.avatarUrl} alt={employeeName} data-ai-hint="person portrait" />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold">{employeeName}</CardTitle>
          <CardDescription className="text-sm">{employee.proyecto?.nombre}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
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
                  "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-sm font-medium hover:bg-accent/10 cursor-pointer transition-colors duration-200",
                  currentStatus === option.value ? `${option.borderColor} bg-accent/10 shadow-inner` : "text-muted-foreground"
                )}
              >
                <option.icon className={cn("h-6 w-6 mb-1 transition-colors", currentStatus === option.value ? option.color : "")} />
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
