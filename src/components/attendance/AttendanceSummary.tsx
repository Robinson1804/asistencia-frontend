"use client";

import type { AttendanceStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Clock, UserX, Users } from "lucide-react";

interface AttendanceSummaryProps {
  attendances: AttendanceStatus[];
  totalEmployees: number;
}

export function AttendanceSummary({ attendances, totalEmployees }: AttendanceSummaryProps) {
  const presentCount = attendances.filter(a => a === 'Presente').length;
  const tardyCount = attendances.filter(a => a === 'Tardanza').length;
  const absentCount = attendances.filter(a => a === 'Falta').length;

  const summaryData = [
    { title: "Registrados", count: totalEmployees, icon: Users, color: "text-primary" },
    { title: "Presentes", count: presentCount, icon: UserCheck, color: "text-green-500" },
    { title: "Tardanzas", count: tardyCount, icon: Clock, color: "text-yellow-500" },
    { title: "Faltas", count: absentCount, icon: UserX, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {summaryData.map((item, index) => (
        <Card key={index} className="shadow-sm hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-sm border-l-4" style={{
          borderLeftColor: item.color === 'text-primary' ? 'hsl(var(--primary))' :
                          item.color === 'text-green-500' ? 'rgb(34 197 94)' :
                          item.color === 'text-yellow-500' ? 'rgb(234 179 8)' :
                          'hsl(var(--destructive))'
        }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-card-foreground/80">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 md:h-5 md:w-5 ${item.color}`} />
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-card-foreground">{item.count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
