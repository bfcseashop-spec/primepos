import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, DollarSign, Receipt, TrendingUp, Stethoscope,
  Pill, BarChart3, FileText
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = [
  "hsl(210, 85%, 35%)", "hsl(195, 75%, 38%)", "hsl(170, 65%, 35%)",
  "hsl(155, 55%, 32%)", "hsl(140, 60%, 30%)", "hsl(30, 80%, 45%)",
];

export default function ReportsPage() {
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
      <PageHeader title="Analytics & Reports" description="Comprehensive clinic performance analytics" />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatsCard title="Total Revenue" value={`$${stats?.totalRevenue ?? "0"}`} icon={DollarSign} />
              <StatsCard title="Total Expenses" value={`$${stats?.totalExpenses ?? "0"}`} icon={Receipt} />
              <StatsCard title="Net Profit" value={`$${stats?.netProfit ?? "0"}`} icon={TrendingUp} trendUp={(stats?.netProfit ?? 0) > 0} />
              <StatsCard title="Total Patients" value={stats?.totalPatients ?? 0} icon={Users} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard title="Total Visits" value={stats?.totalVisits ?? 0} icon={Stethoscope} />
          <StatsCard title="Total Bills" value={stats?.totalBills ?? 0} icon={FileText} />
          <StatsCard title="Medicines" value={stats?.totalMedicines ?? 0} icon={Pill} />
          <StatsCard title="Services" value={stats?.totalServices ?? 0} icon={BarChart3} />
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {monthlyRevenue && monthlyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="expenses" stroke={COLORS[5]} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
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
                <CardTitle className="text-sm font-semibold">Expenses by Category</CardTitle>
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
                <CardTitle className="text-sm font-semibold">Top Services</CardTitle>
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
