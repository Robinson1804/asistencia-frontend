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
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={100} interval={0} />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }} 
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]}>
                <LabelList dataKey={dataKey} position="right" fill='hsl(var(--foreground))' fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
