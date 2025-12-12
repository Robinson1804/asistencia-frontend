'use client';
import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DonutChartProps {
  data: { name: string; value: number; fill: string }[];
  title: string;
  total: number;
}

export function DonutChart({ data, title, total }: DonutChartProps) {
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
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
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => `${value}`}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent === 0) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.value > 0 ? 'hsl(var(--background))' : 'transparent'} strokeWidth={2} />
              ))}
            </Pie>
            {/* Center text showing total */}
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan x="50%" dy="-0.5em" className="text-2xl font-bold fill-foreground">{total}</tspan>
              <tspan x="50%" dy="1.5em" className="text-xs fill-muted-foreground">Total</tspan>
            </text>
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
