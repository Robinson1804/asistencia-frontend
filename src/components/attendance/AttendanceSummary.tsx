"use client";

import type { AttendanceRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Clock, UserX, Users } from "lucide-react";

interface AttendanceSummaryProps {
  attendances: AttendanceRecord[];
  totalEmployees: number;
}

export function AttendanceSummary({ attendances, totalEmployees }: AttendanceSummaryProps) {
  const presentCount = attendances.filter(a => a.status === 'Presente').length;
  const tardyCount = attendances.filter(a => a.status === 'Tardanza').length;
  const absentCount = attendances.filter(a => a.status === 'Falta').length;

  const summaryData = [
    { title: "Registrados", count: totalEmployees, icon: Users, color: "text-primary" },
    { title: "Presentes", count: presentCount, icon: UserCheck, color: "text-green-500" },
    { title: "Tardanzas", count: tardyCount, icon: Clock, color: "text-yellow-500" },
    { title: "Faltas", count: absentCount, icon: UserX, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summaryData.map((item, index) => (
        <Card key={index} className="shadow-md hover:shadow-lg transition-shadow bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground/80">{item.title}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{item.count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
