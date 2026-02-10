import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileText, Stethoscope, Pill, Receipt,
  TrendingUp, Calendar, DollarSign, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from "recharts";

const CHART_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(346, 77%, 50%)",
  "hsl(190, 80%, 45%)",
];

export default function Dashboard() {
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" description="Overview of your clinic operations" />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatsCard
                title="Today's Patients"
                value={stats?.todayPatients ?? 0}
                icon={Users}
                trend={`${stats?.patientTrend ?? 0}% vs yesterday`}
                trendUp={(stats?.patientTrend ?? 0) >= 0}
                iconColor="text-blue-500 dark:text-blue-400"
                iconBg="bg-blue-500/10 dark:bg-blue-400/10"
              />
              <StatsCard
                title="Today's Revenue"
                value={`$${stats?.todayRevenue ?? "0.00"}`}
                icon={DollarSign}
                trend={`${stats?.revenueTrend ?? 0}% vs yesterday`}
                trendUp={(stats?.revenueTrend ?? 0) >= 0}
                iconColor="text-emerald-500 dark:text-emerald-400"
                iconBg="bg-emerald-500/10 dark:bg-emerald-400/10"
              />
              <StatsCard
                title="Active OPD"
                value={stats?.activeOpd ?? 0}
                icon={Stethoscope}
                iconColor="text-violet-500 dark:text-violet-400"
                iconBg="bg-violet-500/10 dark:bg-violet-400/10"
              />
              <StatsCard
                title="Total Bills"
                value={stats?.totalBills ?? 0}
                icon={FileText}
                iconColor="text-amber-500 dark:text-amber-400"
                iconBg="bg-amber-500/10 dark:bg-amber-400/10"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                Revenue Overview
              </CardTitle>
              <Badge variant="secondary">Last 7 days</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-sm gap-2">
                  <Activity className="h-8 w-8 text-muted-foreground/40" />
                  No revenue data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                Service Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {serviceBreakdown && serviceBreakdown.length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={serviceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {serviceBreakdown.map((_: any, index: number) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {serviceBreakdown.map((item: any, index: number) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-sm gap-2">
                  <Receipt className="h-8 w-8 text-muted-foreground/40" />
                  No service data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                Recent OPD Visits
              </CardTitle>
              <Calendar className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentVisits && recentVisits.length > 0 ? (
                <div className="space-y-2">
                  {recentVisits.slice(0, 5).map((visit: any, idx: number) => {
                    const colors = ["bg-blue-500/10 border-blue-500/20", "bg-emerald-500/10 border-emerald-500/20", "bg-violet-500/10 border-violet-500/20", "bg-amber-500/10 border-amber-500/20", "bg-pink-500/10 border-pink-500/20"];
                    const textColors = ["text-blue-600 dark:text-blue-400", "text-emerald-600 dark:text-emerald-400", "text-violet-600 dark:text-violet-400", "text-amber-600 dark:text-amber-400", "text-pink-600 dark:text-pink-400"];
                    return (
                      <div key={visit.id} className={`flex items-center justify-between p-2.5 rounded-md border ${colors[idx % colors.length]}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-background`}>
                            <Users className={`h-3.5 w-3.5 ${textColors[idx % textColors.length]}`} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{visit.patientName}</span>
                            <span className="text-xs text-muted-foreground">{visit.visitId} - {visit.doctorName || "N/A"}</span>
                          </div>
                        </div>
                        <Badge variant={visit.status === "active" ? "default" : "secondary"}>
                          {visit.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                  <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
                  No recent visits
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                Quick Stats
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 rounded-md bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20">
                  <span className="text-xs text-muted-foreground">Total Patients</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats?.totalPatients ?? 0}</span>
                    <Users className="h-3.5 w-3.5 text-blue-400/60" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20">
                  <span className="text-xs text-muted-foreground">Medicines</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats?.totalMedicines ?? 0}</span>
                    <Pill className="h-3.5 w-3.5 text-emerald-400/60" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-violet-500/10 dark:bg-violet-400/10 border border-violet-500/20 dark:border-violet-400/20">
                  <span className="text-xs text-muted-foreground">Month Revenue</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-400">${stats?.monthRevenue ?? "0"}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-violet-400/60" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20">
                  <span className="text-xs text-muted-foreground">Month Expenses</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">${stats?.monthExpenses ?? "0"}</span>
                    <ArrowDownRight className="h-3.5 w-3.5 text-amber-400/60" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
