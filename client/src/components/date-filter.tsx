import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalendarDays } from "lucide-react";

export type DatePeriod = "all" | "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

const PERIOD_LABELS: Record<DatePeriod, string> = {
  all: "All",
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom",
};

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDateRange(period: DatePeriod, customFrom: string, customTo: string): { from: string; to: string } | null {
  if (period === "all") return null;
  if (period === "custom") {
    if (customFrom && customTo) return { from: customFrom, to: customTo };
    if (customFrom) return { from: customFrom, to: customFrom };
    return null;
  }
  const today = new Date();
  const todayStr = fmt(today);

  if (period === "today") return { from: todayStr, to: todayStr };

  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const yStr = fmt(y);
    return { from: yStr, to: yStr };
  }

  if (period === "this_week") {
    const dow = today.getDay();
    const mondayOff = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: fmt(monday), to: fmt(sunday) };
  }

  if (period === "last_week") {
    const dow = today.getDay();
    const mondayOff = dow === 0 ? 6 : dow - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - mondayOff);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    return { from: fmt(lastMonday), to: fmt(lastSunday) };
  }

  if (period === "this_month") {
    const y = today.getFullYear();
    const m = today.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { from: fmt(first), to: fmt(last) };
  }

  if (period === "last_month") {
    const y = today.getFullYear();
    const m = today.getMonth();
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return { from: fmt(first), to: fmt(last) };
  }

  return null;
}

export function isDateInRange(dateStr: string | null | undefined, range: { from: string; to: string } | null): boolean {
  if (!range) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= range.from && d <= range.to;
}

export function useDateFilter() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  const dateRange = useMemo(
    () => getDateRange(datePeriod, customFromDate, customToDate),
    [datePeriod, customFromDate, customToDate]
  );

  return { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, dateRange };
}

interface DateFilterBarProps {
  datePeriod: DatePeriod;
  setDatePeriod: (p: DatePeriod) => void;
  customFromDate: string;
  setCustomFromDate: (v: string) => void;
  customToDate: string;
  setCustomToDate: (v: string) => void;
  dateRange: { from: string; to: string } | null;
}

export function DateFilterBar({ datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, dateRange }: DateFilterBarProps) {
  const periods: DatePeriod[] = ["all", "today", "yesterday", "this_week", "last_week", "this_month", "last_month", "custom"];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          {periods.map((p) => (
            <Button
              key={p}
              variant={datePeriod === p ? "default" : "outline"}
              size="sm"
              onClick={() => setDatePeriod(p)}
              data-testid={`button-period-${p}`}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
          {datePeriod === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <Input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="text-xs w-36"
                data-testid="input-date-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="text-xs w-36"
                data-testid="input-date-to"
              />
            </div>
          )}
          {datePeriod !== "all" && dateRange && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} — ${dateRange.to}`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
