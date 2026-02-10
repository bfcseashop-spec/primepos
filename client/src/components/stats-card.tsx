import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  iconColor?: string;
  iconBg?: string;
  valueColor?: string;
  accentColor?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp, className, iconColor, iconBg, valueColor, accentColor }: StatsCardProps) {
  return (
    <Card className={`overflow-visible ${className || ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</span>
            <span className={`text-2xl font-bold tracking-tight ${valueColor || ""}`} data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </span>
            {trend && (
              <div className="flex items-center gap-1">
                {trendUp ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {trendUp ? "+" : ""}{trend}
                </span>
              </div>
            )}
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconBg || "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${iconColor || "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
