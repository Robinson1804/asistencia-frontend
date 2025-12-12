'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DivisionGroupedChartProps {
  data: {
    name: string;
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

const CustomXAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
  const maxCharsPerLine = 15;
  const text = payload.value;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * 12}
          dy={12}
          textAnchor="middle"
          fill="currentColor"
          fontSize={10}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export function DivisionGroupedChart({ data, title }: DivisionGroupedChartProps) {
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

  const maxLines = Math.max(...data.map(d => {
    const words = d.name.split(' ');
    let lines = 1;
    let currentLine = '';
    words.forEach((word) => {
      if ((currentLine + ' ' + word).trim().length <= 15) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines++;
        currentLine = word;
      }
    });
    return lines;
  }));

  const bottomMargin = 20 + (maxLines * 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350 + bottomMargin - 60}>
          <BarChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={CustomXAxisTick}
              height={bottomMargin}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="Presentes" fill={COLORS.Presentes} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Tardanzas" fill={COLORS.Tardanzas} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Faltas Injustificadas" fill={COLORS['Faltas Injustificadas']} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Faltas Justificadas" fill={COLORS['Faltas Justificadas']} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
