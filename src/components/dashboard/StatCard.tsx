
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, color, onClick, isActive }: StatCardProps) {
  const isClickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "transition-all",
        isClickable && "cursor-pointer hover:shadow-lg hover:-translate-y-1",
        isActive && "ring-2 ring-primary shadow-lg"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
