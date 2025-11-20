
'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
  data: any[];
  dataKey: string;
  title: string;
  color: string;
}

export function AttendanceByDivisionChart({ data, dataKey, title, color }: ChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 30, right: 30 }}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12 }} 
                width={100} 
                interval={0}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }} 
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} background={{ fill: 'hsl(var(--muted) / 0.2)' }}>
                <LabelList 
                    dataKey={dataKey} 
                    position="right" 
                    fill='hsl(var(--foreground))' 
                    fontSize={12} 
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
