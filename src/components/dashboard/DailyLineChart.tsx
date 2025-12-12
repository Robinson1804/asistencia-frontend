'use client';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyLineChartProps {
  data: {
    date: string;
    fullDate: string;
    Presentes: number;
    Tardanzas: number;
    'Faltas Injustificadas': number;
    'Faltas Justificadas': number;
  }[];
  title: string;
}

const COLORS = {
  Presentes: 'hsl(var(--color-ingreso))',
  Tardanzas: 'hsl(var(--color-ingreso-tarde))',
  'Faltas Injustificadas': 'hsl(var(--color-ausencia))',
  'Faltas Justificadas': 'hsl(142 76% 36%)',
};

export function DailyLineChart({ data, title }: DailyLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <p className="text-muted-foreground">No hay datos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              labelFormatter={(label) => `Fecha: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="Presentes"
              stroke={COLORS.Presentes}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Tardanzas"
              stroke={COLORS.Tardanzas}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Faltas Injustificadas"
              stroke={COLORS['Faltas Injustificadas']}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Faltas Justificadas"
              stroke={COLORS['Faltas Justificadas']}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
