'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface EmployeeRankingData {
  name: string;
  dni: string;
  count: number;
  percentage: number;
}

interface EmployeeRankingTableProps {
  data: EmployeeRankingData[];
  title: string;
  countLabel: string;
  color: 'yellow' | 'red';
}

export function EmployeeRankingTable({ data, title, countLabel, color }: EmployeeRankingTableProps) {
  const colorClasses = {
    yellow: {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      highlight: 'text-yellow-600 dark:text-yellow-400',
    },
    red: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      highlight: 'text-red-600 dark:text-red-400',
    },
  };

  const colors = colorClasses[color];

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No hay datos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {data.length} personas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead className="text-center w-[100px]">{countLabel}</TableHead>
                <TableHead className="text-right w-[80px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((employee, index) => (
                <TableRow key={employee.dni} className={index < 3 ? 'bg-muted/30' : ''}>
                  <TableCell className="text-center font-medium">
                    {index < 3 ? (
                      <span className={`font-bold ${colors.highlight}`}>{index + 1}</span>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {employee.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{employee.dni}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={colors.badge}>
                      {employee.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-medium ${employee.percentage >= 20 ? colors.highlight : ''}`}>
                      {employee.percentage.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
