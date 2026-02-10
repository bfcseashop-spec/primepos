import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreVertical, Trash2, Edit, Phone, Mail, Clock, RefreshCw, LayoutGrid, List, Eye, Camera, X, UserCheck, UserX, Activity, BedDouble } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Doctor } from "@shared/schema";

const specializations = [
  "General Physician", "Cardiologist", "Orthopedic Surgeon", "Pediatrician", "Dermatologist",
  "ENT Specialist", "Ophthalmologist", "Neurologist", "Gynecologist", "Radiologist",
  "Dentist", "Psychiatrist", "Oncologist", "Urologist", "Gastroenterologist",
];

const departments = [
  "General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Dermatology",
  "ENT", "Ophthalmology", "Neurology", "Gynecology", "Radiology",
  "Dentistry", "Psychiatry", "Oncology", "Urology", "Gastroenterology", "Emergency",
];

const avatarColors = [
  "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300",
  "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300",
];

export default function DoctorManagementPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
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
  const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

  const getStatusBadge = (status: string) => {
    if (status === "active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (status === "busy") return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
    if (status === "in_surgery") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    if (status === "on_leave") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
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
    <div className="p-6 space-y-5 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Doctors</h1>
          <p className="text-sm text-muted-foreground">Home &gt; Doctors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="icon"
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            data-testid="button-grid-view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "outline"}
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
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="active">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="in_surgery">In Surgery</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="inactive">Unavailable</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-doctor">
            <Plus className="h-4 w-4 mr-2" /> Add New Doctor
          </Button>
        </div>
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
            <Card key={doc.id} className="relative" data-testid={`card-doctor-${doc.id}`}>
              <CardContent className="p-5">
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
                        <Eye className="h-4 w-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "active")} data-testid={`button-set-available-${doc.id}`}>
                        <UserCheck className="h-4 w-4 mr-2 text-emerald-600" /> Set Available
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "busy")} data-testid={`button-set-busy-${doc.id}`}>
                        <UserX className="h-4 w-4 mr-2 text-orange-600" /> Set Busy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "in_surgery")} data-testid={`button-set-surgery-${doc.id}`}>
                        <Activity className="h-4 w-4 mr-2 text-blue-600" /> Set In Surgery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "on_leave")} data-testid={`button-set-leave-${doc.id}`}>
                        <BedDouble className="h-4 w-4 mr-2 text-amber-600" /> Set On Leave
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)} data-testid={`button-delete-${doc.id}`}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Doctor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col items-center mt-2 mb-3">
                  <Avatar className={`h-16 w-16 ${getAvatarColor(doc.id)}`}>
                    {doc.photoUrl && <AvatarImage src={doc.photoUrl} alt={doc.name} />}
                    <AvatarFallback className="text-lg font-bold bg-transparent">{getInitials(doc.name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground mt-2">{doc.doctorId}</p>
                  <p className="font-semibold text-sm mt-0.5" data-testid={`text-doctor-name-${doc.id}`}>{doc.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
                    {specList(doc.specialization).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] font-normal no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-b py-2.5 mb-3 text-center text-xs">
                  <div className="border-r">
                    <p className="text-muted-foreground">Department</p>
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
                      <Phone className="h-3 w-3" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span>{doc.email}</span>
                    </div>
                  )}
                  {doc.schedule && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
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
                    View Profile
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id} data-testid={`card-doctor-${doc.id}`}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <Avatar className={`h-12 w-12 ${getAvatarColor(doc.id)}`}>
                  {doc.photoUrl && <AvatarImage src={doc.photoUrl} alt={doc.name} />}
                  <AvatarFallback className="font-bold bg-transparent">{getInitials(doc.name)}</AvatarFallback>
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
                      <Badge key={s} variant="secondary" className="text-[10px] font-normal no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center min-w-[80px]">
                  <p className="text-[10px]">Department</p>
                  <p className="font-medium text-foreground">{doc.department || "-"}</p>
                </div>
                <div className="text-xs text-muted-foreground text-center min-w-[80px]">
                  <p className="text-[10px]">Experience</p>
                  <p className="font-medium text-foreground">{doc.experience || "-"}</p>
                </div>
                {doc.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{doc.phone}</div>}
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${doc.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setViewingDoctor(doc); setViewDialog(true); }} data-testid={`button-view-${doc.id}`}>
                        <Eye className="h-4 w-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "active")}>
                        <UserCheck className="h-4 w-4 mr-2 text-emerald-600" /> Set Available
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "busy")}>
                        <UserX className="h-4 w-4 mr-2 text-orange-600" /> Set Busy
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "in_surgery")}>
                        <Activity className="h-4 w-4 mr-2 text-blue-600" /> Set In Surgery
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDoctorStatus(doc.id, "on_leave")}>
                        <BedDouble className="h-4 w-4 mr-2 text-amber-600" /> Set On Leave
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)} data-testid={`button-delete-${doc.id}`}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Doctor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              <DialogTitle>Doctor Profile</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-4">
              <Avatar className={`h-20 w-20 ${getAvatarColor(viewingDoctor.id)}`}>
                {viewingDoctor.photoUrl && <AvatarImage src={viewingDoctor.photoUrl} alt={viewingDoctor.name} />}
                <AvatarFallback className="text-2xl font-bold bg-transparent">{getInitials(viewingDoctor.name)}</AvatarFallback>
              </Avatar>
              <p className="text-xs text-muted-foreground mt-2">{viewingDoctor.doctorId}</p>
              <p className="text-lg font-bold mt-0.5">{viewingDoctor.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
                {specList(viewingDoctor.specialization).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate">{s}</Badge>
                ))}
              </div>
              <Badge className={`no-default-hover-elevate no-default-active-elevate mt-2 ${getStatusBadge(viewingDoctor.status)}`}>
                {getStatusLabel(viewingDoctor.status)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{viewingDoctor.department || "-"}</span></div>
              <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{viewingDoctor.experience || "-"}</span></div>
              <div><span className="text-muted-foreground">Qualification:</span> <span className="font-medium">{viewingDoctor.qualification || "-"}</span></div>
              <div><span className="text-muted-foreground">Fee:</span> <span className="font-medium">${viewingDoctor.consultationFee || "0"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewingDoctor.phone || "-"}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewingDoctor.email || "-"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Schedule:</span> <span className="font-medium">{viewingDoctor.schedule || "-"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{viewingDoctor.address || "-"}</span></div>
              {viewingDoctor.joiningDate && <div className="col-span-2"><span className="text-muted-foreground">Joining Date:</span> <span className="font-medium">{viewingDoctor.joiningDate}</span></div>}
              {viewingDoctor.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span className="font-medium">{viewingDoctor.notes}</span></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialog(false)}>Close</Button>
              <Button onClick={() => { setViewDialog(false); openEdit(viewingDoctor); }}>Edit Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {(addDialog || editDialog) && (
        <Dialog open={addDialog || editDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); setEditDialog(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editDialog ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
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
                  <label className="text-sm font-medium mb-1 block">Full Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-doctor-name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Specialization *</label>
                  <Select value={form.specialization} onValueChange={(v) => setForm({ ...form, specialization: v })}>
                    <SelectTrigger data-testid="select-specialization">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Department</label>
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
                  <label className="text-sm font-medium mb-1 block">Qualification</label>
                  <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="MBBS, MD, etc." data-testid="input-qualification" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Consultation Fee</label>
                  <Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} data-testid="input-consultation-fee" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Address</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Schedule</label>
                  <Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon-Fri, 9AM-5PM" data-testid="input-schedule" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Joining Date</label>
                  <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} data-testid="input-joining-date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-doctor-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="in_surgery">In Surgery</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddDialog(false); setEditDialog(false); }} data-testid="button-cancel-doctor">Cancel</Button>
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
                {editDialog ? "Save Changes" : "Add Doctor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
