import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FileText, Printer, Pill, Stethoscope, MoreVertical, Filter, Pencil, Plus, X, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { printPrescription, type PrescriptionLine } from "@/lib/prescription-print";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { SearchableSelect } from "@/components/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useGlobalBarcodeScanner } from "@/hooks/use-global-barcode-scanner";
import { billNoMatches } from "@/lib/bill-utils";
import type { Patient, Doctor, ClinicSettings, Service, Injection, Medicine, Package as PackageType } from "@shared/schema";

const dateToYMD = (d: Date) => d.toISOString().split("T")[0];

function parsePrescriptionJson(prescription: string | null | undefined): { lines: PrescriptionLine[]; notes: string } {
  if (!prescription || !prescription.trim()) return { lines: [], notes: "" };
  const t = prescription.trim();
  if (t.startsWith("{")) {
    try {
      const p = JSON.parse(t) as { lines?: Array<Record<string, unknown>>; notes?: string };
      const rawLines = Array.isArray(p.lines) ? p.lines : [];
      const lines: PrescriptionLine[] = rawLines.map((line) => {
        const name = [line.name, line.medicineName, line.itemName].find((v) => typeof v === "string" && v.trim()) as string | undefined;
        return {
          medicineId: line.medicineId != null ? Number(line.medicineId) : undefined,
          serviceId: line.serviceId != null ? Number(line.serviceId) : undefined,
          injectionId: line.injectionId != null ? Number(line.injectionId) : undefined,
          packageId: line.packageId != null ? Number(line.packageId) : undefined,
          type: typeof line.type === "string" ? line.type : undefined,
          name: name?.trim() ?? "",
          dosage: typeof line.dosage === "string" ? line.dosage : "",
          duration: typeof line.duration === "string" ? line.duration : "",
          frequency: typeof line.frequency === "string" ? line.frequency : "",
          instructions: typeof line.instructions === "string" ? line.instructions : "",
        };
      });
      return {
        lines,
        notes: typeof p.notes === "string" ? p.notes : "",
      };
    } catch {
      return { lines: [], notes: t };
    }
  }
  return { lines: [], notes: t };
}

export default function PrescriptionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return dateToYMD(d);
  });
  const [toDate, setToDate] = useState(() => dateToYMD(new Date()));
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [editVisit, setEditVisit] = useState<any | null>(null);
  const [editDoctor, setEditDoctor] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editLines, setEditLines] = useState<PrescriptionLine[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editBarcodeInput, setEditBarcodeInput] = useState("");
  const [editSearchValue, setEditSearchValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVisitIds, setSelectedVisitIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: number[] }>({ open: false, ids: [] });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("fromDate", fromDate);
    p.set("toDate", toDate);
    p.set("hasPrescription", "true");
    if (doctorFilter && doctorFilter !== "all") p.set("doctorName", doctorFilter);
    return p.toString();
  }, [fromDate, toDate, doctorFilter]);

  const { data: visits = [], isLoading: visitsLoading } = useQuery<any[]>({
    queryKey: ["/api/opd-visits", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/opd-visits?${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/reports/prescription-stats", fromDate, toDate, doctorFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("fromDate", fromDate);
      p.set("toDate", toDate);
      if (doctorFilter && doctorFilter !== "all") p.set("doctorName", doctorFilter);
      const res = await fetch(`/api/reports/prescription-stats?${p}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const { data: patients = [] } = useQuery<Patient[]>({ queryKey: ["/api/patients"] });
  const { data: doctors = [] } = useQuery<Doctor[]>({ queryKey: ["/api/doctors"] });
  const { data: settings } = useQuery<ClinicSettings | null>({ queryKey: ["/api/settings"] });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: injections = [] } = useQuery<Injection[]>({ queryKey: ["/api/injections"] });
  const { data: medicines = [] } = useQuery<Medicine[]>({ queryKey: ["/api/medicines"] });
  const { data: packagesList = [] } = useQuery<PackageType[]>({ queryKey: ["/api/packages"] });

  const handlePrint = (row: any) => {
    const patient = patients.find((p) => p.id === row.patientId);
    printPrescription(
      {
        visitId: row.visitId,
        doctorName: row.doctorName,
        visitDate: row.visitDate,
        prescription: row.prescription,
        diagnosis: row.diagnosis,
        symptoms: row.symptoms,
      },
      patient ?? null,
      settings ? { clinicName: settings.clinicName ?? undefined, address: settings.address ?? undefined, phone: settings.phone ?? undefined, email: settings.email ?? undefined, logo: settings.logo ?? undefined, printPageSize: settings.printPageSize ?? undefined } : null
    );
  };

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `/api/opd-visits/${id}`, data);
      return res.json();
    },
    onSuccess: (updated: any, variables: { id: number; data: Record<string, string>; printAfterSave?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/prescription-stats"] });
      if (variables.printAfterSave && editVisit) {
        const patient = patients.find((p: Patient) => p.id === editVisit.patientId);
        const settingsForPrint = settings ? { clinicName: settings.clinicName ?? undefined, address: settings.address ?? undefined, phone: settings.phone ?? undefined, email: settings.email ?? undefined, logo: settings.logo ?? undefined, printPageSize: settings.printPageSize ?? undefined } : null;
        printPrescription(
          { visitId: editVisit.visitId, doctorName: updated.doctorName, visitDate: updated.visitDate, prescription: updated.prescription, diagnosis: updated.diagnosis, symptoms: updated.symptoms },
          patient ?? null,
          settingsForPrint
        );
      }
      setEditVisit(null);
      toast({ title: "Prescription updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteVisitsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/opd-visits/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (_data: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opd-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/prescription-stats"] });
      setSelectedVisitIds(new Set());
      setDeleteConfirm({ open: false, ids: [] });
      toast({ title: "Prescriptions deleted", description: `${_data.deleted ?? 0} item(s) removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (row: any) => {
    setEditVisit(row);
    setEditDoctor(row.doctorName || "");
    setEditSymptoms(row.symptoms || "");
    setEditDiagnosis(row.diagnosis || "");
    const { lines, notes } = parsePrescriptionJson(row.prescription);
    setEditLines(lines);
    setEditNotes(notes);
    setEditBarcodeInput("");
  };

  const handleEditSave = (printAfterSave?: boolean) => {
    if (!editVisit) return;
    const prescriptionPayload = JSON.stringify({
      lines: editLines.map((l) => ({
        medicineId: l.medicineId,
        serviceId: l.serviceId,
        injectionId: l.injectionId,
        packageId: l.packageId,
        type: l.type,
        name: l.name ?? "",
        dosage: l.dosage || "",
        duration: l.duration || "",
        frequency: l.frequency || "",
        instructions: l.instructions || "",
      })),
      notes: editNotes,
    });
    updateVisitMutation.mutate({
      id: editVisit.id,
      data: {
        doctorName: editDoctor,
        symptoms: editSymptoms,
        diagnosis: editDiagnosis,
        prescription: prescriptionPayload,
        notes: editNotes,
      },
      printAfterSave,
    });
  };

  const handleEditBarcodeSearch = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const res = await apiRequest("GET", `/api/medicines/lookup?code=${encodeURIComponent(trimmed)}`);
      const med = await res.json();
      if (med && med.name) {
        setEditLines((prev) => [...prev, { medicineId: med.id, name: med.name, dosage: "", duration: "", frequency: "", instructions: "" }]);
        setEditBarcodeInput("");
        toast({ title: "Medicine added", description: med.name });
      } else {
        toast({ title: "Not found", description: "No medicine for this code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Lookup failed", variant: "destructive" });
    }
  };

  const handlePrescriptionBarcodeSearch = (v: string) => {
    const val = (v || "").trim();
    if (!val) return;
    const byVisit = visits.find((row: any) => row.visitId && billNoMatches(val, row.visitId));
    if (byVisit) {
      setSearchTerm(val);
      openEdit(byVisit);
      toast({ title: "Prescription found", description: byVisit.visitId });
      return;
    }
    const pat = patients.find((p: Patient) => (p.patientId || "").toLowerCase() === val.toLowerCase());
    if (pat) {
      setSearchTerm(pat.name || val);
      const byPatient = visits.filter((row: any) => row.patientId === pat.id);
      if (byPatient.length === 1) {
        openEdit(byPatient[0]);
        toast({ title: "Prescription found", description: byPatient[0].visitId });
      } else if (byPatient.length > 1) {
        toast({ title: "Multiple prescriptions", description: `${byPatient.length} for ${pat.name}. Refine search.` });
      }
      return;
    }
    setSearchTerm(val);
  };

  useGlobalBarcodeScanner(handlePrescriptionBarcodeSearch);

  const filteredVisits = useMemo(() => {
    if (!searchTerm.trim()) return visits;
    const term = searchTerm.toLowerCase().trim();
    return visits.filter((row: any) => {
      const visitIdMatch = row.visitId && billNoMatches(searchTerm, row.visitId);
      const patientNameMatch = (row.patientName || "").toLowerCase().includes(term);
      const patientIdMatch = patients.some((p: Patient) => p.id === row.patientId && (p.patientId || "").toLowerCase() === term);
      return visitIdMatch || patientNameMatch || patientIdMatch;
    });
  }, [visits, searchTerm, patients]);

  const columns = [
    { header: "Visit ID", accessor: (row: any) => <span className="font-mono text-xs font-medium">{row.visitId}</span> },
    { header: "Date", accessor: (row: any) => <span className="text-sm">{row.visitDate ? new Date(row.visitDate).toLocaleDateString() : "-"}</span> },
    { header: "Patient", accessor: (row: any) => <span className="font-medium">{row.patientName || "-"}</span> },
    { header: "Doctor", accessor: (row: any) => <span className="text-muted-foreground">{row.doctorName || "-"}</span> },
    { header: "Diagnosis", accessor: (row: any) => <span className="text-sm text-muted-foreground max-w-[180px] truncate block" title={row.diagnosis || ""}>{row.diagnosis || "-"}</span> },
    {
      header: "Actions",
      accessor: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePrint(row); }} className="gap-2">
              <Printer className="h-4 w-4" /> Print prescription
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit prescription
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, ids: [row.id] }); }}
              className="gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Prescriptions"
        description="View and print prescriptions. Use filters for date range and doctor."
        actions={
          <Button variant="default" onClick={() => setLocation("/opd")} className="bg-gradient-to-r from-emerald-600 to-teal-600">
            <FileText className="h-4 w-4 mr-1.5" /> New prescription (OPD)
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">From date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Doctor</Label>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {(doctors as Doctor[]).map((d) => (
                    <SelectItem key={d.id} value={d.name || ""}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Prescriptions (filtered)</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.total ?? visits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">By doctor</p>
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400">{Array.isArray(stats?.byDoctor) ? stats.byDoctor.length : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By-doctor breakdown */}
        {Array.isArray(stats?.byDoctor) && stats.byDoctor.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">By doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.byDoctor.map((item: { doctorName: string; count: number }) => (
                  <Badge key={item.doctorName} variant="secondary" className="text-xs">
                    {item.doctorName}: {item.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Prescriptions</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{filteredVisits.length}</Badge>
              {selectedVisitIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => setDeleteConfirm({ open: true, ids: Array.from(selectedVisitIds) })}
                  data-testid="button-delete-selected-prescriptions"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete selected ({selectedVisitIds.size})
                </Button>
              )}
            </div>
            <div className="w-64">
              <SearchInputWithBarcode
                placeholder="Search / Scan visit or patient"
                className="h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={handlePrescriptionBarcodeSearch}
                data-testid="input-search-prescriptions"
              />
            </div>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
            ) : visits.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No prescriptions in the selected range.</div>
            ) : filteredVisits.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No prescriptions match &quot;{searchTerm}&quot;.</div>
            ) : (
              <DataTable
              columns={columns}
              data={filteredVisits}
              onRowClick={openEdit}
              selectedIds={selectedVisitIds}
              onSelectionChange={setSelectedVisitIds}
            />
            )}
            </CardContent>
        </Card>
      </div>

      {/* Edit prescription dialog */}
      <Dialog open={!!editVisit} onOpenChange={(open) => { if (!open) setEditVisit(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-teal-500" /> Edit prescription
            </DialogTitle>
            <DialogDescription>
              {editVisit && `${editVisit.patientName || ""} — ${editVisit.visitId}`}
            </DialogDescription>
          </DialogHeader>
          {editVisit && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Doctor</Label>
                  <Select value={editDoctor} onValueChange={setEditDoctor}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      {(doctors as Doctor[]).map((d) => (
                        <SelectItem key={d.id} value={d.name || ""}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Symptoms</Label>
                <Textarea value={editSymptoms} onChange={(e) => setEditSymptoms(e.target.value)} rows={2} className="resize-none" />
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Textarea value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} rows={2} className="resize-none" />
              </div>
              <div>
                <Label className="flex items-center gap-2">Prescription — scan barcode or search items</Label>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex gap-2">
                    <SearchInputWithBarcode
                      placeholder="Scan or enter medicine code..."
                      value={editBarcodeInput}
                      onChange={(e) => setEditBarcodeInput(e.target.value)}
                      onSearch={handleEditBarcodeSearch}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditLines((p) => [...p, { name: "", dosage: "", duration: "", frequency: "", instructions: "" }])}>
                      <Plus className="h-4 w-4 mr-1" /> Add line
                    </Button>
                  </div>
                  <SearchableSelect
                    value={editSearchValue}
                    onValueChange={(v) => {
                      setEditSearchValue("");
                      if (!v) return;
                      const [kind, idStr] = v.split(":");
                      const id = Number(idStr);
                      const base = { dosage: "", duration: "", frequency: "", instructions: "" as string };
                      if (kind === "svc") {
                        const s = (services as Service[]).find((sv) => sv.id === id);
                        if (s) setEditLines((prev) => [...prev, { ...base, type: "service", serviceId: id, name: s.name ?? "" }]);
                      } else if (kind === "inj") {
                        const inj = (injections as Injection[]).find((i) => i.id === id);
                        if (inj) setEditLines((prev) => [...prev, { ...base, type: "injection", injectionId: id, name: inj.name ?? "" }]);
                      } else if (kind === "med") {
                        const med = (medicines as Medicine[]).find((m) => m.id === id);
                        if (med) setEditLines((prev) => [...prev, { ...base, type: "medicine", medicineId: id, name: med.name ?? "" }]);
                      } else if (kind === "pkg") {
                        const pkg = (packagesList as PackageType[]).find((p) => p.id === id);
                        if (pkg) setEditLines((prev) => [...prev, { ...base, type: "package", packageId: id, name: pkg.name ?? "" }]);
                      }
                    }}
                    placeholder="Search services, medicines, injections, packages..."
                    searchPlaceholder="Type name..."
                    emptyText="No items found."
                    className="w-full"
                    options={[
                      ...(services as Service[]).filter((s) => s.isActive).map((s) => ({
                        value: `svc:${s.id}`,
                        label: `Service · ${s.name}`,
                        searchText: s.name,
                      })),
                      ...(medicines as Medicine[]).filter((m) => m.isActive).map((m) => ({
                        value: `med:${m.id}`,
                        label: `Medicine · ${m.name}`,
                        searchText: m.name,
                      })),
                      ...(injections as Injection[]).filter((i) => i.isActive).map((i) => ({
                        value: `inj:${i.id}`,
                        label: `Injection · ${i.name}`,
                        searchText: i.name,
                      })),
                      ...(packagesList as PackageType[]).filter((p) => p.isActive).map((p) => ({
                        value: `pkg:${p.id}`,
                        label: `Package · ${p.name}`,
                        searchText: p.name,
                      })),
                    ]}
                  />
                </div>
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {editLines.map((line, idx) => (
                    <div key={idx} className="p-2 grid grid-cols-12 gap-1 items-center text-sm">
                      <input placeholder="Item / Service / Medicine" value={line.name ?? ""} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))} className="col-span-3 border rounded px-2 py-1" />
                      <input placeholder="Dosage" value={line.dosage || ""} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, dosage: e.target.value } : l))} className="col-span-2 border rounded px-2 py-1" />
                      <input placeholder="Duration" value={line.duration || ""} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, duration: e.target.value } : l))} className="col-span-2 border rounded px-2 py-1" />
                      <input placeholder="Frequency" value={line.frequency || ""} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, frequency: e.target.value } : l))} className="col-span-2 border rounded px-2 py-1" />
                      <input placeholder="Instructions" value={line.instructions || ""} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, instructions: e.target.value } : l))} className="col-span-2 border rounded px-2 py-1" />
                      <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => setEditLines((p) => p.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  {editLines.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">No medicines. Scan barcode or add line.</div>
                  )}
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditVisit(null)}>Cancel</Button>
                <Button onClick={() => handleEditSave(true)} disabled={updateVisitMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                  <Printer className="h-4 w-4 mr-1" /> Save &amp; print
                </Button>
                <Button onClick={() => handleEditSave()} disabled={updateVisitMutation.isPending} variant="secondary">
                  Save only
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((c) => ({ ...c, open }))}
        title="Delete prescriptions"
        description={deleteConfirm.ids.length === 1
          ? "Are you sure you want to delete this prescription? This cannot be undone."
          : `Are you sure you want to delete ${deleteConfirm.ids.length} prescriptions? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirm.ids.length > 0) bulkDeleteVisitsMutation.mutate(deleteConfirm.ids);
        }}
      />
    </div>
  );
}
