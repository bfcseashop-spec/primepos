import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreVertical, Trash2, Edit, Phone, Mail, Clock, RefreshCw, LayoutGrid, List, Eye, Camera, X, UserCheck, UserX, Activity, BedDouble, Building2, Briefcase, Users, CircleCheck, CircleOff, CalendarOff, Stethoscope, DollarSign, GraduationCap, MapPin, CalendarDays, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Doctor } from "@shared/schema";

const defaultPositions = [
  "General Physician", "Cardiologist", "Orthopedic Surgeon", "Pediatrician", "Dermatologist",
  "ENT Specialist", "Ophthalmologist", "Neurologist", "Gynecologist", "Radiologist",
  "Dentist", "Psychiatrist", "Oncologist", "Urologist", "Gastroenterologist",
];

const defaultDepartments = [
  "General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Dermatology",
  "ENT", "Ophthalmology", "Neurology", "Gynecology", "Radiology",
  "Dentistry", "Psychiatry", "Oncology", "Urology", "Gastroenterology", "Emergency",
];

function loadList(key: string, defaults: string[]): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const merged = Array.from(new Set([...defaults, ...parsed]));
      return merged.sort();
    }
  } catch {}
  return [...defaults].sort();
}

function saveList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

const avatarGradients = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

export default function DoctorManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  const [deptDialog, setDeptDialog] = useState(false);
  const [posDialog, setPosDialog] = useState(false);
  const [departments, setDepartments] = useState<string[]>(() => loadList("doctor_departments", defaultDepartments));
  const [positions, setPositions] = useState<string[]>(() => loadList("doctor_positions", defaultPositions));
  const [newDeptName, setNewDeptName] = useState("");
  const [newPosName, setNewPosName] = useState("");
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState({
    name: "", specialization: "", department: "", experience: "",
    qualification: "", phone: "", email: "", address: "",
    consultationFee: "0", schedule: "", status: "active",
    joiningDate: "", notes: "", photoUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({ queryKey: ["/api/doctors"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const nextId = await fetch("/api/doctors/next-id").then(r => r.json());
      return apiRequest("POST", "/api/doctors", { ...data, doctorId: nextId.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: "Doctor added successfully" });
      setAddDialog(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/doctors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: "Doctor updated" });
      setEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/doctors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });
      toast({ title: "Doctor deleted" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", specialization: "", department: "", experience: "", qualification: "", phone: "", email: "", address: "", consultationFee: "0", schedule: "", status: "active", joiningDate: "", notes: "", photoUrl: "" });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/doctors/upload-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setForm(f => ({ ...f, photoUrl: data.photoUrl }));
      } else {
        toast({ title: "Upload failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = doctors.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase()) ||
      (d.department && d.department.toLowerCase().includes(search.toLowerCase())) ||
      d.doctorId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchDept = departmentFilter === "all" || d.department === departmentFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];

  const getStatusBadge = (status: string) => {
    if (status === "active") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (status === "busy") return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    if (status === "in_surgery") return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20";
    if (status === "on_leave") return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
    return "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20";
  };
  const getStatusLabel = (status: string) => {
    if (status === "active") return "Available";
    if (status === "busy") return "Busy";
    if (status === "in_surgery") return "In Surgery";
    if (status === "on_leave") return "On Leave";
    return "Unavailable";
  };

  const setDoctorStatus = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const openEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setForm({
      name: doc.name, specialization: doc.specialization,
      department: doc.department || "", experience: doc.experience || "",
      qualification: doc.qualification || "", phone: doc.phone || "",
      email: doc.email || "", address: doc.address || "",
      consultationFee: doc.consultationFee || "0", schedule: doc.schedule || "",
      status: doc.status, joiningDate: doc.joiningDate || "", notes: doc.notes || "",
      photoUrl: doc.photoUrl || "",
    });
    setEditDialog(true);
  };

  const specList = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("doctors.title")}
        description={t("doctors.subtitle")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="icon"
              variant="ghost"
              className={`toggle-elevate ${viewMode === "grid" ? "toggle-elevated" : ""}`}
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={`toggle-elevate ${viewMode === "list" ? "toggle-elevated" : ""}`}
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/doctors"] })} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.status")}: {t("common.all")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="in_surgery">In Surgery</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setDeptDialog(true)} data-testid="button-add-department">
              <Building2 className="h-4 w-4 mr-1" /> + Department
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPosDialog(true)} data-testid="button-add-position">
              <Briefcase className="h-4 w-4 mr-1" /> + Position
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-doctor">
              <Plus className="h-4 w-4 mr-1" /> {t("doctors.addDoctor")}
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-4 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "total", label: t("doctors.totalDoctors"), gradient: "from-blue-500 to-blue-600", value: doctors.length, icon: Users },
          { key: "active", label: t("doctors.activeDoctors"), gradient: "from-emerald-500 to-emerald-600", value: doctors.filter(d => d.status === "active").length, icon: CircleCheck },
          { key: "onleave", label: "On Leave", gradient: "from-amber-500 to-amber-600", value: doctors.filter(d => d.status === "on_leave").length, icon: CalendarOff },
          { key: "inactive", label: t("common.inactive"), gradient: "from-red-500 to-red-600", value: doctors.filter(d => d.status === "inactive").length, icon: CircleOff },
        ].map((s) => (
          <Card key={s.key} data-testid={`stat-${s.key}-doctors`}>
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

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search doctors by name, specialty, or department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-doctors" />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-department-filter">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading doctors...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No doctors found. Click "Add New Doctor" to get started.</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="overflow-visible hover-elevate" data-testid={`card-doctor-${doc.id}`}>
              <CardContent className="p-0">
                <div className="h-1 rounded-t-md bg-gradient-to-r from-blue-500 to-violet-500" />
                <div className="p-5">
                <div className="flex items-start justify-between">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate text-xs ${getStatusBadge(doc.status)}`}>
                    {getStatusLabel(doc.status)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${doc.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setViewingDoctor(doc); setViewDialog(true); }} data-testid={`button-view-${doc.id}`}>
                        <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" /> {t("common.view")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(doc)} data-testid={`button-edit-${doc.id}`}>
                        <Edit className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" /> {t("common.edit")}
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "active")} data-testid={`button-set-available-${doc.id}`}>
                        <UserCheck className="h-4 w-4 mr-2 text-emerald-600" /> {t("common.active")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "busy")} data-testid={`button-set-busy-${doc.id}`}>
                        <UserX className="h-4 w-4 mr-2 text-orange-600" /> Busy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "in_surgery")} data-testid={`button-set-surgery-${doc.id}`}>
                        <Activity className="h-4 w-4 mr-2 text-blue-600" /> In Surgery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "on_leave")} data-testid={`button-set-leave-${doc.id}`}>
                        <BedDouble className="h-4 w-4 mr-2 text-amber-600" /> On Leave
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)} data-testid={`button-delete-${doc.id}`}>
                        <Trash2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col items-center mt-2 mb-3">
                  <Avatar className="h-16 w-16">
                    {doc.photoUrl && <AvatarImage src={doc.photoUrl} alt={doc.name} />}
                    <AvatarFallback className={`text-lg font-bold bg-gradient-to-br ${getAvatarGradient(doc.id)} text-white`}>{getInitials(doc.name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground mt-2">{doc.doctorId}</p>
                  <p className="font-semibold text-sm mt-0.5" data-testid={`text-doctor-name-${doc.id}`}>{doc.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
                    {specList(doc.specialization).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] font-normal text-violet-600 dark:text-violet-400 border-violet-500/20 no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                    ))}
                  </div>
                  {doc.consultationFee && doc.consultationFee !== "0" && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5">
                      <DollarSign className="h-3 w-3 inline-block" />{doc.consultationFee} consultation
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 border-t border-b py-2.5 mb-3 text-center text-xs">
                  <div className="border-r">
                    <p className="text-muted-foreground">{t("appointments.department")}</p>
                    <p className="font-medium mt-0.5">{doc.department || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p className="font-medium mt-0.5">{doc.experience || "-"}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {doc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                      <span>{doc.email}</span>
                    </div>
                  )}
                  {doc.schedule && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                      <span>{doc.schedule}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t text-center">
                  <button
                    className="text-xs font-medium text-primary"
                    onClick={() => { setViewingDoctor(doc); setViewDialog(true); }}
                    data-testid={`link-view-profile-${doc.id}`}
                  >
                    {t("common.view")}
                  </button>
                </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id} className="overflow-visible hover-elevate" data-testid={`card-doctor-${doc.id}`}>
              <CardContent className="p-0">
                <div className="h-1 rounded-t-md bg-gradient-to-r from-blue-500 to-violet-500" />
                <div className="p-4 flex items-center gap-4 flex-wrap">
                <Avatar className="h-12 w-12">
                  {doc.photoUrl && <AvatarImage src={doc.photoUrl} alt={doc.name} />}
                  <AvatarFallback className={`font-bold bg-gradient-to-br ${getAvatarGradient(doc.id)} text-white`}>{getInitials(doc.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-[150px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" data-testid={`text-doctor-name-${doc.id}`}>{doc.name}</p>
                    <Badge className={`no-default-hover-elevate no-default-active-elevate text-[10px] ${getStatusBadge(doc.status)}`}>
                      {getStatusLabel(doc.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {specList(doc.specialization).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] font-normal text-violet-600 dark:text-violet-400 border-violet-500/20 no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center min-w-[80px]">
                  <p className="text-[10px]">{t("appointments.department")}</p>
                  <p className="font-medium text-foreground">{doc.department || "-"}</p>
                </div>
                <div className="text-xs text-muted-foreground text-center min-w-[80px]">
                  <p className="text-[10px]">Experience</p>
                  <p className="font-medium text-foreground">{doc.experience || "-"}</p>
                </div>
                {doc.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3 text-blue-500 dark:text-blue-400" />{doc.phone}</div>}
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${doc.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setViewingDoctor(doc); setViewDialog(true); }} data-testid={`button-view-${doc.id}`}>
                        <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" /> {t("common.view")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(doc)} data-testid={`button-edit-${doc.id}`}>
                        <Edit className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" /> {t("common.edit")}
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "active")}>
                        <UserCheck className="h-4 w-4 mr-2 text-emerald-600" /> {t("common.active")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "busy")}>
                        <UserX className="h-4 w-4 mr-2 text-orange-600" /> Busy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "in_surgery")}>
                        <Activity className="h-4 w-4 mr-2 text-blue-600" /> In Surgery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "on_leave")}>
                        <BedDouble className="h-4 w-4 mr-2 text-amber-600" /> On Leave
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)} data-testid={`button-delete-${doc.id}`}>
                        <Trash2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewDialog && viewingDoctor && (
        <Dialog open={viewDialog} onOpenChange={setViewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                {t("doctors.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <Avatar className="h-20 w-20">
                {viewingDoctor.photoUrl && <AvatarImage src={viewingDoctor.photoUrl} alt={viewingDoctor.name} />}
                <AvatarFallback className={`text-2xl font-bold bg-gradient-to-br ${getAvatarGradient(viewingDoctor.id)} text-white`}>{getInitials(viewingDoctor.name)}</AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground mt-2">{viewingDoctor.doctorId}</p>
              <p className="text-lg font-bold mt-0.5">{viewingDoctor.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
                {specList(viewingDoctor.specialization).map((s) => (
                  <Badge key={s} variant="outline" className="text-xs text-violet-600 dark:text-violet-400 border-violet-500/20 no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                ))}
              </div>
              <Badge className={`no-default-hover-elevate no-default-active-elevate mt-2 ${getStatusBadge(viewingDoctor.status)}`}>
                {getStatusLabel(viewingDoctor.status)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /><span className="text-muted-foreground">{t("appointments.department")}:</span> <span className="font-medium">{viewingDoctor.department || "-"}</span></div>
              <div className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" /><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{viewingDoctor.experience || "-"}</span></div>
              <div className="flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" /><span className="text-muted-foreground">{t("doctors.qualification")}:</span> <span className="font-medium">{viewingDoctor.qualification || "-"}</span></div>
              <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /><span className="text-muted-foreground">{t("doctors.consultationFee")}:</span> <span className="font-medium text-emerald-600 dark:text-emerald-400">${viewingDoctor.consultationFee || "0"}</span></div>
              <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /><span className="text-muted-foreground">{t("common.phone")}:</span> <span className="font-medium">{viewingDoctor.phone || "-"}</span></div>
              <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" /><span className="text-muted-foreground">{t("common.email")}:</span> <span className="font-medium">{viewingDoctor.email || "-"}</span></div>
              <div className="col-span-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /><span className="text-muted-foreground">{t("doctors.schedule")}:</span> <span className="font-medium">{viewingDoctor.schedule || "-"}</span></div>
              <div className="col-span-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-red-500 dark:text-red-400" /><span className="text-muted-foreground">{t("common.address")}:</span> <span className="font-medium">{viewingDoctor.address || "-"}</span></div>
              {viewingDoctor.joiningDate && <div className="col-span-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" /><span className="text-muted-foreground">{t("common.date")}:</span> <span className="font-medium">{viewingDoctor.joiningDate}</span></div>}
              {viewingDoctor.notes && <div className="col-span-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" /><span className="text-muted-foreground">{t("common.notes")}:</span> <span className="font-medium">{viewingDoctor.notes}</span></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialog(false)}>{t("common.close")}</Button>
              <Button onClick={() => { setViewDialog(false); openEdit(viewingDoctor); }}>{t("common.edit")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {(addDialog || editDialog) && (
        <Dialog open={addDialog || editDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); setEditDialog(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editDialog ? <Edit className="h-5 w-5 text-amber-500 dark:text-amber-400" /> : <Plus className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
                {editDialog ? t("common.edit") : t("doctors.addDoctor")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium mb-1 block">Photo</label>
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/30">
                    {form.photoUrl && <AvatarImage src={form.photoUrl} alt="Doctor" />}
                    <AvatarFallback className="bg-muted">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  {form.photoUrl && (
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                      onClick={() => setForm(f => ({ ...f, photoUrl: "" }))}
                      data-testid="button-remove-photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="text-xs text-primary font-medium">{uploading ? "Uploading..." : "Upload Photo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} data-testid="input-doctor-photo" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("doctors.doctorName")} *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-doctor-name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("doctors.specialization")} *</label>
                  <Select value={form.specialization} onValueChange={(v) => setForm({ ...form, specialization: v })}>
                    <SelectTrigger data-testid="select-specialization">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("appointments.department")}</label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Experience</label>
                  <Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 7 years" data-testid="input-experience" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("doctors.qualification")}</label>
                  <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD, etc." data-testid="input-qualification" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("doctors.consultationFee")}</label>
                  <Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} data-testid="input-consultation-fee" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("common.phone")}</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("common.email")}</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("common.address")}</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("doctors.schedule")}</label>
                  <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon-Fri, 9AM-5PM" data-testid="input-schedule" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Joining Date</label>
                  <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} data-testid="input-joining-date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("common.status")}</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-doctor-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="in_surgery">In Surgery</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("common.notes")}</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddDialog(false); setEditDialog(false); }} data-testid="button-cancel-doctor">{t("common.cancel")}</Button>
              <Button
                disabled={!form.name || !form.specialization || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editDialog && editingDoctor) {
                    updateMutation.mutate({ id: editingDoctor.id, data: form });
                  } else {
                    createMutation.mutate(form);
                  }
                }}
                data-testid="button-save-doctor"
              >
                {editDialog ? t("common.save") : t("doctors.addDoctor")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deptDialog && (
        <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                Manage Departments
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New department name..."
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDeptName.trim()) {
                      const updated = Array.from(new Set([...departments, newDeptName.trim()])).sort();
                      setDepartments(updated);
                      saveList("doctor_departments", updated);
                      setNewDeptName("");
                      toast({ title: "Department added" });
                    }
                  }}
                  data-testid="input-new-department"
                />
                <Button
                  disabled={!newDeptName.trim()}
                  onClick={() => {
                    const updated = Array.from(new Set([...departments, newDeptName.trim()])).sort();
                    setDepartments(updated);
                    saveList("doctor_departments", updated);
                    setNewDeptName("");
                    toast({ title: "Department added" });
                  }}
                  data-testid="button-save-department"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {departments.map((d) => (
                  <div key={d} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                    <span className="text-sm">{d}</span>
                    {!defaultDepartments.includes(d) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = departments.filter(x => x !== d);
                          setDepartments(updated);
                          saveList("doctor_departments", updated);
                          toast({ title: "Department removed" });
                        }}
                        data-testid={`button-remove-dept-${d}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeptDialog(false)}>{t("common.close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {posDialog && (
        <Dialog open={posDialog} onOpenChange={setPosDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                Manage Positions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New position name..."
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPosName.trim()) {
                      const updated = Array.from(new Set([...positions, newPosName.trim()])).sort();
                      setPositions(updated);
                      saveList("doctor_positions", updated);
                      setNewPosName("");
                      toast({ title: "Position added" });
                    }
                  }}
                  data-testid="input-new-position"
                />
                <Button
                  disabled={!newPosName.trim()}
                  onClick={() => {
                    const updated = Array.from(new Set([...positions, newPosName.trim()])).sort();
                    setPositions(updated);
                    saveList("doctor_positions", updated);
                    setNewPosName("");
                    toast({ title: "Position added" });
                  }}
                  data-testid="button-save-position"
                >
                  Add
                </Button>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {positions.map((p) => (
                  <div key={p} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                    <span className="text-sm">{p}</span>
                    {!defaultPositions.includes(p) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const updated = positions.filter(x => x !== p);
                          setPositions(updated);
                          saveList("doctor_positions", updated);
                          toast({ title: "Position removed" });
                        }}
                        data-testid={`button-remove-pos-${p}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPosDialog(false)}>{t("common.close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  );
}
