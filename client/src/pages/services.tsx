import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, downloadFile } from "@/lib/queryClient";
import {
  Plus, Search, MoreVertical, Eye, Pencil, Trash2, ImagePlus, X,
  FolderPlus, Activity, CheckCircle2, XCircle, DollarSign, Layers,
  RefreshCw, Grid3X3, List, Stethoscope, Tag, FileText,
  Download, Upload, FileSpreadsheet, FileDown, Syringe,
} from "lucide-react";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { Service, Injection } from "@shared/schema";

const DEFAULT_SERVICE_CATEGORIES = [
  "General", "Emergency", "Preventive", "Cardiology", "Therapy",
  "Consultation", "Laboratory", "Lab Test", "Ultrasound", "Radiology",
  "ECG", "Physiotherapy", "Dental", "Ophthalmology",
  "Surgery", "Other"
];

function getServiceCategories(): string[] {
  const stored = localStorage.getItem("service_categories");
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_SERVICE_CATEGORIES; }
  }
  return DEFAULT_SERVICE_CATEGORIES;
}

function saveServiceCategories(cats: string[]) {
  localStorage.setItem("service_categories", JSON.stringify(cats));
}

const avatarGradients = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  General: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  Emergency: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  Preventive: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  Cardiology: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  Therapy: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  Consultation: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  Laboratory: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  "Lab Test": { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  Ultrasound: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  Radiology: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  Surgery: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

const defaultCategoryColor = { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" };

type ReportParam = { parameter: string; unit: string; normalRange: string; unitType?: "text" | "select"; unitOptions?: string[] };
const defaultForm = {
  name: "", category: "", price: "", description: "", imageUrl: "",
  isLabTest: false, sampleCollectionRequired: false, sampleType: "Blood",
  reportParameters: [] as ReportParam[],
};

const COMMON_LAB_UNITS = ["mg/dL", "mmol/L", "g/L", "g/dL", "mg/L", "µmol/L", "%", "cells/µL", "IU/L", "U/L", "mEq/L", "pg/mL", "ng/mL", "µg/mL", "HPF", "LPF", "—", "N/A"];

const injectionAvatarGradients = [
  "from-cyan-500 to-teal-400",
  "from-blue-500 to-indigo-400",
  "from-emerald-500 to-green-400",
  "from-violet-500 to-purple-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
];

const DEFAULT_INJECTION_CATEGORIES = [
  "General", "Vaccine", "Antibiotic", "Pain Relief", "Vitamin",
  "Steroid", "Hormonal", "IV Fluid", "Other"
];

function getInjectionCategories(): string[] {
  const stored = localStorage.getItem("injection_categories");
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_INJECTION_CATEGORIES; }
  }
  return DEFAULT_INJECTION_CATEGORIES;
}

function saveInjectionCategories(cats: string[]) {
  localStorage.setItem("injection_categories", JSON.stringify(cats));
}

const injCategoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  General: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  Vaccine: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  Antibiotic: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  "Pain Relief": { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  Vitamin: { bg: "bg-green-500/10", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  Steroid: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  Hormonal: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  "IV Fluid": { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
};
const defaultInjCatColor = { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" };

const defaultInjForm = { name: "", category: "", price: "", description: "" };

function InjectionManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInj, setEditInj] = useState<Injection | null>(null);
  const [viewInj, setViewInj] = useState<Injection | null>(null);
  const [deleteInj, setDeleteInj] = useState<Injection | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(defaultInjForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const refName = useRef<HTMLInputElement>(null);
  const refPrice = useRef<HTMLInputElement>(null);
  const refCategory = useRef<HTMLButtonElement>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(getInjectionCategories());
  const [newCategory, setNewCategory] = useState("");
  const [injImportDialogOpen, setInjImportDialogOpen] = useState(false);
  const [injImportFile, setInjImportFile] = useState<File | null>(null);
  const [injImportResult, setInjImportResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: injections = [], isLoading } = useQuery<Injection[]>({
    queryKey: ["/api/injections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/injections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injections"] });
      setDialogOpen(false);
      setForm(defaultInjForm);
      toast({ title: "Injection created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/injections/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injections"] });
      setEditInj(null);
      setForm(defaultInjForm);
      toast({ title: "Injection updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/injections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injections"] });
      toast({ title: "Injection deleted" });
      setDeleteInj(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/injections/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/injections"] });
      toast({ title: `Deleted ${selectedIds.size} injection(s)` });
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const injImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/injections/import", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).message || "Import failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/injections"] });
      setInjImportResult(data);
      toast({ title: `Imported ${data.imported} injection(s)` });
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleInjImport = () => {
    if (injImportFile) injImportMutation.mutate(injImportFile);
  };

  const handleInjDownloadSample = () => {
    window.open("/api/injections/sample-template", "_blank");
  };

  const handleInjExport = () => {
    window.open("/api/injections/export/xlsx", "_blank");
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = t("common.required");
    if (!form.category?.trim()) errors.category = t("common.required");
    if (!form.price || Number(form.price) <= 0) errors.price = t("common.required");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: t("common.fillRequired"), variant: "destructive" });
      const order = ["name", "category", "price"] as const;
      const firstKey = order.find(k => errors[k]);
      const refMap = { name: refName, category: refCategory, price: refPrice } as const;
      if (firstKey) (refMap[firstKey].current as HTMLElement | null)?.focus();
      return;
    }
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price,
      description: form.description || null,
      isActive: true,
    };
    if (editInj) {
      updateMutation.mutate({ id: editInj.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (inj: Injection) => {
    setFieldErrors({});
    setForm({
      name: inj.name,
      category: inj.category || "",
      price: inj.price,
      description: inj.description || "",
    });
    setEditInj(inj);
  };

  const filtered = injections.filter(inj => {
    const term = searchTerm.toLowerCase();
    const matchSearch = inj.name.toLowerCase().includes(term) ||
      (inj.description || "").toLowerCase().includes(term) ||
      (inj.category || "").toLowerCase().includes(term);
    const matchCategory = categoryFilter === "all" || inj.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const activeCount = injections.filter(i => i.isActive).length;
  const totalValue = injections.reduce((sum, i) => sum + parseFloat(i.price || "0"), 0);
  const uniqueCategories = Array.from(new Set(injections.map(i => i.category).filter(Boolean)));
  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const getGradient = (id: number) => injectionAvatarGradients[id % injectionAvatarGradients.length];
  const getInjCatColor = (cat: string) => injCategoryColors[cat] || defaultInjCatColor;

  const statCards = [
    { label: "Total Injections", value: injections.length, gradient: "from-cyan-500 to-cyan-600", icon: Syringe },
    { label: t("common.active"), value: activeCount, gradient: "from-emerald-500 to-emerald-600", icon: CheckCircle2 },
    { label: t("common.inactive"), value: injections.length - activeCount, gradient: "from-red-500 to-red-600", icon: XCircle },
    { label: t("services.categories"), value: uniqueCategories.length, gradient: "from-violet-500 to-violet-600", icon: Layers },
    { label: "Total Value", value: `$${totalValue.toFixed(0)}`, gradient: "from-amber-500 to-amber-600", icon: DollarSign },
  ];

  const formContent = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inj-name">Name *</Label>
        <Input ref={refName} id="inj-name" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErrors(prev => ({ ...prev, name: "" })); }} data-testid="input-injection-name" className={fieldErrors.name ? "border-destructive" : ""} />
        {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("common.category")} *</Label>
          <Select value={form.category} onValueChange={v => { setForm(f => ({ ...f, category: v })); setFieldErrors(prev => ({ ...prev, category: "" })); }}>
            <SelectTrigger ref={refCategory} data-testid="select-injection-category"><SelectValue placeholder={t("common.category")} /></SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.category && <p className="text-xs text-destructive mt-1">{fieldErrors.category}</p>}
        </div>
        <div>
          <Label htmlFor="inj-price">{t("common.price")} ($) *</Label>
          <Input ref={refPrice} id="inj-price" type="number" step="0.01" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFieldErrors(prev => ({ ...prev, price: "" })); }} data-testid="input-injection-price" className={fieldErrors.price ? "border-destructive" : ""} />
          {fieldErrors.price && <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="inj-remarks">Remarks</Label>
        <Textarea id="inj-remarks" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-injection-remarks" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} data-testid="button-inj-list-view">
            <List className="h-4 w-4 mr-1" /> List View
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("grid")} data-testid="button-inj-grid-view">
            <Grid3X3 className="h-4 w-4 mr-1" /> Grid View
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-import-injections">
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setInjImportResult(null); setInjImportFile(null); setInjImportDialogOpen(true); }} data-testid="button-inj-import-file">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Import from File
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleInjDownloadSample} data-testid="button-inj-download-sample">
              <FileDown className="h-4 w-4 mr-2" /> Download Sample File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={handleInjExport} data-testid="button-export-injections">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-inj-category-manage">
              <FolderPlus className="h-4 w-4 mr-1" /> {t("common.category")}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("services.manageCategories")}</DialogTitle>
              <DialogDescription>Add or remove injection categories</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="New category name..."
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newCategory.trim()) {
                      if (categories.includes(newCategory.trim())) {
                        toast({ title: t("common.categoryExists"), variant: "destructive" });
                        return;
                      }
                      const updated = [...categories, newCategory.trim()].sort();
                      setCategories(updated);
                      saveInjectionCategories(updated);
                      setNewCategory("");
                      toast({ title: t("common.categoryAdded") });
                    }
                  }}
                  data-testid="input-new-inj-category"
                />
                <Button
                  onClick={() => {
                    if (!newCategory.trim()) return;
                    if (categories.includes(newCategory.trim())) {
                      toast({ title: t("common.categoryExists"), variant: "destructive" });
                      return;
                    }
                    const updated = [...categories, newCategory.trim()].sort();
                    setCategories(updated);
                    saveInjectionCategories(updated);
                    setNewCategory("");
                    toast({ title: t("common.categoryAdded") });
                  }}
                  data-testid="button-add-inj-category"
                >
                  {t("common.add")}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {categories.map(cat => {
                  const cc = getInjCatColor(cat);
                  return (
                    <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${cc.dot}`} />
                        <span className="text-sm">{cat}</span>
                      </div>
                      {!DEFAULT_INJECTION_CATEGORIES.includes(cat) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = categories.filter(c => c !== cat);
                            setCategories(updated);
                            saveInjectionCategories(updated);
                            toast({ title: t("common.categoryRemoved") });
                          }}
                          data-testid={`button-remove-inj-category-${cat}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultInjForm); setFieldErrors({}); } }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-injection">
              <Plus className="h-4 w-4 mr-1" /> Add Injection
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Injection</DialogTitle>
              <DialogDescription>Create a new injection item with name, price and remarks.</DialogDescription>
            </DialogHeader>
            {formContent}
            <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-injection">
              {createMutation.isPending ? t("common.creating") : "Add Injection"}
            </Button>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s, i) => (
          <Card key={i} data-testid={`stat-inj-${i}`}>
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

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-64">
                <Input
                  placeholder="Search injections..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  data-testid="input-search-injections"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-inj-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("common.showing")} <span className="font-semibold text-foreground">{filtered.length}</span> {t("common.of")} {injections.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border rounded-md">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} data-testid="button-clear-inj-selection">
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-injections">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Syringe className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t("common.noData")}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your first injection to get started</p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left w-10">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} data-testid="checkbox-select-all-inj" />
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("common.category")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("common.price")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">{t("common.status")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Remarks</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inj => {
                  const catColor = getInjCatColor(inj.category);
                  return (
                    <tr key={inj.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors" data-testid={`row-injection-${inj.id}`}>
                      <td className="p-3">
                        <Checkbox checked={selectedIds.has(inj.id)} onCheckedChange={() => toggleSelect(inj.id)} data-testid={`checkbox-inj-${inj.id}`} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={`text-[10px] font-bold bg-gradient-to-br ${getGradient(inj.id)} text-white`}>
                              {getInitials(inj.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold" data-testid={`text-injection-name-${inj.id}`}>{inj.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${catColor.bg} ${catColor.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${catColor.dot}`} />
                          {inj.category}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" data-testid={`text-injection-price-${inj.id}`}>
                          <DollarSign className="h-3 w-3" />{inj.price}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${inj.isActive ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${inj.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {inj.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground line-clamp-1">{inj.description || "-"}</span>
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-inj-actions-${inj.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewInj(inj)} className="gap-2" data-testid={`action-view-inj-${inj.id}`}>
                              <Eye className="h-3.5 w-3.5 text-blue-500" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(inj)} className="gap-2" data-testid={`action-edit-inj-${inj.id}`}>
                              <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteInj(inj)} className="text-destructive gap-2" data-testid={`action-delete-inj-${inj.id}`}>
                              <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(inj => {
            const catColor = getInjCatColor(inj.category);
            return (<Card key={inj.id} className="overflow-visible hover-elevate" data-testid={`card-injection-${inj.id}`}>
              <CardContent className="p-0">
                <div className={`h-1.5 rounded-t-md bg-gradient-to-r ${["from-cyan-500 to-teal-500", "from-blue-500 to-indigo-500", "from-emerald-500 to-green-500", "from-violet-500 to-purple-500"][inj.id % 4]}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Checkbox checked={selectedIds.has(inj.id)} onCheckedChange={() => toggleSelect(inj.id)} className="absolute -top-1 -left-1 z-10" data-testid={`checkbox-inj-${inj.id}`} />
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getGradient(inj.id)} text-white`}>
                            {getInitials(inj.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate" data-testid={`text-injection-name-${inj.id}`}>{inj.name}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-0.5 no-default-hover-elevate no-default-active-elevate ${catColor.bg} ${catColor.text}`}
                        >
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${catColor.dot}`} />
                          {inj.category}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-inj-actions-${inj.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewInj(inj)} className="gap-2" data-testid={`action-view-inj-${inj.id}`}>
                          <Eye className="h-3.5 w-3.5 text-blue-500" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(inj)} className="gap-2" data-testid={`action-edit-inj-${inj.id}`}>
                          <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteInj(inj)} className="text-destructive gap-2" data-testid={`action-delete-inj-${inj.id}`}>
                          <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {inj.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{inj.description}</p>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                        <DollarSign className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400" data-testid={`text-injection-price-${inj.id}`}>${inj.price}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                        inj.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                      }`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${inj.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {inj.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewInj} onOpenChange={(open) => { if (!open) setViewInj(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-view-injection-title">Injection Details</DialogTitle>
            <DialogDescription>View injection information</DialogDescription>
          </DialogHeader>
          {viewInj && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`text-sm font-bold bg-gradient-to-br ${getGradient(viewInj.id)} text-white`}>
                    {getInitials(viewInj.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{viewInj.name}</h3>
                  {(() => { const vc = getInjCatColor(viewInj.category); return (
                  <Badge variant="outline" className={`text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate ${vc.bg} ${vc.text}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${vc.dot}`} />
                    {viewInj.category}
                  </Badge>
                  ); })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                    <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("common.price")}</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${viewInj.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                    <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t("common.status")}</p>
                    <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${viewInj.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${viewInj.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      {viewInj.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>
                </div>
              </div>
              {viewInj.description && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Remarks</p>
                  </div>
                  <p className="text-sm bg-muted/50 rounded-md p-2.5">{viewInj.description}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setViewInj(null); openEdit(viewInj); }} data-testid="button-view-to-edit-inj">
                  <Pencil className="h-4 w-4 mr-1 text-amber-500" /> {t("common.edit")}
                </Button>
                <Button variant="outline" onClick={() => setViewInj(null)} data-testid="button-close-view-inj">
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editInj} onOpenChange={(open) => { if (!open) { setEditInj(null); setForm(defaultInjForm); setFieldErrors({}); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-injection-title">Edit Injection</DialogTitle>
            <DialogDescription>Update injection details</DialogDescription>
          </DialogHeader>
          {formContent}
          <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-injection">
            {updateMutation.isPending ? t("common.updating") : t("common.update")}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteInj} onOpenChange={(open) => { if (!open) setDeleteInj(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-inj-confirm">Delete Injection</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmPrefix")} <span className="font-semibold">{deleteInj?.name}</span>? {t("common.cannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-inj">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInj && deleteMutation.mutate(deleteInj.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-inj"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={injImportDialogOpen} onOpenChange={setInjImportDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Injections</DialogTitle>
            <DialogDescription>Upload an Excel file with Name and Price columns to import injections.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-md p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Select an Excel file (.xlsx)</p>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={e => { setInjImportFile(e.target.files?.[0] || null); setInjImportResult(null); }}
                className="max-w-xs mx-auto"
                data-testid="input-inj-import-file"
              />
              {injImportFile && (
                <p className="text-sm text-muted-foreground mt-2">{injImportFile.name}</p>
              )}
            </div>

            {injImportResult && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{injImportResult.imported} imported</span>
                  </div>
                  {injImportResult.skipped > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{injImportResult.skipped} skipped</span>
                    </div>
                  )}
                </div>
                {injImportResult.errors.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                    {injImportResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleInjDownloadSample} data-testid="button-inj-download-sample-dialog">
                <FileDown className="h-4 w-4 mr-1" /> Download Sample File
              </Button>
              <Button onClick={handleInjImport} disabled={!injImportFile || injImportMutation.isPending} data-testid="button-submit-inj-import">
                {injImportMutation.isPending ? "Importing..." : "Import Injections"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ServicesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"services" | "injections">("services");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [viewService, setViewService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const refName = useRef<HTMLInputElement>(null);
  const refCategory = useRef<HTMLButtonElement>(null);
  const refPrice = useRef<HTMLInputElement>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(getServiceCategories());
  const [newCategory, setNewCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: t("services.createdSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditService(null);
      setForm(defaultForm);
      toast({ title: t("services.updatedSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: t("services.deleted") });
      setDeleteService(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/services/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} service(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteBulkConfirm(true);
  };

  const toggleServiceSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAllServices = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)));
    }
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/services/import", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setImportResult(result);
      setImportFile(null);
      toast({ title: `${result.imported} service(s) imported successfully` });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const handleExport = async (format: "xlsx" | "pdf") => {
    try {
      await downloadFile(`/api/services/export/${format}`, format === "pdf" ? "services.pdf" : "services.xlsx");
      toast({ title: t("common.downloadStarted") ?? "Download started" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile("/api/services/sample-template", "service_import_template.xlsx");
      toast({ title: t("common.downloadStarted") ?? "Download started" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = t("common.required");
    if (!form.category?.trim()) errors.category = t("common.required");
    if (!form.price || Number(form.price) <= 0) errors.price = t("common.required");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: t("common.fillRequired"), variant: "destructive" });
      const order = ["name", "category", "price"] as const;
      const firstKey = order.find(k => errors[k]);
      const refMap = { name: refName, category: refCategory, price: refPrice } as const;
      if (firstKey) (refMap[firstKey].current as HTMLElement | null)?.focus();
      return;
    }
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      isActive: true,
      isLabTest: form.isLabTest,
      sampleCollectionRequired: form.sampleCollectionRequired,
      sampleType: form.isLabTest ? form.sampleType : null,
      reportParameters: form.isLabTest && form.reportParameters?.length
        ? form.reportParameters.filter(p => (p.parameter || "").trim())
        : null,
    };
    if (editService) {
      updateMutation.mutate({ id: editService.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (svc: Service) => {
    setFieldErrors({});
    const s = svc as Service & { isLabTest?: boolean; sampleCollectionRequired?: boolean; sampleType?: string; reportParameters?: ReportParam[] };
    setForm({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      description: svc.description || "",
      imageUrl: svc.imageUrl || "",
      isLabTest: s.isLabTest ?? false,
      sampleCollectionRequired: s.sampleCollectionRequired ?? false,
      sampleType: s.sampleType || "Blood",
      reportParameters: Array.isArray(s.reportParameters) ? s.reportParameters : [],
    });
    setEditService(svc);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    toast({ title: t("common.dataRefreshed") });
  };

  const parseCategories = (cat: string) => cat.split(",").map(c => c.trim()).filter(Boolean);
  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "all" || parseCategories(s.category).includes(categoryFilter);
    return matchSearch && matchCategory;
  });

  const activeCount = services.filter(s => s.isActive).length;
  const inactiveCount = services.filter(s => !s.isActive).length;
  const uniqueCategories = Array.from(new Set(services.flatMap(s => parseCategories(s.category)))).sort();
  const allCategoriesForForm = Array.from(new Set([...categories, ...uniqueCategories, ...services.map(s => s.category).filter(Boolean)])).sort();
  const categoriesToShowInModal = Array.from(new Set([...categories, ...uniqueCategories])).sort();
  const totalValue = services.reduce((sum, s) => sum + parseFloat(s.price || "0"), 0);

  const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];
  const getCatColor = (cat: string) => categoryColors[cat] || defaultCategoryColor;
  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const statCards = [
    { label: t("services.totalServices"), value: services.length, gradient: "from-blue-500 to-blue-600", icon: Activity },
    { label: t("common.active"), value: activeCount, gradient: "from-emerald-500 to-emerald-600", icon: CheckCircle2 },
    { label: t("common.inactive"), value: inactiveCount, gradient: "from-red-500 to-red-600", icon: XCircle },
    { label: t("services.categories"), value: uniqueCategories.length, gradient: "from-violet-500 to-violet-600", icon: Layers },
    { label: t("common.total"), value: `$${totalValue.toFixed(0)}`, gradient: "from-amber-500 to-amber-600", icon: DollarSign },
  ];

  const cardTopGradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-amber-500 to-orange-500",
    "from-indigo-500 to-blue-500",
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <Label htmlFor="svc-name">{t("services.serviceName")} *</Label>
          <Input ref={refName} id="svc-name" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErrors(prev => ({ ...prev, name: "" })); }} data-testid="input-service-name" className={fieldErrors.name ? "border-destructive" : ""} />
          {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.category")} *</Label>
            <Select value={form.category} onValueChange={v => { setForm(f => ({ ...f, category: v })); setFieldErrors(prev => ({ ...prev, category: "" })); }}>
              <SelectTrigger ref={refCategory} data-testid="select-service-category"><SelectValue placeholder={t("common.category")} /></SelectTrigger>
              <SelectContent>
                {allCategoriesForForm.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.category && <p className="text-xs text-destructive mt-1">{fieldErrors.category}</p>}
          </div>
          <div>
            <Label htmlFor="svc-price">{t("common.price")} ($) *</Label>
            <Input ref={refPrice} id="svc-price" type="number" step="0.01" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFieldErrors(prev => ({ ...prev, price: "" })); }} data-testid="input-service-price" className={fieldErrors.price ? "border-destructive" : ""} />
            {fieldErrors.price && <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="svc-description">{t("common.description")}</Label>
          <Textarea id="svc-description" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-service-description" />
        </div>
        <div className="flex items-center gap-4 space-y-0">
          <div className="flex items-center gap-2">
            <Checkbox id="svc-isLabTest" checked={form.isLabTest} onCheckedChange={v => setForm(f => ({ ...f, isLabTest: !!v }))} />
            <Label htmlFor="svc-isLabTest" className="cursor-pointer text-sm font-normal">Lab Test (creates lab request when added to bill)</Label>
          </div>
          {form.isLabTest && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox id="svc-sampleRequired" checked={form.sampleCollectionRequired} onCheckedChange={v => setForm(f => ({ ...f, sampleCollectionRequired: !!v }))} />
                <Label htmlFor="svc-sampleRequired" className="cursor-pointer text-sm font-normal">Sample collection required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Sample type</Label>
                <Select value={form.sampleType} onValueChange={v => setForm(f => ({ ...f, sampleType: v }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Blood", "Urine", "Stool", "Sputum", "Swab", "Tissue", "CSF", "Saliva", "Serum", "Plasma", "Other"].map(st => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 mt-2">
                <Label className="text-sm font-medium">Report Parameters</Label>
                <p className="text-xs text-muted-foreground mb-2">Configure parameters for manual test result entry. Unit can be manual text or dropdown selector.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {(form.reportParameters || []).map((p, i) => (
                    <div key={i} className="flex gap-2 items-start flex-wrap">
                      <Input placeholder="Parameter (e.g. Glucose)" value={p.parameter} onChange={e => {
                        const arr = [...(form.reportParameters || [])];
                        arr[i] = { ...arr[i], parameter: e.target.value };
                        setForm(f => ({ ...f, reportParameters: arr }));
                      }} className="flex-1 min-w-[120px]" />
                      <Select value={p.unitType || "text"} onValueChange={(v: "text" | "select") => {
                        const arr = [...(form.reportParameters || [])];
                        arr[i] = { ...arr[i], unitType: v, unitOptions: v === "select" ? COMMON_LAB_UNITS : undefined };
                        setForm(f => ({ ...f, reportParameters: arr }));
                      }}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Manual</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                      {p.unitType === "select" ? (
                        <Select value={p.unit} onValueChange={v => {
                          const arr = [...(form.reportParameters || [])];
                          arr[i] = { ...arr[i], unit: v };
                          setForm(f => ({ ...f, reportParameters: arr }));
                        }}>
                          <SelectTrigger className="w-28"><SelectValue placeholder="Unit" /></SelectTrigger>
                          <SelectContent>
                            {COMMON_LAB_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="Unit" value={p.unit} onChange={e => {
                          const arr = [...(form.reportParameters || [])];
                          arr[i] = { ...arr[i], unit: e.target.value };
                          setForm(f => ({ ...f, reportParameters: arr }));
                        }} className="w-24" />
                      )}
                      <Input placeholder="Normal Range" value={p.normalRange} onChange={e => {
                        const arr = [...(form.reportParameters || [])];
                        arr[i] = { ...arr[i], normalRange: e.target.value };
                        setForm(f => ({ ...f, reportParameters: arr }));
                      }} className="w-28" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setForm(f => ({ ...f, reportParameters: (f.reportParameters || []).filter((_, j) => j !== i) }))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, reportParameters: [...(f.reportParameters || []), { parameter: "", unit: "", normalRange: "", unitType: "text" }] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Parameter
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
          <ImagePlus className="h-4 w-4" />
          {t("services.uploadImage")} <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
        </div>
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            <div className="relative group">
              <img
                src={form.imageUrl}
                alt="Service"
                className="w-20 h-20 object-cover rounded-md border"
                data-testid="img-service-preview"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ visibility: form.imageUrl ? "visible" : "hidden" }}
                onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                data-testid="button-remove-image"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 cursor-pointer hover-elevate"
              data-testid="label-upload-image"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">{t("common.upload")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-service-image"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: t("common.imageTooLarge"), description: t("common.maxSize2MB"), variant: "destructive" });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setForm(f => ({ ...f, imageUrl: ev.target?.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{t("services.uploadServicePhoto")}</p>
            <p>{t("common.maxSizeHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServiceCard = (svc: Service) => {
    const cats = parseCategories(svc.category);
    const topGrad = cardTopGradients[svc.id % cardTopGradients.length];

    return (
      <Card key={svc.id} className="overflow-visible hover-elevate" data-testid={`card-service-${svc.id}`}>
        <CardContent className="p-0">
          <div className={`h-1.5 rounded-t-md bg-gradient-to-r ${topGrad}`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.has(svc.id)}
                  onCheckedChange={() => toggleServiceSelection(svc.id)}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  data-testid={`checkbox-service-${svc.id}`}
                />
                <div className="flex items-center gap-2.5">
                  {svc.imageUrl ? (
                    <img src={svc.imageUrl} alt={svc.name} className="w-10 h-10 rounded-md object-cover border" data-testid={`img-service-thumb-${svc.id}`} />
                  ) : (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(svc.id)} text-white`}>
                        {getInitials(svc.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate" data-testid={`text-service-name-${svc.id}`}>{svc.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {cats.length > 0 ? cats.map(c => {
                        const cc = getCatColor(c);
                        return (
                          <Badge
                            key={c}
                            variant="outline"
                            className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${cc.bg} ${cc.text}`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${cc.dot}`} />
                            {c}
                          </Badge>
                        );
                      }) : (
                        <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${defaultCategoryColor.bg} ${defaultCategoryColor.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${defaultCategoryColor.dot}`} />
                          {svc.category || "-"}
                        </Badge>
                      )}
                      {(svc as Service & { isLabTest?: boolean }).isLabTest && (
                        <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20">
                          Lab Test
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${svc.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewService(svc)} className="gap-2" data-testid={`action-view-${svc.id}`}>
                    <Eye className="h-3.5 w-3.5 text-blue-500" /> {t("services.viewDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(svc)} className="gap-2" data-testid={`action-edit-${svc.id}`}>
                    <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteService(svc)} className="text-destructive gap-2" data-testid={`action-delete-${svc.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {svc.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                  <DollarSign className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400" data-testid={`text-service-price-${svc.id}`}>${svc.price}</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                  svc.isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                }`}
                data-testid={`badge-status-${svc.id}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${svc.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {svc.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderServiceListItem = (svc: Service) => {
    const cats = parseCategories(svc.category);

    return (
      <Card key={svc.id} className="overflow-visible hover-elevate" data-testid={`card-service-${svc.id}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.has(svc.id)}
              onCheckedChange={() => toggleServiceSelection(svc.id)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              data-testid={`checkbox-service-${svc.id}`}
            />
            {svc.imageUrl ? (
              <img src={svc.imageUrl} alt={svc.name} className="w-10 h-10 rounded-md object-cover border shrink-0" />
            ) : (
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(svc.id)} text-white`}>
                  {getInitials(svc.name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold truncate" data-testid={`text-service-name-${svc.id}`}>{svc.name}</h4>
                {cats.length > 0 ? cats.map(c => {
                  const cc = getCatColor(c);
                  return (
                    <Badge key={c} variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${cc.bg} ${cc.text}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${cc.dot}`} />
                      {c}
                    </Badge>
                  );
                }) : (
                  <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${defaultCategoryColor.bg} ${defaultCategoryColor.text}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${defaultCategoryColor.dot}`} />
                    {svc.category || "-"}
                  </Badge>
                )}
                {(svc as Service & { isLabTest?: boolean }).isLabTest && (
                  <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20">
                    Lab Test
                  </Badge>
                )}
              </div>
              {svc.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{svc.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${svc.price}</span>
              <Badge
                variant="outline"
                className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                  svc.isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${svc.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {svc.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${svc.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewService(svc)} className="gap-2" data-testid={`action-view-${svc.id}`}>
                    <Eye className="h-3.5 w-3.5 text-blue-500" /> {t("services.viewDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(svc)} className="gap-2" data-testid={`action-edit-${svc.id}`}>
                    <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteService(svc)} className="text-destructive gap-2" data-testid={`action-delete-${svc.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (activeTab === "injections") {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("services")}
              className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
              data-testid="tab-services"
            >
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                Services
              </div>
            </button>
            <button
              onClick={() => setActiveTab("injections")}
              className="px-4 py-2.5 text-sm font-medium border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400 transition-colors"
              data-testid="tab-injections"
            >
              <div className="flex items-center gap-1.5">
                <Syringe className="h-4 w-4" />
                Injections
              </div>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <InjectionManagement />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("services.title")}
        description={t("services.subtitle")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-category-manage">
                  <FolderPlus className="h-4 w-4 mr-1" /> {t("common.category")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("services.manageCategories")}</DialogTitle>
                  <DialogDescription>{t("services.manageCategoriesDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("services.newCategoryPlaceholder")}
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newCategory.trim()) {
                          if (categoriesToShowInModal.includes(newCategory.trim())) {
                            toast({ title: t("common.categoryExists"), variant: "destructive" });
                            return;
                          }
                          const updated = [...categories, newCategory.trim()].sort();
                          setCategories(updated);
                          saveServiceCategories(updated);
                          setNewCategory("");
                          toast({ title: t("common.categoryAdded") });
                        }
                      }}
                      data-testid="input-new-category"
                    />
                    <Button
                      onClick={() => {
                        if (!newCategory.trim()) return;
                        if (categoriesToShowInModal.includes(newCategory.trim())) {
                          toast({ title: t("common.categoryExists"), variant: "destructive" });
                          return;
                        }
                        const updated = [...categories, newCategory.trim()].sort();
                        setCategories(updated);
                        saveServiceCategories(updated);
                        setNewCategory("");
                        toast({ title: t("common.categoryAdded") });
                      }}
                      data-testid="button-add-category"
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {categoriesToShowInModal.map(cat => {
                      const cc = getCatColor(cat);
                      const canRemove = categories.includes(cat) && !DEFAULT_SERVICE_CATEGORIES.includes(cat);
                      return (
                        <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${cc.dot}`} />
                            <span className="text-sm">{cat}</span>
                            {uniqueCategories.includes(cat) && !categories.includes(cat) && (
                              <span className="text-[10px] text-muted-foreground">(used by services)</span>
                            )}
                          </div>
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = categories.filter(c => c !== cat);
                                setCategories(updated);
                                saveServiceCategories(updated);
                                toast({ title: t("common.categoryRemoved") });
                              }}
                              data-testid={`button-remove-category-${cat}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-import-services">
                  <Upload className="h-4 w-4 mr-1" /> Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setImportResult(null); setImportFile(null); setImportDialogOpen(true); }} data-testid="button-import-file">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import from File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownloadTemplate} data-testid="button-download-template">
                  <FileDown className="h-4 w-4 mr-2" /> Download Sample File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-export-services">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} data-testid="button-export-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-pdf">
                  <FileText className="h-4 w-4 mr-2" /> Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultForm); setFieldErrors({}); } }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-service">
                  <Plus className="h-4 w-4 mr-1" /> {t("services.addService")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{t("services.addService")}</DialogTitle>
                  <DialogDescription>{t("services.subtitle")}</DialogDescription>
                </DialogHeader>
                {formContent}
                <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-service">
                  {createMutation.isPending ? t("common.creating") : t("services.addService")}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="border-b px-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("services")}
            className="px-4 py-2.5 text-sm font-medium border-b-2 border-primary text-primary transition-colors"
            data-testid="tab-services"
          >
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              Services
            </div>
          </button>
          <button
            onClick={() => setActiveTab("injections")}
            className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
            data-testid="tab-injections"
          >
            <div className="flex items-center gap-1.5">
              <Syringe className="h-4 w-4" />
              Injections
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s, i) => (
            <Card key={i} data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
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

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-64">
                  <SearchInputWithBarcode
                    placeholder={t("services.searchServices")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={(v) => setSearchTerm(v)}
                    data-testid="input-search-services"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")} {t("services.categories")}</SelectItem>
                    {categoriesToShowInModal.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`toggle-elevate ${viewMode === "grid" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`toggle-elevate ${viewMode === "list" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("common.showing")} <span className="font-semibold text-foreground">{filtered.length}</span> {t("common.of")} {services.length} {t("sidebar.services")}
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-primary/5 border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onCheckedChange={toggleAllServices}
                data-testid="checkbox-select-all-services"
              />
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-services">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("common.noData")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("services.addFirstService")}</p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(renderServiceCard)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(renderServiceListItem)}
          </div>
        )}
      </div>

      <Dialog open={!!viewService} onOpenChange={(open) => { if (!open) setViewService(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="text-view-service-title">{t("services.viewDetails")}</DialogTitle>
            <DialogDescription>{t("services.subtitle")}</DialogDescription>
          </DialogHeader>
          {viewService && (() => {
            const viewCats = parseCategories(viewService.category);
            return (
              <div className="space-y-4">
                {viewService.imageUrl && (
                  <div className="w-full h-40 rounded-md overflow-hidden">
                    <img src={viewService.imageUrl} alt={viewService.name} className="w-full h-full object-cover" data-testid="img-service-detail" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {!viewService.imageUrl && (
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`text-sm font-bold bg-gradient-to-br ${getAvatarGradient(viewService.id)} text-white`}>
                        {getInitials(viewService.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <h3 className="font-semibold">{viewService.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewCats.length > 0 ? viewCats.map(c => {
                        const cc = getCatColor(c);
                        return (
                          <Badge key={c} variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${cc.bg} ${cc.text}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${cc.dot}`} />
                            {c}
                          </Badge>
                        );
                      }) : (
                        <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${defaultCategoryColor.bg} ${defaultCategoryColor.text}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${defaultCategoryColor.dot}`} />
                          {viewService.category || "-"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                      <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.price")}</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${viewService.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                      <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.status")}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                          viewService.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                        }`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${viewService.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {viewService.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
                      <Tag className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.category")}</p>
                      <p className="text-sm font-medium">{viewService.category}</p>
                    </div>
                  </div>
                </div>
                {viewService.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("common.description")}</p>
                    </div>
                    <p className="text-sm bg-muted/50 rounded-md p-2.5">{viewService.description}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => {
                    setViewService(null);
                    openEdit(viewService);
                  }} data-testid="button-view-to-edit">
                    <Pencil className="h-4 w-4 mr-1 text-amber-500" /> {t("common.edit")}
                  </Button>
                  <Button variant="outline" onClick={() => setViewService(null)} data-testid="button-close-view">
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editService} onOpenChange={(open) => { if (!open) { setEditService(null); setForm(defaultForm); setFieldErrors({}); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-service-title">{t("services.editService")}</DialogTitle>
            <DialogDescription>{t("services.subtitle")}</DialogDescription>
          </DialogHeader>
          {formContent}
          <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-service">
            {updateMutation.isPending ? t("common.updating") : t("common.update")}
          </Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteBulkConfirm}
        onOpenChange={setDeleteBulkConfirm}
        title={t("common.delete") || "Delete services"}
        description={`Delete ${selectedIds.size} selected service(s)? This cannot be undone.`}
        confirmLabel={t("common.delete") || "Delete"}
        cancelLabel={t("common.cancel") || "Cancel"}
        variant="destructive"
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
      />

      <AlertDialog open={!!deleteService} onOpenChange={(open) => { if (!open) setDeleteService(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">{t("services.deleteService")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmPrefix")} <span className="font-semibold">{deleteService?.name}</span>? {t("common.cannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteService && deleteMutation.mutate(deleteService.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportFile(null); setImportResult(null); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle data-testid="text-import-title">Import Services</DialogTitle>
            <DialogDescription>Upload an Excel (.xlsx) or CSV file with service data. The file should have columns: Service Name, Category, Price.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-md p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-500">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {importFile ? importFile.name : "Choose a file to import"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv, .pdf files</p>
              </div>
              <div>
                <label htmlFor="import-file-input">
                  <Button variant="outline" size="sm" asChild>
                    <span>{importFile ? "Change File" : "Browse Files"}</span>
                  </Button>
                </label>
                <input
                  id="import-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setImportFile(file); setImportResult(null); }
                    e.target.value = "";
                  }}
                  data-testid="input-import-file"
                />
              </div>
            </div>

            {importResult && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{importResult.imported} imported</span>
                  </div>
                  {importResult.skipped > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{importResult.skipped} skipped</span>
                    </div>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} data-testid="button-download-template-dialog">
                <FileDown className="h-4 w-4 mr-1" /> Download Sample File
              </Button>
              <Button onClick={handleImport} disabled={!importFile || importMutation.isPending} data-testid="button-submit-import">
                {importMutation.isPending ? "Importing..." : "Import Services"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
