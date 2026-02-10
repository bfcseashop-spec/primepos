import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, QrCode, FlaskConical, TestTubes, DollarSign, CheckCircle, Upload, Download, FileText, Printer, User, Clock, XCircle, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import type { LabTest, Patient } from "@shared/schema";

const LAB_CATEGORIES = [
  "Hematology", "Biochemistry", "Microbiology", "Immunology",
  "Pathology", "Radiology", "Cardiology", "Endocrinology",
  "Urology", "Gastroenterology", "Neurology", "Other"
];

const SAMPLE_TYPES = [
  "Blood", "Urine", "Stool", "Sputum", "Swab",
  "Tissue", "CSF", "Saliva", "Serum", "Plasma", "Other"
];

const STATUS_OPTIONS = [
  { value: "processing", label: "Processing", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "complete", label: "Complete", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  { value: "sample_missing", label: "Sample Missing", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { value: "cancel", label: "Cancel", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
];

const defaultForm = {
  testName: "", categories: [] as string[], sampleTypes: [] as string[], price: "",
  description: "", turnaroundTime: "", status: "processing",
  patientId: "", referrerName: "",
};

type LabTestWithPatient = LabTest & { patientName?: string | null };

function getElapsedTime(createdAt: string | Date | null): string {
  if (!createdAt) return "-";
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const diff = now - start;
  if (diff < 0) return "0m";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function LiveTimer({ createdAt, status }: { createdAt: string | Date | null; status: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "processing") return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "complete") return <span className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</span>;
  if (status === "cancel") return <span className="text-xs text-red-600 dark:text-red-400 font-medium">Cancelled</span>;
  if (status === "sample_missing") return <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Waiting</span>;

  const elapsed = getElapsedTime(createdAt);
  return (
    <div className="flex items-center gap-1">
      <Clock className="h-3 w-3 text-blue-500 animate-pulse" />
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{elapsed}</span>
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder, testId }: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal h-9 text-sm" data-testid={testId}>
          {selected.length > 0 ? (
            <span className="truncate">{selected.join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate text-sm">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                data-testid={`checkbox-${testId}-${opt.toLowerCase().replace(/\s/g, '-')}`}
              />
              {opt}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function LabTestsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTest, setEditTest] = useState<LabTestWithPatient | null>(null);
  const [viewTest, setViewTest] = useState<LabTestWithPatient | null>(null);
  const [barcodeTest, setBarcodeTest] = useState<LabTestWithPatient | null>(null);
  const [uploadTest, setUploadTest] = useState<LabTestWithPatient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadReferrer, setUploadReferrer] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: labTests = [], isLoading } = useQuery<LabTestWithPatient[]>({
    queryKey: ["/api/lab-tests"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const codeRes = await fetch("/api/lab-tests/next-code");
      const { code } = await codeRes.json();
      const res = await apiRequest("POST", "/api/lab-tests", { ...data, testCode: code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: "Lab test created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/lab-tests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setEditTest(null);
      setForm(defaultForm);
      toast({ title: "Lab test updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lab-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: "Lab test deleted" });
    },
  });

  const handleSubmit = () => {
    if (!form.testName || form.categories.length === 0 || form.sampleTypes.length === 0 || !form.price) {
      return toast({ title: "Please fill in all required fields", variant: "destructive" });
    }
    const payload: any = {
      testName: form.testName,
      category: form.categories.join(", "),
      sampleType: form.sampleTypes.join(", "),
      price: form.price,
      description: form.description || null,
      turnaroundTime: form.turnaroundTime || null,
      status: form.status,
      patientId: form.patientId ? Number(form.patientId) : null,
      referrerName: form.referrerName || null,
    };
    if (editTest) {
      updateMutation.mutate({ id: editTest.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (test: LabTestWithPatient) => {
    setForm({
      testName: test.testName,
      categories: test.category.split(",").map(s => s.trim()).filter(Boolean),
      sampleTypes: test.sampleType.split(",").map(s => s.trim()).filter(Boolean),
      price: test.price,
      description: test.description || "",
      turnaroundTime: test.turnaroundTime || "",
      status: test.status,
      patientId: test.patientId ? String(test.patientId) : "",
      referrerName: test.referrerName || "",
    });
    setEditTest(test);
  };

  const handleFileUpload = async () => {
    if (!uploadTest || !fileInputRef.current?.files?.[0]) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('report', fileInputRef.current.files[0]);
      if (uploadReferrer) formData.append('referrerName', uploadReferrer);
      const res = await fetch(`/api/lab-tests/${uploadTest.id}/upload-report`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: "Report uploaded successfully" });
      setUploadTest(null);
      setUploadReferrer("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = labTests.filter(t => {
    const matchSearch = searchTerm === "" ||
      t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sampleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.testCode && t.testCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.patientName && t.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.referrerName && t.referrerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = categoryFilter === "all" || t.category.includes(categoryFilter);
    return matchSearch && matchCategory;
  });

  const processingCount = labTests.filter(t => t.status === "processing").length;
  const completeCount = labTests.filter(t => t.status === "complete").length;
  const uniqueCategories = Array.from(new Set(labTests.flatMap(t => t.category.split(",").map(s => s.trim()))));
  const withReports = labTests.filter(t => t.reportFileUrl).length;

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return <Badge variant="secondary">{status}</Badge>;
    const icons: Record<string, typeof CheckCircle> = {
      processing: Loader2,
      complete: CheckCircle,
      sample_missing: AlertTriangle,
      cancel: XCircle,
    };
    const Icon = icons[status] || CheckCircle;
    return (
      <Badge variant="outline" className={`${opt.color} border-current/20 gap-1`}>
        <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
        {opt.label}
      </Badge>
    );
  };

  const columns = [
    { header: "Test ID", accessor: (row: LabTestWithPatient) => (
      <span className="font-mono text-xs text-muted-foreground" data-testid={`text-test-code-${row.id}`}>{row.testCode}</span>
    )},
    { header: "Test Name", accessor: (row: LabTestWithPatient) => (
      <span className="font-medium" data-testid={`text-test-name-${row.id}`}>{row.testName}</span>
    )},
    { header: "Patient", accessor: (row: LabTestWithPatient) => (
      <span className="text-sm" data-testid={`text-patient-${row.id}`}>
        {row.patientName || <span className="text-muted-foreground">-</span>}
      </span>
    )},
    { header: "Category", accessor: (row: LabTestWithPatient) => (
      <div className="flex flex-wrap gap-1" data-testid={`badge-category-${row.id}`}>
        {row.category.split(",").map(c => c.trim()).filter(Boolean).map(c => (
          <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
        ))}
      </div>
    )},
    { header: "Sample Type", accessor: (row: LabTestWithPatient) => (
      <div className="flex flex-wrap gap-1" data-testid={`badge-sample-${row.id}`}>
        {row.sampleType.split(",").map(s => s.trim()).filter(Boolean).map(s => (
          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
        ))}
      </div>
    )},
    { header: "Price", accessor: (row: LabTestWithPatient) => (
      <span className="font-medium" data-testid={`text-price-${row.id}`}>${row.price}</span>
    )},
    { header: "Processing Time", accessor: (row: LabTestWithPatient) => (
      <LiveTimer createdAt={row.createdAt} status={row.status} />
    )},
    { header: "Status", accessor: (row: LabTestWithPatient) => (
      <span data-testid={`badge-status-${row.id}`}>{getStatusBadge(row.status)}</span>
    )},
    { header: "Refer Name", accessor: (row: LabTestWithPatient) => (
      <span className="text-sm" data-testid={`text-referrer-${row.id}`}>
        {row.referrerName || <span className="text-muted-foreground">-</span>}
      </span>
    )},
    { header: "Actions", accessor: (row: LabTestWithPatient) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewTest(row); }} className="gap-2" data-testid={`action-view-${row.id}`}>
            <Eye className="h-4 w-4 text-blue-500" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2" data-testid={`action-edit-${row.id}`}>
            <Pencil className="h-4 w-4 text-amber-500" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setUploadTest(row); setUploadReferrer(row.referrerName || ""); }} className="gap-2" data-testid={`action-upload-${row.id}`}>
            <Upload className="h-4 w-4 text-green-500" /> {row.reportFileUrl ? "Update Report" : "Upload Report"}
          </DropdownMenuItem>
          {row.reportFileUrl && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(row.reportFileUrl!, '_blank'); }} className="gap-2" data-testid={`action-download-${row.id}`}>
              <Download className="h-4 w-4 text-indigo-500" /> Download Report
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBarcodeTest(row); }} className="gap-2" data-testid={`action-barcode-${row.id}`}>
            <QrCode className="h-4 w-4 text-purple-500" /> Barcode
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lab test?")) deleteMutation.mutate(row.id); }}
            className="text-red-600 gap-2"
            data-testid={`action-delete-${row.id}`}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <Label htmlFor="test-name">Test Name *</Label>
          <Input id="test-name" value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} data-testid="input-test-name" />
        </div>
        <div>
          <Label>Patient</Label>
          <Select value={form.patientId} onValueChange={v => setForm(f => ({ ...f, patientId: v === "none" ? "" : v }))}>
            <SelectTrigger data-testid="select-patient"><SelectValue placeholder="Select patient (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Patient</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.patientId})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category *</Label>
            <MultiSelect
              options={LAB_CATEGORIES}
              selected={form.categories}
              onChange={v => setForm(f => ({ ...f, categories: v }))}
              placeholder="Select categories"
              testId="select-test-category"
            />
          </div>
          <div>
            <Label>Sample Type *</Label>
            <MultiSelect
              options={SAMPLE_TYPES}
              selected={form.sampleTypes}
              onChange={v => setForm(f => ({ ...f, sampleTypes: v }))}
              placeholder="Select sample types"
              testId="select-sample-type"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="test-price">Price ($) *</Label>
            <Input id="test-price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} data-testid="input-test-price" />
          </div>
          <div>
            <Label htmlFor="test-tat">Turnaround Time</Label>
            <Input id="test-tat" placeholder="e.g. 2 hours, 1 day" value={form.turnaroundTime} onChange={e => setForm(f => ({ ...f, turnaroundTime: e.target.value }))} data-testid="input-test-tat" />
          </div>
        </div>
        <div>
          <Label htmlFor="test-referrer">Referrer Name</Label>
          <Input id="test-referrer" placeholder="Person who referred/uploaded" value={form.referrerName} onChange={e => setForm(f => ({ ...f, referrerName: e.target.value }))} data-testid="input-referrer-name" />
        </div>
        <div>
          <Label htmlFor="test-desc">Description</Label>
          <Textarea id="test-desc" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-test-description" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger data-testid="select-test-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Lab Test Management"
        description="Manage laboratory tests, pricing, and categories"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(defaultForm); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lab-test">
                <Plus className="h-4 w-4 mr-1" /> Add Lab Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Lab Test</DialogTitle>
              </DialogHeader>
              {formContent}
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-lab-test">
                {createMutation.isPending ? "Creating..." : "Add Lab Test"}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {viewTest && (
        <Dialog open={!!viewTest} onOpenChange={(open) => { if (!open) setViewTest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Lab Test Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Test ID</p>
                  <p className="font-mono font-semibold" data-testid="text-view-test-code">{viewTest.testCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Test Name</p>
                  <p className="font-semibold" data-testid="text-view-test-name">{viewTest.testName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="text-sm">{viewTest.patientName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <div className="flex flex-wrap gap-1">
                    {viewTest.category.split(",").map(c => c.trim()).filter(Boolean).map(c => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sample Type</p>
                  <div className="flex flex-wrap gap-1">
                    {viewTest.sampleType.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-bold text-green-600 dark:text-green-400">${viewTest.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Processing Time</p>
                  <LiveTimer createdAt={viewTest.createdAt} status={viewTest.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(viewTest.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Turnaround Time</p>
                  <p className="text-sm">{viewTest.turnaroundTime || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Referrer</p>
                  <p className="text-sm">{viewTest.referrerName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Report</p>
                  {viewTest.reportFileUrl ? (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-green-500" />
                      <a href={viewTest.reportFileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 underline" data-testid="link-view-report">
                        {viewTest.reportFileName || "Download"}
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No report</span>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{viewTest.description || "-"}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editTest && (
        <Dialog open={!!editTest} onOpenChange={(open) => { if (!open) { setEditTest(null); setForm(defaultForm); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Lab Test ({editTest.testCode})</DialogTitle>
            </DialogHeader>
            {formContent}
            <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-lab-test">
              {updateMutation.isPending ? "Updating..." : "Update Lab Test"}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {uploadTest && (
        <Dialog open={!!uploadTest} onOpenChange={(open) => { if (!open) { setUploadTest(null); setUploadReferrer(""); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                {uploadTest.reportFileUrl ? "Update Report" : "Upload Report"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Test: {uploadTest.testCode} - {uploadTest.testName}</p>
                {uploadTest.reportFileName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <FileText className="h-3 w-3" />
                    Current: {uploadTest.reportFileName}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="report-file">Report File (PDF, Excel, CSV) *</Label>
                <Input
                  id="report-file"
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv"
                  ref={fileInputRef}
                  data-testid="input-report-file"
                />
              </div>
              <div>
                <Label htmlFor="upload-referrer">Referrer Name</Label>
                <Input
                  id="upload-referrer"
                  placeholder="Person uploading the report"
                  value={uploadReferrer}
                  onChange={e => setUploadReferrer(e.target.value)}
                  data-testid="input-upload-referrer"
                />
              </div>
              <Button className="w-full" onClick={handleFileUpload} disabled={uploading} data-testid="button-upload-report">
                {uploading ? "Uploading..." : "Upload Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {barcodeTest && (
        <Dialog open={!!barcodeTest} onOpenChange={(open) => { if (!open) setBarcodeTest(null); }}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-500" />
                Barcode
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-4 bg-white rounded-md border">
                <svg viewBox="0 0 200 200" width="180" height="180" data-testid="img-barcode-qr">
                  {(() => {
                    const data = `LAB-TEST|${barcodeTest.testCode}|${barcodeTest.testName}|${barcodeTest.category}|$${barcodeTest.price}`;
                    const cells: JSX.Element[] = [];
                    let seed = 0;
                    for (let i = 0; i < data.length; i++) seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;
                    for (let y = 0; y < 20; y++) {
                      for (let x = 0; x < 20; x++) {
                        seed = (seed * 16807 + 0) % 2147483647;
                        const isBorder = x === 0 || x === 19 || y === 0 || y === 19;
                        const isCorner = (x < 4 && y < 4) || (x > 15 && y < 4) || (x < 4 && y > 15);
                        if (isCorner || isBorder || seed % 3 === 0) {
                          cells.push(<rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" fill="black" />);
                        }
                      }
                    }
                    return cells;
                  })()}
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="font-mono text-sm font-bold">{barcodeTest.testCode}</p>
                <p className="font-semibold text-sm">{barcodeTest.testName}</p>
                <p className="text-xs text-muted-foreground">{barcodeTest.category} | {barcodeTest.sampleType}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tests</p>
                <p className="text-xl font-bold" data-testid="text-total-tests">{labTests.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processing</p>
                <p className="text-xl font-bold" data-testid="text-processing-tests">{processingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Complete</p>
                <p className="text-xl font-bold" data-testid="text-complete-tests">{completeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <TestTubes className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-xl font-bold" data-testid="text-categories-count">{uniqueCategories.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Lab Tests</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-filter-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  className="pl-8 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-lab-tests"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No lab tests yet. Click 'Add Lab Test' to create one." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
