import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Clock, CheckCircle2, Activity, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { TablePagination } from "@/components/table-pagination";

type HrmDay = {
  date: string;
  status: "scheduled" | "present" | "absent";
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workingMinutes: number;
};

type HrmHistoryDay = HrmDay & {
  id?: number;
  notes?: string | null;
};

type HrmSummary = {
  today: HrmDay | null;
  recent: HrmDay[];
};

type HrmAdminRow = {
  id: number;
  userId: number;
  userName: string;
  fullName: string | null;
  date: string;
  status: "scheduled" | "present" | "absent";
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workingMinutes: number;
};

const MINUTES_PER_DAY = 8 * 60;

function HistoryTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/hrm/attendance/history"],
  });
  const [viewDay, setViewDay] = useState<HrmHistoryDay | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = (data ?? []) as HrmHistoryDay[];
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="flex-1 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="py-2 px-2 text-left">Date</th>
            <th className="py-2 px-2 text-left">Status</th>
            <th className="py-2 px-2 text-center">Check-in</th>
            <th className="py-2 px-2 text-center">Check-out</th>
            <th className="py-2 px-2 text-right">Worked (hrs)</th>
            <th className="py-2 px-2 text-right">Overtime (hrs)</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                className="py-4 px-2 text-center text-muted-foreground"
                colSpan={6}
              >
                Loading history...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                className="py-4 px-2 text-center text-muted-foreground"
                colSpan={6}
              >
                No attendance history found.
              </td>
            </tr>
          ) : (
            paginatedRows.map((d) => {
              const workedHrs = (d.workingMinutes ?? 0) / 60;
              const overtimeMinutes = Math.max(
                0,
                (d.workingMinutes ?? 0) - MINUTES_PER_DAY,
              );
              return (
                <tr key={d.id ?? d.date} className="border-b last:border-b-0 cursor-pointer hover:bg-muted/30" onClick={() => setViewDay(d)}>
                  <td className="py-2 px-2">
                    {format(new Date(d.date), "dd MMM yyyy")}
                  </td>
                  <td className="py-2 px-2">
                    {d.status === "present" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Present
                      </Badge>
                    ) : d.status === "absent" ? (
                      <Badge
                        variant="outline"
                        className="text-red-600 border-red-500/40"
                      >
                        Absent
                      </Badge>
                    ) : (
                      <Badge variant="outline">Scheduled</Badge>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {d.checkInTime ? format(new Date(d.checkInTime), "hh:mm a") : "-"}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {d.checkOutTime
                      ? format(new Date(d.checkOutTime), "hh:mm a")
                      : "-"}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {workedHrs.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {overtimeMinutes > 0
                      ? (overtimeMinutes / 60).toFixed(2)
                      : "-"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
      {rows.length > 0 && !isLoading && (
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <TablePagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(v) => { setPageSize(v); setPage(1); }} fixedAtBottom />
        </div>
      )}
      <Dialog open={!!viewDay} onOpenChange={(open) => { if (!open) setViewDay(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Attendance Record</DialogTitle>
            <DialogDescription>View attendance details</DialogDescription>
          </DialogHeader>
          {viewDay && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{format(new Date(viewDay.date), "dd MMM yyyy")}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge className={viewDay.status === "present" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : viewDay.status === "absent" ? "text-red-600 border-red-500/40" : ""}>{viewDay.status}</Badge></p></div>
                <div><span className="text-muted-foreground">Check-in:</span><p className="font-medium">{viewDay.checkInTime ? format(new Date(viewDay.checkInTime), "hh:mm a") : "-"}</p></div>
                <div><span className="text-muted-foreground">Check-out:</span><p className="font-medium">{viewDay.checkOutTime ? format(new Date(viewDay.checkOutTime), "hh:mm a") : "-"}</p></div>
                <div><span className="text-muted-foreground">Worked (hrs):</span><p className="font-medium">{((viewDay.workingMinutes ?? 0) / 60).toFixed(2)}</p></div>
                <div><span className="text-muted-foreground">Overtime (hrs):</span><p className="font-medium">{Math.max(0, (viewDay.workingMinutes ?? 0) - MINUTES_PER_DAY) / 60 > 0 ? (Math.max(0, (viewDay.workingMinutes ?? 0) - MINUTES_PER_DAY) / 60).toFixed(2) : "-"}</p></div>
                {viewDay.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span><p className="font-medium">{viewDay.notes}</p></div>}
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewDay(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HrmPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const isAdminLike =
    !!auth?.role && auth.role.toLowerCase().includes("admin");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/hrm/attendance/summary"],
  });

  const { data: adminData } = useQuery({
    queryKey: ["/api/hrm/attendance/all"],
    enabled: isAdminLike,
  });

  const { data: salaryProfilesData } = useQuery({
    queryKey: ["/api/salary-profiles"],
    enabled: !!auth,
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hrm/attendance/check-in");
      return (await res.json()) as HrmDay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hrm/attendance/summary"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hrm/attendance/check-out");
      return (await res.json()) as HrmDay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hrm/attendance/summary"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Check-out failed", description: err.message, variant: "destructive" });
    },
  });

  const summary = (data ?? null) as HrmSummary | null;
  const today = summary?.today ?? null;
  const isPunchedIn = !!today?.checkInTime && !today?.checkOutTime;

  const adminRows = ((adminData as { recent?: HrmAdminRow[] } | undefined)?.recent ?? []) as HrmAdminRow[];
  const recentDays = (summary?.recent ?? []) as HrmDay[];

  const totalWorkedMinutes = recentDays.reduce((sum, d) => sum + (d.workingMinutes ?? 0), 0);
  const totalWorkedHours = totalWorkedMinutes / 60;
  const daysPresent = recentDays.filter((d) => d.status === "present").length;
  const daysAbsent = recentDays.filter((d) => d.status === "absent").length;
  const daysScheduled = recentDays.filter((d) => d.status === "scheduled").length;
  const totalOvertimeMinutes = recentDays.reduce(
    (sum, d) => sum + Math.max(0, d.workingMinutes - MINUTES_PER_DAY),
    0,
  );
  const totalOvertimeHours = totalOvertimeMinutes / 60;

  const salaryProfiles = (salaryProfilesData ?? []) as any[];
  const activeProfile =
    auth &&
    salaryProfiles.find(
      (p) =>
        (p.staffId && String(p.staffId).trim() === String(auth.id)) ||
        (p.staffName && String(p.staffName).trim() === String(auth.fullName).trim()),
    );
  const baseSalary = activeProfile ? Number(activeProfile.baseSalary) || 0 : 0;
  const standardMonthlyHours = 160; // 8h * 5d * 4w
  const hourlyRate = baseSalary > 0 ? baseSalary / standardMonthlyHours : 0;
  const expectedRegularPay = hourlyRate * totalWorkedHours;
  const expectedOvertimePay = hourlyRate * 1.5 * totalOvertimeHours;
  const expectedWeeklyPay = expectedRegularPay + expectedOvertimePay;

  const handlePunch = () => {
    if (isPunchedIn) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate();
    }
  };

  const formatTime = (iso?: string | null) =>
    iso ? format(new Date(iso), "hh:mm a") : "-";

  const minutesToHours = (m: number) => (m / 60).toFixed(2);

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4 overflow-auto p-4 md:p-6">
      <PageHeader
        title="HRM / Attendance"
        description="Track staff timesheet, today activity, and weekly attendance."
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-sky-400" />
                Timesheet
              </CardTitle>
              <CardDescription>
                {today
                  ? `Punch in at ${
                      today.checkInTime ? formatTime(today.checkInTime) : "Not checked in"
                    }`
                  : "Not checked in"}
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              {today
                ? format(new Date(today.date), "dd MMM yyyy")
                : format(new Date(), "dd MMM yyyy")}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center h-40 w-40 rounded-full border-4 border-sky-500/60 bg-slate-900/40 shadow-[0_0_40px_rgba(56,189,248,0.45)]">
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Work Hours
                  </span>
                  <span className="text-3xl font-bold text-white">
                    {today ? minutesToHours(today.workingMinutes) : "0.00"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Target: {(MINUTES_PER_DAY / 60).toFixed(1)} hrs
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                {today?.status === "present" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Present
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-600 text-slate-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Not checked in
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Check-in
                </p>
                <p className="mt-1 text-base font-semibold text-white">
                  {formatTime(today?.checkInTime)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Check-out
                </p>
                <p className="mt-1 text-base font-semibold text-white">
                  {formatTime(today?.checkOutTime)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Break
                </span>
                <span className="text-base font-semibold text-white">
                  0.0 hrs
                </span>
                <span className="text-[11px] text-slate-500">
                  Break tracking can be added later
                </span>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Overtime
                </span>
                <span className="text-base font-semibold text-emerald-400">
                  {today && today.workingMinutes > MINUTES_PER_DAY
                    ? ((today.workingMinutes - MINUTES_PER_DAY) / 60).toFixed(1)
                    : "0.0"}{" "}
                  hrs
                </span>
                <span className="text-[11px] text-slate-500">
                  Calculated over {MINUTES_PER_DAY / 60} hrs/day
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-2"
              size="lg"
              onClick={handlePunch}
              disabled={checkInMutation.isPending || checkOutMutation.isPending || isLoading}
            >
              {checkInMutation.isPending || checkOutMutation.isPending
                ? "Saving..."
                : isPunchedIn
                ? "Punch Out"
                : "Punch In"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Today Activity
            </CardTitle>
            <CardDescription>Quick view of today&apos;s punches</CardDescription>
          </CardHeader>
          <CardContent>
            {today?.checkInTime || today?.checkOutTime ? (
              <ul className="space-y-2 text-sm">
                {today.checkInTime && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium">Punch In</span>
                    <span className="text-muted-foreground ml-1">
                      at {formatTime(today.checkInTime)}
                    </span>
                  </li>
                )}
                {today.checkOutTime && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium">Punch Out</span>
                    <span className="text-muted-foreground ml-1">
                      at {formatTime(today.checkOutTime)}
                    </span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity recorded yet for today.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-sky-500" />
              Attendance List
            </CardTitle>
            <CardDescription>
              This week&apos;s attendance overview.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              This week
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] h-7 px-2"
              onClick={() => setHistoryOpen(true)}
            >
              View history
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="py-2 px-2 text-left">Date</th>
                  <th className="py-2 px-2 text-left">Status</th>
                  <th className="py-2 px-2 text-center">Shift Start</th>
                  <th className="py-2 px-2 text-center">Shift End</th>
                  <th className="py-2 px-2 text-center">Punch In</th>
                  <th className="py-2 px-2 text-center">Punch Out</th>
                  <th className="py-2 px-2 text-right">Production (hrs)</th>
                  <th className="py-2 px-2 text-right">Break (hrs)</th>
                  <th className="py-2 px-2 text-right">Overtime (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recent ?? []).length === 0 ? (
                  <tr>
                    <td
                      className="py-4 px-2 text-center text-muted-foreground"
                      colSpan={9}
                    >
                      No attendance records yet.
                    </td>
                  </tr>
                ) : (
                  (summary!.recent as HrmDay[]).map((d) => {
                    const workedHrs = d.workingMinutes / 60;
                    const overtimeMinutes = Math.max(
                      0,
                      d.workingMinutes - MINUTES_PER_DAY,
                    );
                    return (
                      <tr key={d.date} className="border-b last:border-b-0">
                        <td className="py-2 px-2">
                          {format(new Date(d.date), "dd MMM yyyy")}
                        </td>
                        <td className="py-2 px-2">
                          {d.status === "present" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Present
                            </Badge>
                          ) : d.status === "absent" ? (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-500/40"
                            >
                              Absent
                            </Badge>
                          ) : (
                            <Badge variant="outline">Scheduled</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">10:30</td>
                        <td className="py-2 px-2 text-center">22:30</td>
                        <td className="py-2 px-2 text-center">
                          {formatTime(d.checkInTime)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {formatTime(d.checkOutTime)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {workedHrs.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right">0.0</td>
                        <td className="py-2 px-2 text-right">
                          {overtimeMinutes > 0
                            ? (overtimeMinutes / 60).toFixed(1)
                            : "0.0"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Attendance history (last 30 days)</DialogTitle>
          </DialogHeader>
          <HistoryTable />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-500" />
            Weekly Summary
          </CardTitle>
          <CardDescription>
            Overview of this week&apos;s presence and work hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Present Days
              </span>
              <span className="text-xl font-bold text-emerald-400">
                {daysPresent}
              </span>
              <span className="text-[11px] text-slate-500">
                Out of {recentDays.length || 7} scheduled days
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Absent Days
              </span>
              <span className="text-xl font-bold text-red-400">
                {daysAbsent}
              </span>
              <span className="text-[11px] text-slate-500">
                Marked as absent or no punch
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Total Worked
              </span>
              <span className="text-xl font-bold text-sky-400">
                {totalWorkedHours.toFixed(1)} hrs
              </span>
              <span className="text-[11px] text-slate-500">
                Sum of all worked hours this week
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Overtime
              </span>
              <span className="text-xl font-bold text-amber-400">
                {totalOvertimeHours.toFixed(1)} hrs
              </span>
              <span className="text-[11px] text-slate-500">
                Above {(MINUTES_PER_DAY / 60).toFixed(1)} hrs/day
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            Expected Salary & Deductions
          </CardTitle>
          <CardDescription>
            Estimated weekly earnings based on your salary profile and attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {baseSalary <= 0 ? (
            <p className="text-sm text-muted-foreground">
              No salary profile is linked to your account yet. Ask an administrator to
              create a salary profile to see expected salary details here.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Base Salary (monthly)
                </span>
                <span className="text-xl font-bold text-white">
                  ${baseSalary.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500">
                  Approx. hourly rate: ${hourlyRate.toFixed(2)}/hr
                </span>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  This Week&apos;s Work
                </span>
                <span className="text-xl font-bold text-sky-400">
                  ${expectedRegularPay.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {totalWorkedHours.toFixed(1)} hrs at normal rate
                </span>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  Overtime & Total
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  ${expectedWeeklyPay.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500">
                  Includes ${expectedOvertimePay.toFixed(2)} overtime ({totalOvertimeHours.toFixed(1)} hrs)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdminLike && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-500" />
                All Staff Attendance (Last 7 days)
              </CardTitle>
              <CardDescription>
                Overview of all users&apos; attendance for admins and super admins.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-2 px-2 text-left">Staff</th>
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Status</th>
                    <th className="py-2 px-2 text-center">Check-in</th>
                    <th className="py-2 px-2 text-center">Check-out</th>
                    <th className="py-2 px-2 text-right">Worked (hrs)</th>
                    <th className="py-2 px-2 text-right">Overtime (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.length === 0 ? (
                    <tr>
                      <td
                        className="py-4 px-2 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        No attendance records yet for any staff.
                      </td>
                    </tr>
                  ) : (
                    adminRows.map((r) => {
                      const workedHrs = r.workingMinutes / 60;
                      const overtimeMinutes = Math.max(
                        0,
                        r.workingMinutes - MINUTES_PER_DAY,
                      );
                      const displayName =
                        r.fullName && r.fullName.trim().length > 0
                          ? r.fullName
                          : r.userName;
                      return (
                        <tr
                          key={`${r.userId}-${r.date}`}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 px-2">
                            <span className="font-medium">{displayName}</span>
                            <span className="block text-xs text-muted-foreground">
                              {r.userName}
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            {format(new Date(r.date), "dd MMM yyyy")}
                          </td>
                          <td className="py-2 px-2">
                            {r.status === "present" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Present
                              </Badge>
                            ) : r.status === "absent" ? (
                              <Badge
                                variant="outline"
                                className="text-red-600 border-red-500/40"
                              >
                                Absent
                              </Badge>
                            ) : (
                              <Badge variant="outline">Scheduled</Badge>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {formatTime(r.checkInTime)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {formatTime(r.checkOutTime)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {workedHrs.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {overtimeMinutes > 0
                              ? (overtimeMinutes / 60).toFixed(2)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

