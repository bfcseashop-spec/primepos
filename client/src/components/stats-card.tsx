import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  iconColor?: string;
  iconBg?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp, className, iconColor, iconBg }: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">{title}</span>
            <span className="text-xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </span>
            {trend && (
              <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {trendUp ? "+" : ""}{trend}
              </span>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${iconBg || "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${iconColor || "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
