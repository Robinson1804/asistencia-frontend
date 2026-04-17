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
  'Faltas Justificadas': 'hsl(199 89% 48%)', // Celeste
};

const CustomXAxisTick = ({ x, y, payload, totalItems }: { x: number; y: number; payload: { value: string }; totalItems?: number }) => {
  // Ajustar caracteres por línea según cantidad de items
  const maxCharsPerLine = totalItems && totalItems > 6 ? 10 : 12;
  const fontSize = totalItems && totalItems > 6 ? 9 : 10;
  const text = payload.value;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxCharsPerLine ? word.substring(0, maxCharsPerLine) + '...' : word;
    }
  });
  if (currentLine) lines.push(currentLine);

  // Limitar a máximo 3 líneas
  const displayLines = lines.slice(0, 3);
  if (lines.length > 3) {
    displayLines[2] = displayLines[2].substring(0, displayLines[2].length - 3) + '...';
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {displayLines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * 11}
          dy={10}
          textAnchor="middle"
          fill="currentColor"
          fontSize={fontSize}
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
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <p className="text-muted-foreground">No hay datos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  const totalItems = data.length;
  const bottomMargin = totalItems > 6 ? 50 : 45;
  // Calcular altura dinámica basada en cantidad de divisiones
  const chartHeight = Math.max(350, 280 + (totalItems * 10));
  // Calcular gap entre grupos de barras
  const barCategoryGap = totalItems > 6 ? '15%' : '20%';

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            margin={{ left: 10, right: 10, top: 10, bottom: bottomMargin }}
            barCategoryGap={barCategoryGap}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={(props) => <CustomXAxisTick {...props} totalItems={totalItems} />}
              height={bottomMargin}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={40}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="Presentes" fill={COLORS.Presentes} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Tardanzas" fill={COLORS.Tardanzas} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Faltas Injustificadas" fill={COLORS['Faltas Injustificadas']} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Faltas Justificadas" fill={COLORS['Faltas Justificadas']} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
