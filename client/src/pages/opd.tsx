import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Search, UserPlus, LayoutGrid, List, RefreshCw, MoreVertical, CalendarPlus, Eye, Pencil, Trash2, User as UserIcon, Phone, Mail, MapPin, Droplets, Calendar, AlertTriangle, FileText, Heart } from "lucide-react";
import { useLocation } from "wouter";
import type { Patient } from "@shared/schema";

export default function OpdPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
    updatePatientMutation.mutate({
      id: editPatient.id,
      data: { ...editForm, name },
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

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.firstName?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.patientId?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term)
    );
  });

  const patientTypeColor = (type: string | null) => {
    switch (type) {
      case "In Patient": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "Emergency": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  const listColumns = [
    { header: "Patient ID", accessor: (row: any) => row.patientId },
    { header: "Name", accessor: (row: any) => getDisplayName(row) },
    { header: "Gender", accessor: (row: any) => row.gender || "-" },
    { header: "Phone", accessor: (row: any) => row.phone || "-" },
    { header: "Type", accessor: (row: any) => (
      <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${patientTypeColor(row.patientType)}`}>
        {row.patientType || "Out Patient"}
      </Badge>
    )},
    { header: "Location", accessor: (row: any) => row.city || "-" },
    { header: "Last Visit", accessor: (row: any) => {
      const lv = getLastVisit(row.id);
      return lv ? new Date(lv.visitDate).toLocaleDateString() : "-";
    }},
    { header: "Actions", accessor: (row: any) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openAppointmentDialog(row); }} data-testid={`button-add-appointment-list-${row.id}`}>
          <CalendarPlus className="h-3 w-3 mr-1 text-blue-500 dark:text-blue-400" /> Appointment
        </Button>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="OPD Management"
        description="Manage outpatient department visits"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" onClick={() => navigate("/register-patient")} data-testid="button-register-patient">
              <UserPlus className="h-4 w-4 mr-1 text-emerald-500 dark:text-emerald-400" /> Register Patient
            </Button>
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
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search patients by name, ID, or location..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-patients"
              />
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        {viewMode === "grid" ? (
          patientsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 flex flex-col items-center gap-3">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserIcon className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No patients found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => {
                const lastVisit = getLastVisit(patient.id);
                return (
                  <Card key={patient.id} data-testid={`card-patient-${patient.id}`}>
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between gap-2 px-4 pt-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium no-default-hover-elevate no-default-active-elevate ${patientTypeColor(patient.patientType)}`}
                          data-testid={`badge-patient-type-${patient.id}`}
                        >
                          {patient.patientType || "Out Patient"}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-patient-menu-${patient.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewPatient(patient)} data-testid={`menu-view-${patient.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditPatient(patient)} data-testid={`menu-edit-${patient.id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Patient
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletePatient(patient)}
                              data-testid={`menu-delete-${patient.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-col items-center py-4 px-4">
                        <Avatar className="h-16 w-16 mb-2">
                          <AvatarImage src={patient.photoUrl || undefined} alt={getDisplayName(patient)} />
                          <AvatarFallback className="text-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            {getInitials(patient)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground font-mono" data-testid={`text-patient-id-${patient.id}`}>
                          #{patient.patientId}
                        </span>
                        <h3 className="font-medium text-sm mt-0.5" data-testid={`text-patient-name-${patient.id}`}>
                          {getDisplayName(patient)}
                        </h3>
                      </div>

                      <div className="border-t grid grid-cols-3 divide-x text-center py-3 px-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Last Visit</p>
                          <p className="text-xs font-medium" data-testid={`text-last-visit-${patient.id}`}>
                            {lastVisit ? new Date(lastVisit.visitDate).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }) : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Gender</p>
                          <p className="text-xs font-medium" data-testid={`text-gender-${patient.id}`}>
                            {patient.gender || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Location</p>
                          <p className="text-xs font-medium truncate" data-testid={`text-location-${patient.id}`}>
                            {patient.city || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t px-4 py-2.5">
                        <button
                          className="w-full text-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center justify-center gap-1"
                          onClick={() => openAppointmentDialog(patient)}
                          data-testid={`button-add-appointment-${patient.id}`}
                        >
                          <CalendarPlus className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                          Add Appointment
                        </button>
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

      {/* View Patient Details Dialog */}
      <Dialog open={!!viewPatient} onOpenChange={(open) => { if (!open) setViewPatient(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-view-patient-title">Patient Details</DialogTitle>
            <DialogDescription>Complete patient information</DialogDescription>
          </DialogHeader>
          {viewPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={viewPatient.photoUrl || undefined} />
                  <AvatarFallback className="text-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">{getInitials(viewPatient)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-view-patient-name">{getDisplayName(viewPatient)}</h3>
                  <p className="text-sm text-muted-foreground font-mono">#{viewPatient.patientId}</p>
                  <Badge variant="outline" className={`text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate ${patientTypeColor(viewPatient.patientType)}`}>
                    {viewPatient.patientType || "Out Patient"}
                  </Badge>
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
                      <p className="text-[10px] text-muted-foreground">Phone</p>
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
                      <p className="text-[10px] text-muted-foreground">Email</p>
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
                      <p className="text-[10px] text-muted-foreground">Gender</p>
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
                      <p className="text-[10px] text-muted-foreground">Date of Birth</p>
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
                      <p className="text-[10px] text-muted-foreground">Blood Group</p>
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
                      <p className="text-[10px] text-muted-foreground">Address</p>
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
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" /> Emergency Contact
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {viewPatient.emergencyContactName && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Name</p>
                          <p className="text-sm">{viewPatient.emergencyContactName}</p>
                        </div>
                      )}
                      {viewPatient.emergencyContactPhone && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Phone</p>
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
                      <FileText className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /> Medical History
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
                      <Heart className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" /> Allergies
                    </h4>
                    <p className="text-sm bg-muted/50 rounded-md p-3">{viewPatient.allergies}</p>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setViewPatient(null); openEditPatient(viewPatient); }} data-testid="button-view-to-edit">
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setViewPatient(null)} data-testid="button-close-view">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={!!editPatient} onOpenChange={(open) => { if (!open) setEditPatient(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-patient-title">Edit Patient</DialogTitle>
            <DialogDescription>Update patient information</DialogDescription>
          </DialogHeader>
          {editPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} data-testid="input-edit-first-name" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} data-testid="input-edit-last-name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-edit-phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} data-testid="input-edit-email" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger data-testid="select-edit-gender"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-edit-dob" />
                </div>
                <div>
                  <Label>Blood Group</Label>
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
                  <Label>Address</Label>
                  <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} data-testid="input-edit-address" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
                </div>
              </div>
              <div>
                <Label>Patient Type</Label>
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
                  <Label>Emergency Contact Name</Label>
                  <Input value={editForm.emergencyContactName} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} data-testid="input-edit-emergency-name" />
                </div>
                <div>
                  <Label>Emergency Contact Phone</Label>
                  <Input value={editForm.emergencyContactPhone} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} data-testid="input-edit-emergency-phone" />
                </div>
              </div>
              <div>
                <Label>Medical History</Label>
                <Textarea value={editForm.medicalHistory} onChange={(e) => setEditForm(f => ({ ...f, medicalHistory: e.target.value }))} rows={3} data-testid="input-edit-medical-history" />
              </div>
              <div>
                <Label>Allergies</Label>
                <Textarea value={editForm.allergies} onChange={(e) => setEditForm(f => ({ ...f, allergies: e.target.value }))} rows={2} data-testid="input-edit-allergies" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditPatient(null)} data-testid="button-cancel-edit">Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={updatePatientMutation.isPending} data-testid="button-save-edit">
                  {updatePatientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePatient} onOpenChange={(open) => { if (!open) setDeletePatient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deletePatient ? getDisplayName(deletePatient) : ""}</span>? This action cannot be undone and will permanently remove all patient data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatient && deletePatientMutation.mutate(deletePatient.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deletePatientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={appointmentDialogOpen} onOpenChange={(open) => { setAppointmentDialogOpen(open); if (!open) setSelectedPatient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-appointment-dialog-title">New Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAppointment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Patient</Label>
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
                <Label>Patient Type</Label>
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
                <Label>Select Department <span className="text-destructive">*</span></Label>
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
                <Label>Select Doctor <span className="text-destructive">*</span></Label>
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
              <Label>Preferred Mode of Consultation <span className="text-destructive">*</span></Label>
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
                <Label>Date</Label>
                <Input type="date" name="appointmentDate" data-testid="input-appointment-date" />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" name="startTime" data-testid="input-appointment-start-time" />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" name="endTime" data-testid="input-appointment-end-time" />
              </div>
            </div>

            <div>
              <Label>Reason</Label>
              <Input name="reason" placeholder="Reason for appointment" data-testid="input-appointment-reason" />
            </div>

            <div>
              <Label>Quick Notes</Label>
              <Textarea name="notes" placeholder="Additional Information" rows={3} data-testid="input-appointment-notes" />
            </div>

            <div>
              <Label>Mode of Payment</Label>
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
                Cancel
              </Button>
              <Button type="submit" disabled={createAppointmentMutation.isPending} data-testid="button-submit-appointment">
                {createAppointmentMutation.isPending ? "Adding..." : "Add Appointment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
