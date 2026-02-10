import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, UserPlus, LayoutGrid, List, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import type { Patient, OpdVisit } from "@shared/schema";

export default function OpdPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: visits = [], isLoading: visitsLoading } = useQuery<any[]>({
    queryKey: ["/api/opd-visits"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    toast({ title: "Data refreshed" });
  };

  const filteredVisits = visits.filter((v: any) =>
    v.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.visitId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                placeholder="Search visits..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-visits"
              />
            </div>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        {viewMode === "list" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
              <CardTitle className="text-sm font-semibold">OPD Visits</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable columns={visitColumns} data={filteredVisits} isLoading={visitsLoading} emptyMessage="No OPD visits yet" />
            </CardContent>
          </Card>
        ) : (
          <div>
            <h3 className="text-sm font-semibold mb-3">OPD Visits</h3>
            {visitsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No OPD visits yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredVisits.map((visit: any) => (
                  <Card key={visit.id} className="hover-elevate" data-testid={`card-visit-${visit.id}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{visit.visitId}</span>
                        <Badge variant={visit.status === "active" ? "default" : visit.status === "completed" ? "secondary" : "outline"}>
                          {visit.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{visit.patientName}</p>
                      <p className="text-xs text-muted-foreground">{visit.doctorName || "No doctor assigned"}</p>
                      {visit.symptoms && (
                        <p className="text-xs text-muted-foreground truncate">{visit.symptoms}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString() : "-"}
                        </span>
                        {visit.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateVisitStatusMutation.mutate({ id: visit.id, status: "completed" })}
                            data-testid={`button-complete-visit-grid-${visit.id}`}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
