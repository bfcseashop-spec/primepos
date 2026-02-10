import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileText, Stethoscope, Pill, Receipt,
  TrendingUp, Calendar, DollarSign
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const CHART_COLORS = [
  "hsl(210, 85%, 35%)",
  "hsl(195, 75%, 38%)",
  "hsl(170, 65%, 35%)",
  "hsl(155, 55%, 32%)",
  "hsl(140, 60%, 30%)",
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
              />
              <StatsCard
                title="Today's Revenue"
                value={`$${stats?.todayRevenue ?? "0.00"}`}
                icon={DollarSign}
                trend={`${stats?.revenueTrend ?? 0}% vs yesterday`}
                trendUp={(stats?.revenueTrend ?? 0) >= 0}
              />
              <StatsCard
                title="Active OPD"
                value={stats?.activeOpd ?? 0}
                icon={Stethoscope}
              />
              <StatsCard
                title="Total Bills"
                value={stats?.totalBills ?? 0}
                icon={FileText}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
              <Badge variant="secondary">Last 7 days</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
                  No revenue data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold">Service Breakdown</CardTitle>
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
                            className="w-2.5 h-2.5 rounded-sm"
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
                <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
                  No service data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold">Recent OPD Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {recentVisits && recentVisits.length > 0 ? (
                <div className="space-y-2">
                  {recentVisits.slice(0, 5).map((visit: any) => (
                    <div key={visit.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{visit.patientName}</span>
                        <span className="text-xs text-muted-foreground">{visit.visitId} - {visit.doctorName || "N/A"}</span>
                      </div>
                      <Badge variant={visit.status === "active" ? "default" : "secondary"}>
                        {visit.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No recent visits
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 p-4">
              <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">Total Patients</span>
                  <span className="text-lg font-bold">{stats?.totalPatients ?? 0}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">Medicines</span>
                  <span className="text-lg font-bold">{stats?.totalMedicines ?? 0}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">Month Revenue</span>
                  <span className="text-lg font-bold">${stats?.monthRevenue ?? "0"}</span>
                </div>
                <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">Month Expenses</span>
                  <span className="text-lg font-bold">${stats?.monthExpenses ?? "0"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
