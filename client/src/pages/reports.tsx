import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, DollarSign, Receipt, TrendingUp, Stethoscope,
  Pill, BarChart3, FileText
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Area, AreaChart
} from "recharts";
import { useTranslation } from "@/i18n";

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)", "hsl(346, 77%, 50%)", "hsl(190, 80%, 45%)",
];

export default function ReportsPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/reports/summary"],
  });

  const { data: monthlyRevenue } = useQuery<any[]>({
    queryKey: ["/api/reports/monthly-revenue"],
  });

  const { data: expensesByCategory } = useQuery<any[]>({
    queryKey: ["/api/reports/expenses-by-category"],
  });

  const { data: topServices } = useQuery<any[]>({
    queryKey: ["/api/reports/top-services"],
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card data-testid="stat-total-revenue">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shrink-0">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.totalRevenue")}</p>
                      <p className="text-xl font-bold">${stats?.totalRevenue ?? "0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-total-expenses">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-red-500 to-red-600 shrink-0">
                      <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.totalExpenses")}</p>
                      <p className="text-xl font-bold">${stats?.totalExpenses ?? "0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-net-profit">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600 shrink-0">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.netProfit")}</p>
                      <p className="text-xl font-bold">${stats?.netProfit ?? "0"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="stat-total-patients">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.totalPatients")}</p>
                      <p className="text-xl font-bold">{stats?.totalPatients ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="stat-total-visits">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 shrink-0">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.totalVisits")}</p>
                  <p className="text-xl font-bold">{stats?.totalVisits ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-bills">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-cyan-600 shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.totalBills")}</p>
                  <p className="text-xl font-bold">{stats?.totalBills ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-medicines">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-pink-600 shrink-0">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.medicinesCount")}</p>
                  <p className="text-xl font-bold">{stats?.totalMedicines ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-services">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-600 shrink-0">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("reports.servicesCount")}</p>
                  <p className="text-xl font-bold">{stats?.totalServices ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue" data-testid="tab-revenue" className="gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" />{t("reports.revenueAnalytics")}</TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses" className="gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-amber-500" />{t("reports.expenseBreakdown")}</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services" className="gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("reports.serviceAnalytics")}</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  {t("reports.monthlyRevenue")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {monthlyRevenue && monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="reportsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="reportsExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[4]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[4]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} fill="url(#reportsRevenueGradient)" />
                      <Area type="monotone" dataKey="expenses" stroke={COLORS[4]} strokeWidth={2} fill="url(#reportsExpenseGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
                    No revenue data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="mt-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  {t("reports.expenseBreakdown")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {expensesByCategory && expensesByCategory.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="total"
                          nameKey="category"
                        >
                          {expensesByCategory.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {expensesByCategory.map((item: any, i: number) => (
                        <div key={item.category} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm">{item.category}</span>
                          </div>
                          <span className="font-medium text-sm">${Number(item.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
                    No expense data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="mt-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t("reports.topServices")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {topServices && topServices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topServices} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="revenue" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
                    No service data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
