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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, UserPlus, LayoutGrid, List, RefreshCw, MoreVertical, CalendarPlus, Eye, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import type { Patient } from "@shared/schema";

export default function OpdPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
      toast({ title: "Patient deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
          <CalendarPlus className="h-3 w-3 mr-1" /> Appointment
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
              <UserPlus className="h-4 w-4 mr-1" /> Register Patient
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
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
                            <DropdownMenuItem data-testid={`menu-view-${patient.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`menu-edit-${patient.id}`}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Patient
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deletePatientMutation.mutate(patient.id)}
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
                          <AvatarFallback className="text-lg bg-muted">
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
                          className="w-full text-center text-xs font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => openAppointmentDialog(patient)}
                          data-testid={`button-add-appointment-${patient.id}`}
                        >
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
