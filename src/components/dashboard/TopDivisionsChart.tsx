'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopDivisionsChartProps {
  data: { name: string; value: number; percentage: number }[];
  title: string;
  color: string;
  valueLabel?: string;
}

export function TopDivisionsChart({ data, title, color, valueLabel = 'Total' }: TopDivisionsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No hay datos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  // Take top 5
  const topData = data.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
            <XAxis type="number" tickFormatter={(value) => `${value}`} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10 }}
              width={120}
              tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 18)}...` : value}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage.toFixed(1)}%)`,
                valueLabel
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {topData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - (index * 0.15)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
