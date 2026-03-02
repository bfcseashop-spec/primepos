import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Clock, CheckCircle2, Activity, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type HrmDay = {
  date: string;
  status: "scheduled" | "present" | "absent";
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workingMinutes: number;
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

export default function HrmPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const isAdminLike =
    !!auth?.role && auth.role.toLowerCase().includes("admin");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/hrm/attendance/summary"],
  });

  const { data: adminData } = useQuery({
    queryKey: ["/api/hrm/attendance/all"],
    enabled: isAdminLike,
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
          <div className="text-xs text-muted-foreground">This week</div>
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

