import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, Search, MoreVertical, Trash2, Edit, User, Filter, CalendarCheck, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Appointment, Patient } from "@shared/schema";

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "bg-blue-500/10 dark:bg-blue-400/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20" },
  confirmed: { bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20" },
  completed: { bg: "bg-slate-500/10 dark:bg-slate-400/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20" },
  cancelled: { bg: "bg-red-500/10 dark:bg-red-400/10", text: "text-red-700 dark:text-red-300", border: "border-red-500/20" },
  "no-show": { bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
};

const statCards = [
  { key: "total", label: "Total", icon: CalendarCheck, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/10", border: "border-blue-500/20 dark:border-blue-400/20" },
  { key: "scheduled", label: "Scheduled", icon: Calendar, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10 dark:bg-violet-400/10", border: "border-violet-500/20 dark:border-violet-400/20" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-400/10", border: "border-emerald-500/20 dark:border-emerald-400/20" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500/10 dark:bg-cyan-400/10", border: "border-cyan-500/20 dark:border-cyan-400/20" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-400/10", border: "border-red-500/20 dark:border-red-400/20" },
];

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editDialog, setEditDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");

  const { data: appointments = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/appointments"] });
  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/appointments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Appointment updated" });
      setEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Appointment deleted" });
    },
  });

  const filtered = appointments.filter((a: any) => {
    const matchSearch = !search || a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.department?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats: Record<string, number> = {
    total: appointments.length,
    scheduled: appointments.filter((a: any) => a.status === "scheduled").length,
    confirmed: appointments.filter((a: any) => a.status === "confirmed").length,
    completed: appointments.filter((a: any) => a.status === "completed").length,
    cancelled: appointments.filter((a: any) => a.status === "cancelled").length,
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Appointments" description="Manage all clinic appointments" />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <Card key={s.key} data-testid={`stat-${s.key}`} className={`border ${s.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{stats[s.key]}</p>
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient, doctor, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-appointments"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading appointments...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/30" />
                No appointments found. Create one from the OPD Management page.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Patient</th>
                      <th className="text-left p-3 font-medium">Department</th>
                      <th className="text-left p-3 font-medium">Doctor</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Mode</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Payment</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((apt: any) => {
                      const style = statusStyles[apt.status] || statusStyles.scheduled;
                      return (
                        <tr key={apt.id} className="border-b hover-elevate" data-testid={`row-appointment-${apt.id}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-400/10">
                                <User className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                              </div>
                              <span className="font-medium">{apt.patientName}</span>
                            </div>
                          </td>
                          <td className="p-3">{apt.department || "-"}</td>
                          <td className="p-3">{apt.doctorName || "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-violet-400" />
                              {apt.appointmentDate || "-"}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-400" />
                              {apt.startTime || "-"}{apt.endTime ? ` - ${apt.endTime}` : ""}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{apt.consultationMode || "-"}</Badge>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="p-3">{apt.paymentMode || "-"}</td>
                          <td className="p-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-actions-${apt.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingAppointment(apt);
                                  setEditStatus(apt.status);
                                  setEditDialog(true);
                                }} data-testid={`button-edit-${apt.id}`}>
                                  <Edit className="h-4 w-4 mr-2 text-blue-500" /> Edit Status
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(apt.id)}
                                  data-testid={`button-delete-${apt.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Appointment Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Patient: {editingAppointment?.patientName}</label>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)} data-testid="button-cancel-edit">Cancel</Button>
              <Button
                onClick={() => {
                  if (editingAppointment) {
                    updateMutation.mutate({ id: editingAppointment.id, data: { status: editStatus } });
                  }
                }}
                disabled={updateMutation.isPending}
                data-testid="button-save-edit"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
