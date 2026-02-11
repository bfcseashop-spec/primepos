import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, Search, MoreVertical, Trash2, Edit, User, CalendarCheck, CheckCircle2, XCircle, AlertCircle, Stethoscope, CreditCard, Video, Phone as PhoneIcon, UserCheck, RefreshCw, CalendarDays } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import type { Patient } from "@shared/schema"; // used for patients query type

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; icon: any; gradient: string }> = {
  scheduled: {
    bg: "bg-blue-500/10 dark:bg-blue-400/10", text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/20", dot: "bg-blue-500", icon: Calendar,
    gradient: "from-blue-500 to-blue-600",
  },
  confirmed: {
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/20", dot: "bg-emerald-500", icon: CheckCircle2,
    gradient: "from-emerald-500 to-emerald-600",
  },
  completed: {
    bg: "bg-cyan-500/10 dark:bg-cyan-400/10", text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/20", dot: "bg-cyan-500", icon: CheckCircle2,
    gradient: "from-cyan-500 to-cyan-600",
  },
  cancelled: {
    bg: "bg-red-500/10 dark:bg-red-400/10", text: "text-red-700 dark:text-red-300",
    border: "border-red-500/20", dot: "bg-red-500", icon: XCircle,
    gradient: "from-red-500 to-red-600",
  },
  "no-show": {
    bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/20", dot: "bg-amber-500", icon: AlertCircle,
    gradient: "from-amber-500 to-amber-600",
  },
};

const consultModeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  "In-Person": { icon: User, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  "Video Call": { icon: Video, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  "Phone Call": { icon: PhoneIcon, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
};

const avatarGradients = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editDialog, setEditDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editStatus, setEditStatus] = useState("");
  const [deleteAppointment, setDeleteAppointment] = useState<any>(null);
  const [viewAppointment, setViewAppointment] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
      setDeleteAppointment(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/appointments/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} appointment(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected appointment(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const toggleAppointmentSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    toast({ title: "Data refreshed" });
  };

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

  const statCards = [
    { key: "total", label: t("appointments.totalAppointments"), gradient: "from-blue-500 to-blue-600", value: stats.total, icon: CalendarDays },
    { key: "scheduled", label: t("appointments.scheduled"), gradient: "from-violet-500 to-violet-600", value: stats.scheduled, icon: Calendar },
    { key: "confirmed", label: t("appointments.confirmed"), gradient: "from-emerald-500 to-emerald-600", value: stats.confirmed, icon: UserCheck },
    { key: "completed", label: t("appointments.completed"), gradient: "from-cyan-500 to-cyan-600", value: stats.completed, icon: CheckCircle2 },
    { key: "cancelled", label: t("appointments.cancelled"), gradient: "from-red-500 to-red-600", value: stats.cancelled, icon: XCircle },
  ];

  const getInitials = (name: string) => {
    return name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };

  const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = filtered.filter((a: any) => a.appointmentDate === todayStr);
  const upcomingAppointments = filtered.filter((a: any) => a.appointmentDate > todayStr);
  const pastAppointments = filtered.filter((a: any) => !a.appointmentDate || a.appointmentDate < todayStr);

  const renderAppointmentCard = (apt: any) => {
    const style = statusConfig[apt.status] || statusConfig.scheduled;
    const StatusIcon = style.icon;
    const modeConfig = consultModeConfig[apt.consultationMode] || consultModeConfig["In-Person"];
    const ModeIcon = modeConfig?.icon || User;

    return (
      <Card key={apt.id} className="overflow-visible hover-elevate" data-testid={`card-appointment-${apt.id}`}>
        <CardContent className="p-0">
          <div className={`h-1 rounded-t-md bg-gradient-to-r ${style.gradient}`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={selectedIds.has(apt.id)}
                  onCheckedChange={() => toggleAppointmentSelection(apt.id)}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  data-testid={`checkbox-appointment-${apt.id}`}
                />
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(apt.id)} text-white`}>
                    {getInitials(apt.patientName || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-semibold" data-testid={`text-patient-name-${apt.id}`}>{apt.patientName || "Unknown"}</h4>
                  <p className="text-[11px] text-muted-foreground">{apt.patientType || "Out Patient"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${apt.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewAppointment(apt)} data-testid={`button-view-${apt.id}`}>
                    <CalendarCheck className="h-3.5 w-3.5 mr-2 text-blue-500" /> {t("common.view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setEditingAppointment(apt);
                    setEditStatus(apt.status);
                    setEditDialog(true);
                  }} data-testid={`button-edit-${apt.id}`}>
                    <Edit className="h-3.5 w-3.5 mr-2 text-amber-500" /> {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteAppointment(apt)}
                    data-testid={`button-delete-${apt.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-3">
              {apt.department && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
                    <Stethoscope className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                  </div>
                  <span className="text-muted-foreground">{apt.department}</span>
                </div>
              )}
              {apt.doctorName && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                    <User className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="text-muted-foreground">{apt.doctorName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap mb-3">
              {apt.appointmentDate && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                  <span className="text-muted-foreground">{apt.appointmentDate}</span>
                </div>
              )}
              {apt.startTime && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                  <span className="text-muted-foreground">
                    {apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${style.bg} ${style.text} ${style.border}`}
                data-testid={`badge-status-${apt.id}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${style.dot}`} />
                {apt.status}
              </Badge>
              <div className="flex items-center gap-2">
                {apt.consultationMode && (
                  <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${modeConfig?.bg || ""} ${modeConfig?.color || ""}`}>
                    <ModeIcon className="h-2.5 w-2.5 mr-1" />
                    {apt.consultationMode}
                  </Badge>
                )}
                {apt.paymentMode && (
                  <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                    <CreditCard className="h-2.5 w-2.5 mr-1" />
                    {apt.paymentMode}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title: string, items: any[], icon: any, color: string) => {
    const Icon = icon;
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`h-4 w-4 ${color}`} />
          <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map(renderAppointmentCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("appointments.title")}
        description={t("appointments.subtitle")}
        actions={
          <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <Card key={s.key} data-testid={`stat-${s.key}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${s.gradient} shrink-0`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("common.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-appointments"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="scheduled">{t("appointments.scheduled")}</SelectItem>
                    <SelectItem value="confirmed">{t("appointments.confirmed")}</SelectItem>
                    <SelectItem value="completed">{t("appointments.completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("appointments.cancelled")}</SelectItem>
                    <SelectItem value="no-show">{t("appointments.noShow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {appointments.length} appointments
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-primary/5 border">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-appointments">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <CalendarCheck className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("common.noData")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("appointments.subtitle")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {renderSection(t("appointments.today"), todayAppointments, CalendarCheck, "text-emerald-600 dark:text-emerald-400")}
            {renderSection(t("appointments.upcoming"), upcomingAppointments, CalendarDays, "text-blue-600 dark:text-blue-400")}
            {renderSection(t("appointments.past"), pastAppointments, Clock, "text-muted-foreground")}
            {todayAppointments.length === 0 && upcomingAppointments.length === 0 && pastAppointments.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(renderAppointmentCard)}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!viewAppointment} onOpenChange={(open) => { if (!open) setViewAppointment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-view-appointment-title">{t("appointments.title")}</DialogTitle>
            <DialogDescription>{t("appointments.subtitle")}</DialogDescription>
          </DialogHeader>
          {viewAppointment && (() => {
            const style = statusConfig[viewAppointment.status] || statusConfig.scheduled;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={`text-sm font-bold bg-gradient-to-br ${getAvatarGradient(viewAppointment.id)} text-white`}>
                      {getInitials(viewAppointment.patientName || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{viewAppointment.patientName}</h3>
                    <Badge variant="outline" className={`text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate ${style.bg} ${style.text} ${style.border}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${style.dot}`} />
                      {viewAppointment.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {viewAppointment.department && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
                        <Stethoscope className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("appointments.department")}</p>
                        <p className="text-sm font-medium">{viewAppointment.department}</p>
                      </div>
                    </div>
                  )}
                  {viewAppointment.doctorName && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                        <User className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("dashboard.doctor")}</p>
                        <p className="text-sm font-medium">{viewAppointment.doctorName}</p>
                      </div>
                    </div>
                  )}
                  {viewAppointment.appointmentDate && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                        <Calendar className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("appointments.date")}</p>
                        <p className="text-sm font-medium">{viewAppointment.appointmentDate}</p>
                      </div>
                    </div>
                  )}
                  {viewAppointment.startTime && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 shrink-0">
                        <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("appointments.startTime")}</p>
                        <p className="text-sm font-medium">{viewAppointment.startTime}{viewAppointment.endTime ? ` - ${viewAppointment.endTime}` : ""}</p>
                      </div>
                    </div>
                  )}
                  {viewAppointment.consultationMode && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pink-500/10 shrink-0">
                        <Video className="h-4 w-4 text-pink-500 dark:text-pink-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("appointments.consultationMode")}</p>
                        <p className="text-sm font-medium">{viewAppointment.consultationMode}</p>
                      </div>
                    </div>
                  )}
                  {viewAppointment.paymentMode && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 shrink-0">
                        <CreditCard className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{t("billing.paymentMethod")}</p>
                        <p className="text-sm font-medium">{viewAppointment.paymentMode}</p>
                      </div>
                    </div>
                  )}
                </div>
                {viewAppointment.reason && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("appointments.reason")}</p>
                    <p className="text-sm bg-muted/50 rounded-md p-2.5">{viewAppointment.reason}</p>
                  </div>
                )}
                {viewAppointment.notes && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{t("appointments.notes")}</p>
                    <p className="text-sm bg-muted/50 rounded-md p-2.5">{viewAppointment.notes}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => {
                    setViewAppointment(null);
                    setEditingAppointment(viewAppointment);
                    setEditStatus(viewAppointment.status);
                    setEditDialog(true);
                  }} data-testid="button-view-to-edit">
                    <Edit className="h-4 w-4 mr-1 text-amber-500" /> {t("common.edit")}
                  </Button>
                  <Button variant="outline" onClick={() => setViewAppointment(null)} data-testid="button-close-view">
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">{t("appointments.updateStatus")}</DialogTitle>
            <DialogDescription>{t("appointments.subtitle")}</DialogDescription>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(editingAppointment.id)} text-white`}>
                    {getInitials(editingAppointment.patientName || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{editingAppointment.patientName}</p>
                  <p className="text-xs text-muted-foreground">{editingAppointment.department || "General"}</p>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">{t("common.status")}</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t("appointments.scheduled")}</SelectItem>
                    <SelectItem value="confirmed">{t("appointments.confirmed")}</SelectItem>
                    <SelectItem value="completed">{t("appointments.completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("appointments.cancelled")}</SelectItem>
                    <SelectItem value="no-show">{t("appointments.noShow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} data-testid="button-cancel-edit">{t("common.cancel")}</Button>
            <Button
              onClick={() => {
                if (editingAppointment) {
                  updateMutation.mutate({ id: editingAppointment.id, data: { status: editStatus } });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAppointment} onOpenChange={(open) => { if (!open) setDeleteAppointment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the appointment for <span className="font-semibold">{deleteAppointment?.patientName}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAppointment && deleteMutation.mutate(deleteAppointment.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
