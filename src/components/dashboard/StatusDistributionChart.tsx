
'use client';
import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
  data: { name: string; value: number; fill: string; }[];
}

export function StatusDistributionChart({ data }: ChartProps) {
    const total = data.reduce((acc, item) => acc + item.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Distribución de Estados</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
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
                <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.value > 0 ? 'hsl(var(--background))' : 'transparent'} strokeWidth={2}/>
              ))}
            </Pie>
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
