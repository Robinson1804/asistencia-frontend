'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
  data: any[];
  title: string;
}

export function TopAbsencesChart({ data, title }: ChartProps) {
  if (!data || data.length === 0) {
     return (
         <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No hay ausencias en el rango seleccionado.</p>
          </CardContent>
        </Card>
      )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 50, right: 30 }}>
            <XAxis type="number" hide />
            <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fontSize: 12 }} 
                width={150} 
                interval={0}
                tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }} 
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              labelFormatter={(label) => <span className="font-bold">{label}</span>}
              formatter={(value) => [`${value} ausencias`, 'Total']}
            />
            <Bar dataKey="ausencias" fill="hsl(var(--color-ausencia))" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="ausencias" position="right" fill='hsl(var(--foreground))' fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
