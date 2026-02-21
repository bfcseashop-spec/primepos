import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, UserPlus, LayoutGrid, List, RefreshCw, MoreVertical, CalendarPlus, Eye, Pencil, Trash2, User as UserIcon, Phone, Mail, MapPin, Droplets, Calendar, AlertTriangle, FileText, Heart, Users, UserCheck, Activity, Clock, Stethoscope, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { Patient } from "@shared/schema";

function dateToYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return value;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || dob.length < 10) return null;
  const birth = new Date(dob + "T12:00:00");
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  if (birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function OpdPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const { data: patients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: visits = [] } = useQuery<any[]>({
    queryKey: ["/api/opd-visits"],
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setDeletePatient(null);
      toast({ title: "Patient deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/patients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditPatient(null);
      toast({ title: "Patient updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEditPatient = (patient: Patient) => {
    setEditForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      email: patient.email || "",
      phone: patient.phone || "",
      dateOfBirth: patient.dateOfBirth || "",
      gender: patient.gender || "",
      bloodGroup: patient.bloodGroup || "",
      address: patient.address || "",
      city: patient.city || "",
      patientType: patient.patientType || "Out Patient",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      medicalHistory: patient.medicalHistory || "",
      allergies: patient.allergies || "",
    });
    setEditPatient(patient);
  };

  const handleSaveEdit = () => {
    if (!editPatient) return;
    const name = [editForm.firstName, editForm.lastName].filter(Boolean).join(" ") || editPatient.name;
    const age = editForm.dateOfBirth ? ageFromDob(editForm.dateOfBirth) : null;
    updatePatientMutation.mutate({
      id: editPatient.id,
      data: { ...editForm, name, age: age != null ? age : undefined },
    });
  };

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setAppointmentDialogOpen(false);
      setSelectedPatient(null);
      toast({ title: "Appointment created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
    toast({ title: "Data refreshed" });
  };

  const openAppointmentDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setAppointmentDialogOpen(true);
  };

  const handleCreateAppointment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createAppointmentMutation.mutate({
      patientId: selectedPatient?.id,
      patientType: form.get("patientType") || selectedPatient?.patientType || "Out Patient",
      department: form.get("department") || null,
      doctorName: form.get("doctorName") || null,
      consultationMode: form.get("consultationMode") || null,
      appointmentDate: form.get("appointmentDate") || null,
      startTime: form.get("startTime") || null,
      endTime: form.get("endTime") || null,
      reason: form.get("reason") || null,
      notes: form.get("notes") || null,
      paymentMode: form.get("paymentMode") || null,
      status: "scheduled",
    });
  };

  const getLastVisit = (patientId: number) => {
    const patientVisits = visits.filter((v: any) => v.patientId === patientId);
    if (patientVisits.length === 0) return null;
    return patientVisits.sort((a: any, b: any) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0];
  };

  const getInitials = (patient: Patient) => {
    if (patient.firstName && patient.lastName) {
      return `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
    }
    return patient.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "P";
  };

  const getDisplayName = (patient: Patient) => {
    if (patient.firstName && patient.lastName) return `${patient.firstName} ${patient.lastName}`;
    return patient.name;
  };

  const outPatients = patients.filter(p => !p.patientType || p.patientType === "Out Patient");
  const inPatients = patients.filter(p => p.patientType === "In Patient");
  const emergencyPatients = patients.filter(p => p.patientType === "Emergency");
  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      p.name?.toLowerCase().includes(term) ||
      p.firstName?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.patientId?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term)
    );
    const matchesType = typeFilter === "all" ||
      (typeFilter === "Out Patient" && (!p.patientType || p.patientType === "Out Patient")) ||
      p.patientType === typeFilter;
    return matchesSearch && matchesType;
  });

  const avatarGradients = [
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-emerald-500 to-teal-400",
    "from-pink-500 to-rose-400",
    "from-amber-500 to-orange-400",
    "from-indigo-500 to-blue-400",
  ];

  const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];

  const patientTypeBadge = (type: string | null) => {
    switch (type) {
      case "In Patient": return { bg: "bg-blue-500/10 dark:bg-blue-400/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", dot: "bg-blue-500" };
      case "Emergency": return { bg: "bg-red-500/10 dark:bg-red-400/10", text: "text-red-700 dark:text-red-300", border: "border-red-500/20", dot: "bg-red-500" };
      default: return { bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", dot: "bg-emerald-500" };
    }
  };

  const listColumns = [
    { header: t("opd.patientType"), accessor: (row: any) => (
      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">#{row.patientId}</span>
    )},
    { header: t("common.name"), accessor: (row: any) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.photoUrl || undefined} />
          <AvatarFallback className={`text-[10px] font-bold bg-gradient-to-br ${getAvatarGradient(row.id)} text-white`}>
            {getInitials(row)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{getDisplayName(row)}</p>
          <p className="text-[10px] text-muted-foreground">{row.gender || "N/A"}</p>
        </div>
      </div>
    )},
    { header: t("common.phone"), accessor: (row: any) => (
      <span className="text-sm">{row.phone || "-"}</span>
    )},
    { header: t("common.type"), accessor: (row: any) => {
      const style = patientTypeBadge(row.patientType);
      return (
        <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${style.bg} ${style.text} ${style.border}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${style.dot}`} />
          {row.patientType || "Out Patient"}
        </Badge>
      );
    }},
    { header: t("common.address"), accessor: (row: any) => (
      <span className="text-sm">{row.city || "-"}</span>
    )},
    { header: t("opd.lastVisit"), accessor: (row: any) => {
      const lv = getLastVisit(row.id);
      return lv ? (
        <span className="text-xs text-muted-foreground">{new Date(lv.visitDate).toLocaleDateString()}</span>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      );
    }},
    { header: t("common.actions"), accessor: (row: any) => (
      <div className="flex gap-1.5">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewPatient(row); }} data-testid={`button-view-list-${row.id}`}>
          <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditPatient(row); }} data-testid={`button-edit-list-${row.id}`}>
          <Pencil className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openAppointmentDialog(row); }} data-testid={`button-add-appointment-list-${row.id}`}>
          <CalendarPlus className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("opd.title")}
        description={t("opd.subtitle")}
        actions={
          <Button variant="default" onClick={() => navigate("/register-patient")} className="bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-700 text-white" data-testid="button-register-patient">
            <UserPlus className="h-4 w-4 mr-1.5" /> {t("opd.addPatient")}
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card data-testid="stat-total-patients">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("opd.totalPatients")}</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{patients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-out-patients">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shrink-0">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("opd.activeVisits")}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{outPatients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-in-patients">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600 shrink-0">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("opd.completedToday")}</p>
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{inPatients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-emergency">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-red-500 to-red-600 shrink-0">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("opd.pendingFollow")}</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{emergencyPatients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-64">
                  <SearchInputWithBarcode
                    placeholder={t("opd.searchPatients")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={(v) => setSearchTerm(v)}
                    data-testid="input-search-patients"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40" data-testid="select-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="Out Patient">Out Patient</SelectItem>
                    <SelectItem value="In Patient">In Patient</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  className={`toggle-elevate ${viewMode === "grid" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("grid")}
                  data-testid="button-grid-view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  className={`toggle-elevate ${viewMode === "list" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("list")}
                  data-testid="button-list-view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "grid" ? (
          patientsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5 flex flex-col items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <UserIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t("common.noData")}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{t("opd.searchPatients")}</p>
                <Button variant="outline" onClick={() => navigate("/register-patient")} className="mt-4" data-testid="button-register-empty">
                  <UserPlus className="h-4 w-4 mr-1.5" /> {t("opd.addPatient")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPatients.map((patient) => {
                const lastVisit = getLastVisit(patient.id);
                const typeBadge = patientTypeBadge(patient.patientType);
                return (
                  <Card key={patient.id} className="overflow-visible hover-elevate" data-testid={`card-patient-${patient.id}`}>
                    <CardContent className="p-0">
                      <div className={`h-1.5 rounded-t-md bg-gradient-to-r ${
                        patient.patientType === "Emergency" ? "from-red-500 to-orange-400" :
                        patient.patientType === "In Patient" ? "from-blue-500 to-cyan-400" :
                        "from-emerald-500 to-teal-400"
                      }`} />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium no-default-hover-elevate no-default-active-elevate ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}
                            data-testid={`badge-patient-type-${patient.id}`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${typeBadge.dot}`} />
                            {patient.patientType || "Out Patient"}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-patient-menu-${patient.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewPatient(patient)} data-testid={`menu-view-${patient.id}`}>
                                <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" /> {t("common.view")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditPatient(patient)} data-testid={`menu-edit-${patient.id}`}>
                                <Pencil className="h-3.5 w-3.5 mr-2 text-amber-500" /> {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletePatient(patient)}
                                data-testid={`menu-delete-${patient.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-col items-center mb-3">
                          <Avatar className="h-14 w-14 mb-2">
                            <AvatarImage src={patient.photoUrl || undefined} alt={getDisplayName(patient)} />
                            <AvatarFallback className={`text-base font-bold bg-gradient-to-br ${getAvatarGradient(patient.id)} text-white`}>
                              {getInitials(patient)}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-sm text-center" data-testid={`text-patient-name-${patient.id}`}>
                            {getDisplayName(patient)}
                          </h3>
                          <span className="text-[11px] text-muted-foreground font-mono" data-testid={`text-patient-id-${patient.id}`}>
                            #{patient.patientId}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-1.5 rounded-md bg-muted/40">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Gender</p>
                            <p className="text-xs font-medium" data-testid={`text-gender-${patient.id}`}>
                              {patient.gender || "N/A"}
                            </p>
                          </div>
                          <div className="text-center p-1.5 rounded-md bg-muted/40">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Blood</p>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400" data-testid={`text-blood-${patient.id}`}>
                              {patient.bloodGroup || "N/A"}
                            </p>
                          </div>
                          <div className="text-center p-1.5 rounded-md bg-muted/40">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Location</p>
                            <p className="text-xs font-medium truncate" data-testid={`text-location-${patient.id}`}>
                              {patient.city || "N/A"}
                            </p>
                          </div>
                        </div>

                        {lastVisit && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                            <Clock className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                            <span>{t("opd.lastVisit")}: {new Date(lastVisit.visitDate).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" })}</span>
                          </div>
                        )}

                        {patient.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
                            <Phone className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t p-2.5 flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => setViewPatient(patient)}
                          data-testid={`button-view-patient-${patient.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-blue-500 dark:text-blue-400" /> {t("common.view")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => openAppointmentDialog(patient)}
                          data-testid={`button-add-appointment-${patient.id}`}
                        >
                          <CalendarPlus className="h-3.5 w-3.5 mr-1 text-emerald-500 dark:text-emerald-400" /> {t("opd.addAppointment")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="p-0">
              <DataTable columns={listColumns} data={filteredPatients} isLoading={patientsLoading} emptyMessage="No patients found" />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!viewPatient} onOpenChange={(open) => { if (!open) setViewPatient(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-patient-title">{t("opd.totalPatients")}</DialogTitle>
            <DialogDescription>{t("opd.subtitle")}</DialogDescription>
          </DialogHeader>
          {viewPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={viewPatient.photoUrl || undefined} />
                  <AvatarFallback className={`text-lg font-bold bg-gradient-to-br ${getAvatarGradient(viewPatient.id)} text-white`}>{getInitials(viewPatient)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-view-patient-name">{getDisplayName(viewPatient)}</h3>
                  <p className="text-sm text-muted-foreground font-mono">#{viewPatient.patientId}</p>
                  {(() => {
                    const style = patientTypeBadge(viewPatient.patientType);
                    return (
                      <Badge variant="outline" className={`text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate ${style.bg} ${style.text} ${style.border}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${style.dot}`} />
                        {viewPatient.patientType || "Out Patient"}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {viewPatient.phone && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 dark:bg-blue-400/10 shrink-0">
                      <Phone className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.phone")}</p>
                      <p className="text-sm" data-testid="text-view-phone">{viewPatient.phone}</p>
                    </div>
                  </div>
                )}
                {viewPatient.email && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 dark:bg-cyan-400/10 shrink-0">
                      <Mail className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.email")}</p>
                      <p className="text-sm" data-testid="text-view-email">{viewPatient.email}</p>
                    </div>
                  </div>
                )}
                {viewPatient.gender && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 dark:bg-violet-400/10 shrink-0">
                      <UserIcon className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("registerPatient.gender")}</p>
                      <p className="text-sm" data-testid="text-view-gender">{viewPatient.gender}</p>
                    </div>
                  </div>
                )}
                {viewPatient.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 dark:bg-amber-400/10 shrink-0">
                      <Calendar className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("registerPatient.dateOfBirth")}</p>
                      <p className="text-sm" data-testid="text-view-dob">{viewPatient.dateOfBirth}</p>
                    </div>
                  </div>
                )}
                {viewPatient.bloodGroup && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 dark:bg-red-400/10 shrink-0">
                      <Droplets className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("registerPatient.bloodType")}</p>
                      <p className="text-sm" data-testid="text-view-blood">{viewPatient.bloodGroup}</p>
                    </div>
                  </div>
                )}
                {(viewPatient.address || viewPatient.city) && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 shrink-0">
                      <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.address")}</p>
                      <p className="text-sm" data-testid="text-view-address">{[viewPatient.address, viewPatient.city].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
              {(viewPatient.emergencyContactName || viewPatient.emergencyContactPhone) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> {t("registerPatient.emergencyContact")}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {viewPatient.emergencyContactName && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">{t("common.name")}</p>
                          <p className="text-sm">{viewPatient.emergencyContactName}</p>
                        </div>
                      )}
                      {viewPatient.emergencyContactPhone && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">{t("common.phone")}</p>
                          <p className="text-sm">{viewPatient.emergencyContactPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {viewPatient.medicalHistory && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> {t("registerPatient.medicalHistory")}
                    </h4>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{viewPatient.medicalHistory}</p>
                  </div>
                </>
              )}
              {viewPatient.allergies && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" /> {t("registerPatient.allergies")}
                    </h4>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{viewPatient.allergies}</p>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setViewPatient(null); openEditPatient(viewPatient); }} data-testid="button-view-to-edit">
                  <Pencil className="h-4 w-4 mr-1 text-amber-500" /> {t("common.edit")}
                </Button>
                <Button variant="outline" onClick={() => setViewPatient(null)} data-testid="button-close-view">
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPatient} onOpenChange={(open) => { if (!open) setEditPatient(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-patient-title">{t("common.edit")}</DialogTitle>
            <DialogDescription>{t("opd.subtitle")}</DialogDescription>
          </DialogHeader>
          {editPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("registerPatient.firstName")}</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} data-testid="input-edit-first-name" />
                </div>
                <div>
                  <Label>{t("registerPatient.lastName")}</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} data-testid="input-edit-last-name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("common.phone")}</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-edit-phone" />
                </div>
                <div>
                  <Label>{t("common.email")}</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} data-testid="input-edit-email" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t("registerPatient.gender")}</Label>
                  <Select value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger data-testid="select-edit-gender"><SelectValue placeholder={t("common.filter")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("registerPatient.male")}</SelectItem>
                      <SelectItem value="female">{t("registerPatient.female")}</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("registerPatient.dateOfBirth")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-10"
                        data-testid="input-edit-dob"
                      >
                        <CalendarIcon className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                        {editForm.dateOfBirth ? formatDateDisplay(editForm.dateOfBirth) : "mm/dd/yyyy"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarUI
                        mode="single"
                        selected={editForm.dateOfBirth ? new Date(editForm.dateOfBirth + "T12:00:00") : undefined}
                        onSelect={(d) => d && setEditForm(f => ({ ...f, dateOfBirth: dateToYMD(d) }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {editForm.dateOfBirth && ageFromDob(editForm.dateOfBirth) != null && (
                    <p className="text-sm text-muted-foreground mt-1.5" data-testid="text-edit-age">
                      {t("registerPatient.age")}: {t("registerPatient.ageYears", { count: ageFromDob(editForm.dateOfBirth)! })}
                    </p>
                  )}
                </div>
                <div>
                  <Label>{t("registerPatient.bloodType")}</Label>
                  <Select value={editForm.bloodGroup} onValueChange={(v) => setEditForm(f => ({ ...f, bloodGroup: v }))}>
                    <SelectTrigger data-testid="select-edit-blood"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("common.address")}</Label>
                  <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} data-testid="input-edit-address" />
                </div>
                <div>
                  <Label>{t("registerPatient.city")}</Label>
                  <Input value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
                </div>
              </div>
              <div>
                <Label>{t("opd.patientType")}</Label>
                <Select value={editForm.patientType} onValueChange={(v) => setEditForm(f => ({ ...f, patientType: v }))}>
                  <SelectTrigger data-testid="select-edit-patient-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Out Patient">Out Patient</SelectItem>
                    <SelectItem value="In Patient">In Patient</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("registerPatient.contactName")}</Label>
                  <Input value={editForm.emergencyContactName} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} data-testid="input-edit-emergency-name" />
                </div>
                <div>
                  <Label>{t("registerPatient.contactPhone")}</Label>
                  <Input value={editForm.emergencyContactPhone} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} data-testid="input-edit-emergency-phone" />
                </div>
              </div>
              <div>
                <Label>{t("registerPatient.medicalHistory")}</Label>
                <Textarea value={editForm.medicalHistory} onChange={(e) => setEditForm(f => ({ ...f, medicalHistory: e.target.value }))} rows={3} data-testid="input-edit-medical-history" />
              </div>
              <div>
                <Label>{t("registerPatient.allergies")}</Label>
                <Textarea value={editForm.allergies} onChange={(e) => setEditForm(f => ({ ...f, allergies: e.target.value }))} rows={2} data-testid="input-edit-allergies" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditPatient(null)} data-testid="button-cancel-edit">{t("common.cancel")}</Button>
                <Button onClick={handleSaveEdit} disabled={updatePatientMutation.isPending} data-testid="button-save-edit">
                  {updatePatientMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePatient} onOpenChange={(open) => { if (!open) setDeletePatient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deletePatient ? getDisplayName(deletePatient) : ""}</span>? This action cannot be undone and will permanently remove all patient data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatient && deletePatientMutation.mutate(deletePatient.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deletePatientMutation.isPending ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={appointmentDialogOpen} onOpenChange={(open) => { setAppointmentDialogOpen(open); if (!open) setSelectedPatient(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-appointment-dialog-title">{t("appointments.newAppointment")}</DialogTitle>
            <DialogDescription className="sr-only">Schedule a new appointment for this patient</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("billing.selectPatient")}</Label>
                <Select
                  name="patientId"
                  value={selectedPatient ? String(selectedPatient.id) : ""}
                  onValueChange={(val) => {
                    const p = patients.find(pt => pt.id === Number(val));
                    if (p) setSelectedPatient(p);
                  }}
                >
                  <SelectTrigger data-testid="select-appointment-patient">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{getDisplayName(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("opd.patientType")}</Label>
                <Select name="patientType" defaultValue={selectedPatient?.patientType || "Out Patient"}>
                  <SelectTrigger data-testid="select-appointment-patient-type">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Out Patient">Out Patient</SelectItem>
                    <SelectItem value="In Patient">In Patient</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("appointments.department")} <span className="text-destructive">*</span></Label>
                <Select name="department" required>
                  <SelectTrigger data-testid="select-appointment-department">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Medicine">General Medicine</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Gynecology">Gynecology</SelectItem>
                    <SelectItem value="Dermatology">Dermatology</SelectItem>
                    <SelectItem value="ENT">ENT</SelectItem>
                    <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                    <SelectItem value="Dentistry">Dentistry</SelectItem>
                    <SelectItem value="Radiology">Radiology</SelectItem>
                    <SelectItem value="Pathology">Pathology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("dashboard.doctor")} <span className="text-destructive">*</span></Label>
                <Select name="doctorName" required>
                  <SelectTrigger data-testid="select-appointment-doctor">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Sarah Mitchell">Dr. Sarah Mitchell</SelectItem>
                    <SelectItem value="Dr. Michael Jones">Dr. Michael Jones</SelectItem>
                    <SelectItem value="Dr. Emily Chen">Dr. Emily Chen</SelectItem>
                    <SelectItem value="Dr. James Wilson">Dr. James Wilson</SelectItem>
                    <SelectItem value="Dr. Lisa Park">Dr. Lisa Park</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t("appointments.consultationMode")} <span className="text-destructive">*</span></Label>
              <Select name="consultationMode" required>
                <SelectTrigger data-testid="select-appointment-consultation-mode">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                  <SelectItem value="Video Call">Video Call</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t("appointments.date")}</Label>
                <Input type="date" name="appointmentDate" data-testid="input-appointment-date" />
              </div>
              <div>
                <Label>{t("appointments.startTime")}</Label>
                <Input type="time" name="startTime" data-testid="input-appointment-start-time" />
              </div>
              <div>
                <Label>{t("appointments.endTime")}</Label>
                <Input type="time" name="endTime" data-testid="input-appointment-end-time" />
              </div>
            </div>

            <div>
              <Label>{t("appointments.reason")}</Label>
              <Input name="reason" placeholder={t("appointments.reason")} data-testid="input-appointment-reason" />
            </div>

            <div>
              <Label>{t("appointments.notes")}</Label>
              <Textarea name="notes" placeholder={t("appointments.notes")} rows={3} data-testid="input-appointment-notes" />
            </div>

            <div>
              <Label>{t("billing.paymentMethod")}</Label>
              <Select name="paymentMode">
                <SelectTrigger data-testid="select-appointment-payment">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash Pay">Cash Pay</SelectItem>
                  <SelectItem value="ABA">ABA</SelectItem>
                  <SelectItem value="Acleda">Acleda</SelectItem>
                  <SelectItem value="Other Bank">Other Bank</SelectItem>
                  <SelectItem value="Card Pay">Card Pay</SelectItem>
                  <SelectItem value="WeChat Pay">WeChat Pay</SelectItem>
                  <SelectItem value="GPay">GPay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setAppointmentDialogOpen(false); setSelectedPatient(null); }} data-testid="button-cancel-appointment">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createAppointmentMutation.isPending} data-testid="button-submit-appointment">
                {createAppointmentMutation.isPending ? t("common.loading") : t("opd.addAppointment")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
