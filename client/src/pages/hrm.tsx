import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Clock, CheckCircle2, Activity, CalendarDays } from "lucide-react";

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

const MINUTES_PER_DAY = 8 * 60;

export default function HrmPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/hrm/attendance/summary"],
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Timesheet
              </CardTitle>
              <CardDescription>
                {today
                  ? `Date: ${format(new Date(today.date), "dd MMM yyyy")}`
                  : "No record for today yet"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Status
                </p>
                {today?.status === "present" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" /> Not checked in
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Worked Hours
                </p>
                <p className="text-2xl font-bold">
                  {today ? minutesToHours(today.workingMinutes) : "0.00"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-medium">{formatTime(today?.checkInTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-medium">{formatTime(today?.checkOutTime)}</p>
              </div>
            </div>

            <Button
              className="w-full"
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
              This Week&apos;s Attendance
            </CardTitle>
            <CardDescription>Recent 7 days attendance summary.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
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
                {(summary?.recent ?? []).length === 0 ? (
                  <tr>
                    <td className="py-4 px-2 text-center text-muted-foreground" colSpan={6}>
                      No attendance records yet.
                    </td>
                  </tr>
                ) : (
                  (summary!.recent as HrmDay[]).map((d) => {
                    const workedHrs = d.workingMinutes / 60;
                    const overtimeMinutes = Math.max(0, d.workingMinutes - MINUTES_PER_DAY);
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
                            <Badge variant="outline" className="text-red-600 border-red-500/40">
                              Absent
                            </Badge>
                          ) : (
                            <Badge variant="outline">Scheduled</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {formatTime(d.checkInTime)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {formatTime(d.checkOutTime)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {workedHrs.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {overtimeMinutes > 0 ? (overtimeMinutes / 60).toFixed(2) : "-"}
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
    </div>
  );
}

