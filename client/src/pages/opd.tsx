import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import type { Patient, OpdVisit } from "@shared/schema";

export default function OpdPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: visits = [], isLoading: visitsLoading } = useQuery<any[]>({
    queryKey: ["/api/opd-visits"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/opd-visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setVisitDialogOpen(false);
      toast({ title: "OPD Visit created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateVisitStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/opd-visits/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
      toast({ title: "Visit status updated" });
    },
  });

  const filteredVisits = visits.filter((v: any) =>
    v.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.visitId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateVisit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createVisitMutation.mutate({
      visitId: `VIS-${Date.now()}`,
      patientId: Number(form.get("patientId")),
      doctorName: form.get("doctorName") || null,
      symptoms: form.get("symptoms") || null,
      diagnosis: form.get("diagnosis") || null,
      prescription: form.get("prescription") || null,
      notes: form.get("notes") || null,
      status: "active",
    });
  };

  const visitColumns = [
    { header: "Visit ID", accessor: "visitId" as keyof any },
    { header: "Patient", accessor: "patientName" as keyof any },
    { header: "Doctor", accessor: (row: any) => row.doctorName || "-" },
    { header: "Symptoms", accessor: (row: any) => (
      <span className="max-w-[200px] truncate block text-xs text-muted-foreground">
        {row.symptoms || "-"}
      </span>
    )},
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.status === "active" ? "default" : row.status === "completed" ? "secondary" : "outline"}>
        {row.status}
      </Badge>
    )},
    { header: "Date", accessor: (row: any) => row.visitDate ? new Date(row.visitDate).toLocaleDateString() : "-" },
    { header: "Actions", accessor: (row: any) => (
      <div className="flex gap-1">
        {row.status === "active" && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); updateVisitStatusMutation.mutate({ id: row.id, status: "completed" }); }}
            data-testid={`button-complete-visit-${row.id}`}
          >
            Complete
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="OPD Management"
        description="Manage outpatient department visits"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/register-patient")} data-testid="button-register-patient">
              <UserPlus className="h-4 w-4 mr-1" /> Register Patient
            </Button>

            <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-visit">
                  <Plus className="h-4 w-4 mr-1" /> New Visit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create OPD Visit</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateVisit} className="space-y-3">
                  <div>
                    <Label>Patient *</Label>
                    <Select name="patientId" required>
                      <SelectTrigger data-testid="select-visit-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.patientId})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doctorName">Doctor Name</Label>
                    <Input id="doctorName" name="doctorName" data-testid="input-visit-doctor" />
                  </div>
                  <div>
                    <Label htmlFor="symptoms">Symptoms</Label>
                    <Textarea id="symptoms" name="symptoms" rows={2} data-testid="input-visit-symptoms" />
                  </div>
                  <div>
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Textarea id="diagnosis" name="diagnosis" rows={2} data-testid="input-visit-diagnosis" />
                  </div>
                  <div>
                    <Label htmlFor="prescription">Prescription</Label>
                    <Textarea id="prescription" name="prescription" rows={2} data-testid="input-visit-prescription" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" rows={2} data-testid="input-visit-notes" />
                  </div>
                  <Button type="submit" className="w-full" disabled={createVisitMutation.isPending} data-testid="button-submit-visit">
                    {createVisitMutation.isPending ? "Creating..." : "Create Visit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">OPD Visits</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search visits..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-visits"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={visitColumns} data={filteredVisits} isLoading={visitsLoading} emptyMessage="No OPD visits yet" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
