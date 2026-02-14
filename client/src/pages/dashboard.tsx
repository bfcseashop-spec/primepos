import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users, FileText, Stethoscope, Pill,
  Calendar, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Heart,
  Banknote, BarChart3, PieChart as PieChartIcon,
  Clipboard, ShieldCheck, Sparkles
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";
import { useLocation } from "wouter";
import { useTranslation } from "@/i18n";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(346, 77%, 50%)",
  "hsl(190, 80%, 45%)",
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, monthYear, setMonthYear, dateRange } = useDateFilter();

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentVisits } = useQuery<any[]>({
    queryKey: ["/api/dashboard/recent-visits"],
  });

  const { data: revenueData } = useQuery<any[]>({
    queryKey: ["/api/dashboard/revenue-chart"],
  });

  const { data: serviceBreakdown } = useQuery<any[]>({
    queryKey: ["/api/dashboard/service-breakdown"],
  });

  const filteredVisits = (recentVisits || []).filter((v: any) => isDateInRange(v.date || v.visitDate, dateRange));
  const filteredRevenue = (revenueData || []).filter((r: any) => isDateInRange(r.date, dateRange));

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 17) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  })();

  const quickActions = [
    { label: t("dashboard.newPatient"), icon: Users, path: "/register-patient", color: "text-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/15" },
    { label: t("dashboard.createBill"), icon: FileText, path: "/billing", color: "text-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/15" },
    { label: t("dashboard.opdVisit"), icon: Stethoscope, path: "/opd", color: "text-violet-500", bg: "bg-violet-500/10 dark:bg-violet-500/15" },
    { label: t("sidebar.appointments"), icon: Calendar, path: "/appointments", color: "text-amber-500", bg: "bg-amber-500/10 dark:bg-amber-500/15" },
    { label: t("sidebar.labTests"), icon: Clipboard, path: "/lab-tests", color: "text-pink-500", bg: "bg-pink-500/10 dark:bg-pink-500/15" },
    { label: t("sidebar.medicines"), icon: Pill, path: "/medicines", color: "text-cyan-500", bg: "bg-cyan-500/10 dark:bg-cyan-500/15" },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">

        <div className="rounded-md bg-gradient-to-r from-blue-600 via-violet-600 to-pink-600 p-5 md:p-6" data-testid="dashboard-welcome-banner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <h2 className="text-xl md:text-2xl font-bold text-white" data-testid="text-greeting">{greeting}</h2>
              </div>
              <p className="text-blue-100 text-sm">Here's what's happening at your clinic today</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 rounded-md bg-white/15 backdrop-blur-sm px-3 py-2">
                <Clock className="h-4 w-4 text-blue-200" />
                <span className="text-sm text-white font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-white/15 backdrop-blur-sm px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span className="text-sm text-white font-medium">System Active</span>
              </div>
            </div>
          </div>
        </div>

        <DateFilterBar
          datePeriod={datePeriod}
          setDatePeriod={setDatePeriod}
          customFromDate={customFromDate}
          setCustomFromDate={setCustomFromDate}
          customToDate={customToDate}
          setCustomToDate={setCustomToDate}
          monthYear={monthYear}
          setMonthYear={setMonthYear}
          dateRange={dateRange}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats-grid">
          {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <>
              <StatsCard
                title={t("dashboard.stats.todayPatients")}
                value={stats?.todayPatients ?? 0}
                icon={Users}
                trend={`${stats?.patientTrend ?? 0}% vs yesterday`}
                trendUp={(stats?.patientTrend ?? 0) >= 0}
                iconColor="text-blue-500 dark:text-blue-400"
                iconBg="bg-blue-500/10 dark:bg-blue-400/10"
                valueColor="text-blue-700 dark:text-blue-300"
              />
              <StatsCard
                title={t("dashboard.stats.todayRevenue")}
                value={`$${stats?.todayRevenue ?? "0.00"}`}
                icon={DollarSign}
                trend={`${stats?.revenueTrend ?? 0}% vs yesterday`}
                trendUp={(stats?.revenueTrend ?? 0) >= 0}
                iconColor="text-emerald-500 dark:text-emerald-400"
                iconBg="bg-emerald-500/10 dark:bg-emerald-400/10"
                valueColor="text-emerald-700 dark:text-emerald-300"
              />
              <StatsCard
                title={t("dashboard.stats.activeOpd")}
                value={stats?.activeOpd ?? 0}
                icon={Stethoscope}
                iconColor="text-violet-500 dark:text-violet-400"
                iconBg="bg-violet-500/10 dark:bg-violet-400/10"
                valueColor="text-violet-700 dark:text-violet-300"
              />
              <StatsCard
                title={t("dashboard.stats.totalBills")}
                value={stats?.totalBills ?? 0}
                icon={FileText}
                iconColor="text-amber-500 dark:text-amber-400"
                iconBg="bg-amber-500/10 dark:bg-amber-400/10"
                valueColor="text-amber-700 dark:text-amber-300"
              />
            </>
          )}
        </div>

        <div data-testid="dashboard-quick-actions">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Activity className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("dashboard.quickActions")}</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="lg"
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2.5"
                data-testid={`button-quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                {t("dashboard.revenueChart")}
              </CardTitle>
              <Badge variant="secondary">Last 7 days</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {filteredRevenue && filteredRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={filteredRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.35} />
                        <stop offset="50%" stopColor="hsl(260, 70%, 55%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(280, 67%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      stroke="hsl(var(--border))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      stroke="hsl(var(--border))"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={{ fill: "hsl(221, 83%, 53%)", strokeWidth: 2, r: 3 }}
                      activeDot={{ fill: "hsl(221, 83%, 53%)", strokeWidth: 2, r: 5, stroke: "white" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-500/15">
                    <BarChart3 className="h-7 w-7 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No revenue data yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Revenue will appear here once bills are created</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-500" />
                {t("dashboard.serviceBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {serviceBreakdown && serviceBreakdown.length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={serviceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="count"
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {serviceBreakdown.map((_: any, index: number) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {serviceBreakdown.map((item: any, index: number) => (
                      <div key={item.name} className="flex items-center justify-between gap-2 text-xs group">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/15">
                    <PieChartIcon className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No services yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add services to see the breakdown</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                {t("dashboard.recentVisits")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/opd")} data-testid="button-view-all-visits">
                {t("dashboard.viewAll")}
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {filteredVisits && filteredVisits.length > 0 ? (
                <div className="space-y-2">
                  {filteredVisits.slice(0, 5).map((visit: any, idx: number) => {
                    const avatarColors = [
                      "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      "bg-violet-500/15 text-violet-600 dark:text-violet-400",
                      "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      "bg-pink-500/15 text-pink-600 dark:text-pink-400",
                    ];
                    const borderColors = [
                      "border-blue-500/15",
                      "border-emerald-500/15",
                      "border-violet-500/15",
                      "border-amber-500/15",
                      "border-pink-500/15",
                    ];
                    const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
                      active: "default",
                      completed: "secondary",
                      cancelled: "destructive",
                    };
                    const initials = (visit.patientName || "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div key={visit.id} className={`flex items-center justify-between gap-3 p-3 rounded-md border ${borderColors[idx % borderColors.length]} hover-elevate`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColors[idx % avatarColors.length]}`}>
                            {initials}
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-sm font-semibold truncate">{visit.patientName}</span>
                            <span className="text-xs text-muted-foreground truncate">{visit.visitId} {visit.doctorName ? `- Dr. ${visit.doctorName}` : ""}</span>
                          </div>
                        </div>
                        <Badge variant={statusVariant[visit.status] || "default"} className="text-[11px]">
                          {visit.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500/10 dark:bg-pink-500/15">
                    <Stethoscope className="h-7 w-7 text-pink-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">{t("dashboard.noRecentVisits")}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">OPD visits will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4 flex-wrap">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Banknote className="h-4 w-4 text-amber-500" />
                Financial Summary
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} data-testid="button-view-reports">
                {t("sidebar.reports")}
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 p-3.5 rounded-md bg-blue-500/8 dark:bg-blue-500/10 border border-blue-500/15">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{t("dashboard.stats.totalPatients")}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300 tabular-nums" data-testid="text-total-patients">{stats?.totalPatients ?? 0}</span>
                </div>
                <div className="flex flex-col gap-2 p-3.5 rounded-md bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/15">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15">
                      <Pill className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{t("dashboard.stats.totalMedicines")}</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums" data-testid="text-total-medicines">{stats?.totalMedicines ?? 0}</span>
                </div>
                <div className="flex flex-col gap-2 p-3.5 rounded-md bg-violet-500/8 dark:bg-violet-500/10 border border-violet-500/15">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/15">
                      <ArrowUpRight className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{t("dashboard.stats.monthRevenue")}</span>
                  </div>
                  <span className="text-xl font-bold text-violet-700 dark:text-violet-300 tabular-nums" data-testid="text-month-revenue">${stats?.monthRevenue ?? "0"}</span>
                </div>
                <div className="flex flex-col gap-2 p-3.5 rounded-md bg-amber-500/8 dark:bg-amber-500/10 border border-amber-500/15">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15">
                      <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{t("dashboard.stats.monthExpenses")}</span>
                  </div>
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums" data-testid="text-month-expenses">${stats?.monthExpenses ?? "0"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
