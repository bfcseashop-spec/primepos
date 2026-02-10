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
import { Search, Plus, MoreVertical, Trash2, Edit, UserRound, Phone, Mail, Stethoscope, Award, DollarSign } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Doctor } from "@shared/schema";

const specializations = [
  "General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Dermatology",
  "ENT", "Ophthalmology", "Neurology", "Gynecology", "Radiology",
  "Dentistry", "Psychiatry", "Oncology", "Urology", "Gastroenterology",
];

export default function DoctorManagementPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState({
    name: "", specialization: "", qualification: "", phone: "", email: "",
    address: "", consultationFee: "0", schedule: "", status: "active",
    joiningDate: "", notes: "",
  });

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
    setForm({ name: "", specialization: "", qualification: "", phone: "", email: "", address: "", consultationFee: "0", schedule: "", status: "active", joiningDate: "", notes: "" });
  };

  const filtered = doctors.filter((d) => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization.toLowerCase().includes(search.toLowerCase()) ||
      d.doctorId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: doctors.length,
    active: doctors.filter(d => d.status === "active").length,
    onLeave: doctors.filter(d => d.status === "on_leave").length,
    inactive: doctors.filter(d => d.status === "inactive").length,
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Doctor Management</h1>
          <p className="text-sm text-muted-foreground">Manage clinic doctors and specialists</p>
        </div>
        <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-doctor">
          <Plus className="h-4 w-4 mr-2" /> Add Doctor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Doctors</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">On Leave</p><p className="text-2xl font-bold text-orange-600">{stats.onLeave}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-600">{stats.inactive}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-doctors" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading doctors...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No doctors found. Click "Add Doctor" to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover-elevate" data-testid={`card-doctor-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{getInitials(doc.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold" data-testid={`text-doctor-name-${doc.id}`}>{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.doctorId}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-menu-${doc.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingDoctor(doc);
                        setForm({
                          name: doc.name, specialization: doc.specialization, qualification: doc.qualification || "",
                          phone: doc.phone || "", email: doc.email || "", address: doc.address || "",
                          consultationFee: doc.consultationFee || "0", schedule: doc.schedule || "",
                          status: doc.status, joiningDate: doc.joiningDate || "", notes: doc.notes || "",
                        });
                        setEditDialog(true);
                      }} data-testid={`button-edit-${doc.id}`}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(doc.id)} data-testid={`button-delete-${doc.id}`}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{doc.specialization}</span>
                  </div>
                  {doc.qualification && (
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{doc.qualification}</span>
                    </div>
                  )}
                  {doc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                  {doc.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{doc.email}</span>
                    </div>
                  )}
                  {doc.consultationFee && Number(doc.consultationFee) > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>${doc.consultationFee}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${doc.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : doc.status === "on_leave" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {doc.status === "on_leave" ? "On Leave" : doc.status}
                  </Badge>
                  {doc.joiningDate && <span className="text-xs text-muted-foreground">Joined: {doc.joiningDate}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(addDialog || editDialog) && (
        <Dialog open={addDialog || editDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); setEditDialog(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editDialog ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
