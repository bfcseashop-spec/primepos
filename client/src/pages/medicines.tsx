import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, downloadFile } from "@/lib/queryClient";
import {
  Plus, Search, AlertTriangle, Package, Pill, TrendingUp, DollarSign,
  Box, Droplets, FlaskConical, MoreHorizontal, Eye, Pencil, Trash2,
  Calculator, ShieldAlert, CheckCircle2, X,
  List, LayoutGrid, RefreshCw, Tag, FolderPlus, Printer, Barcode,
  PackageX, PackageCheck, Filter, ImagePlus, Trash,
  Upload, Download, FileSpreadsheet, FileText, FileDown,
  History
} from "lucide-react";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { Medicine, StockAdjustment } from "@shared/schema";

const MEDICINE_CATEGORIES = [
  "Tablet", "Capsule", "Syrup", "Injection", "Cream",
  "Ointment", "Drops", "Inhaler", "Powder", "Other"
];

const UNIT_TYPES = [
  { value: "Box", label: "Box", icon: Box },
  { value: "Pieces", label: "Pieces", icon: Pill },
  { value: "Liter", label: "Liter", icon: Droplets },
  { value: "Jar", label: "Jar", icon: FlaskConical },
  { value: "Bottle", label: "Bottle", icon: Droplets },
  { value: "Tube", label: "Tube", icon: Package },
  { value: "Pack", label: "Pack", icon: Package },
];

const defaultForm = {
  name: "", category: "", manufacturer: "",
  batchNo: "", expiryDate: "", unit: "Box",
  unitCount: 1, boxPrice: 0, qtyPerBox: 1,
  sellingPrice: 0,
  stockAlert: 10, imageUrl: "",
};

export default function MedicinesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [viewMed, setViewMed] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const refName = useRef<HTMLInputElement>(null);
  const refUnit = useRef<HTMLButtonElement>(null);
  const refUnitCount = useRef<HTMLInputElement>(null);
  const refBoxPrice = useRef<HTMLInputElement>(null);
  const refQtyPerBox = useRef<HTMLInputElement>(null);
  const refSellingPrice = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("medicine_custom_categories");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newCategory, setNewCategory] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [adjustStockMed, setAdjustStockMed] = useState<Medicine | null>(null);
  const [adjustStockMode, setAdjustStockMode] = useState<"set" | "add" | "subtract">("add");
  const [adjustStockValue, setAdjustStockValue] = useState("");
  const [adjustStockReason, setAdjustStockReason] = useState("");
  const [stockHistoryMed, setStockHistoryMed] = useState<Medicine | null>(null);

  const allCategories = [...MEDICINE_CATEGORIES, ...customCategories];

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      await downloadFile(`/api/medicines/export/${format}`, format === "csv" ? "medicines.csv" : "medicines.xlsx");
      toast({ title: t("common.downloadStarted") ?? "Download started" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile("/api/medicines/sample-template", "medicine_import_template.xlsx");
      toast({ title: t("common.downloadStarted") ?? "Download started" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/medicines/import", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
        toast({ title: t("medicines.importedCount", { count: data.imported }), description: data.skipped > 0 ? t("medicines.rowsSkipped", { count: data.skipped }) : undefined });
      } else {
        toast({ title: t("medicines.importFailed"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("medicines.importFailed"), variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: stockHistory = [], isLoading: stockHistoryLoading } = useQuery<StockAdjustment[]>({
    queryKey: ["/api/medicines", stockHistoryMed?.id ?? "", "stock-history"],
    enabled: !!stockHistoryMed?.id,
  });

  const perMedPrice = form.qtyPerBox > 0 ? form.boxPrice / form.qtyPerBox : 0;
  const totalPurchasePrice = form.unitCount * form.boxPrice;
  const sellingPricePerUnit = Number(form.sellingPrice) >= 0 ? Number(form.sellingPrice) : 0;
  const sellingPricePerPiece = form.qtyPerBox > 0 ? sellingPricePerUnit / form.qtyPerBox : 0;
  const formTotalSalesValue = sellingPricePerUnit * form.unitCount;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/medicines", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: t("medicines.createdSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/medicines/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setEditMed(null);
      setForm(defaultForm);
      toast({ title: t("medicines.updatedSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ title: t("medicines.deleted") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, stockCount, reason, adjustmentType }: { id: number; stockCount: number; reason?: string; adjustmentType?: "set" | "add" | "subtract" }) => {
      const res = await apiRequest("PATCH", `/api/medicines/${id}`, { stockCount, reason: reason || undefined, adjustmentType });
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines", id, "stock-history"] });
      setAdjustStockMed(null);
      setAdjustStockValue("");
      setAdjustStockReason("");
      toast({ title: "Stock updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/medicines/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} medicine(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected medicine(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (allCategories.includes(trimmed)) {
      toast({ title: t("common.categoryExists"), variant: "destructive" });
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem("medicine_custom_categories", JSON.stringify(updated));
    setNewCategory("");
    toast({ title: t("common.categoryAdded") });
  };

  const removeCategory = (cat: string) => {
    const updated = customCategories.filter(c => c !== cat);
    setCustomCategories(updated);
    localStorage.setItem("medicine_custom_categories", JSON.stringify(updated));
    toast({ title: t("common.categoryRemoved") });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: t("medicines.refreshed") });
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = t("common.required");
    if (!form.unit?.trim()) errors.unit = t("common.required");
    if (form.unitCount == null || form.unitCount < 1) errors.unitCount = t("common.required");
    if (form.boxPrice == null || Number(form.boxPrice) < 0) errors.boxPrice = t("common.required");
    if (form.qtyPerBox == null || form.qtyPerBox < 1) errors.qtyPerBox = t("common.required");
    if (form.sellingPrice == null || Number(form.sellingPrice) < 0) errors.sellingPrice = t("common.required");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: t("common.fillRequired"), variant: "destructive" });
      const order = ["name", "unit", "unitCount", "boxPrice", "qtyPerBox", "sellingPrice"] as const;
      const firstKey = order.find(k => errors[k]);
      const refMap = { name: refName, unit: refUnit, unitCount: refUnitCount, boxPrice: refBoxPrice, qtyPerBox: refQtyPerBox, sellingPrice: refSellingPrice } as const;
      if (firstKey) (refMap[firstKey].current as HTMLElement | null)?.focus();
      return;
    }

    const payload = {
      name: form.name,
      genericName: null,
      category: form.category || null,
      manufacturer: form.manufacturer || null,
      batchNo: form.batchNo || null,
      expiryDate: form.expiryDate || null,
      unit: form.unit,
      unitCount: form.unitCount,
      boxPrice: String(form.boxPrice),
      qtyPerBox: form.qtyPerBox,
      perMedPrice: String(perMedPrice.toFixed(4)),
      totalPurchasePrice: String(totalPurchasePrice.toFixed(2)),
      sellingPriceLocal: String(sellingPricePerPiece.toFixed(2)),
      sellingPriceForeigner: String(sellingPricePerPiece.toFixed(2)),
      stockCount: form.unitCount * form.qtyPerBox,
      stockAlert: form.stockAlert,
      imageUrl: form.imageUrl || null,
      quantity: form.unitCount * form.qtyPerBox,
      unitPrice: String(perMedPrice.toFixed(2)),
      sellingPrice: String(sellingPricePerPiece.toFixed(2)),
      isActive: true,
    };

    if (editMed) {
      updateMutation.mutate({ id: editMed.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (med: Medicine) => {
    setFieldErrors({});
    setForm({
      name: med.name,
      category: med.category || "",
      manufacturer: med.manufacturer || "",
      batchNo: med.batchNo || "",
      expiryDate: med.expiryDate || "",
      unit: med.unit || "Box",
      unitCount: med.unitCount || 1,
      boxPrice: Number(med.boxPrice) || 0,
      qtyPerBox: med.qtyPerBox || 1,
      sellingPrice: (Number(med.sellingPriceLocal ?? med.sellingPrice ?? med.sellingPriceForeigner) || 0) * (med.qtyPerBox || 1),
      stockAlert: med.stockAlert || 10,
      imageUrl: med.imageUrl || "",
    });
    setEditMed(med);
  };

  const applyImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const resolved = trimmed.startsWith("http") || trimmed.startsWith("data:") || trimmed.startsWith("/")
      ? trimmed
      : trimmed.startsWith("//")
        ? "https:" + trimmed
        : "https://" + trimmed;
    setForm(f => ({ ...f, imageUrl: resolved }));
  };

  const filtered = medicines.filter(m => {
    const matchesSearch = searchTerm === "" ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (m.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (m.batchNo?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;

    const isLowItem = m.stockCount < (m.stockAlert || 10) && m.stockCount > 0;
    const isOutItem = m.stockCount === 0;
    const isInItem = m.stockCount >= (m.stockAlert || 10);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in_stock" && isInItem) ||
      (statusFilter === "low_stock" && isLowItem) ||
      (statusFilter === "out_of_stock" && isOutItem);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStock = medicines.filter(m => m.stockCount < (m.stockAlert || 10) && m.stockCount > 0 && m.isActive);
  const outOfStock = medicines.filter(m => m.stockCount === 0);
  const inStock = medicines.filter(m => m.stockCount >= (m.stockAlert || 10));
  const totalMeds = medicines.length;
  const totalPurchaseValue = medicines.reduce((sum, m) => sum + Number(m.totalPurchasePrice || 0), 0);
  const totalSalesValue = medicines.reduce((sum, m) => sum + (Number(m.sellingPriceLocal || 0) * m.stockCount), 0);
  const usedCategories = Array.from(new Set(medicines.map(m => m.category).filter(Boolean))) as string[];

  const generateBarcodeHtml = (med: Medicine) => {
    const code = med.batchNo || `MED-${String(med.id).padStart(6, "0")}`;
    return `
      <div style="text-align:center;margin:16px 0;">
        <div style="font-family:'Libre Barcode 128',monospace;font-size:72px;letter-spacing:2px;">${code}</div>
        <div style="font-family:monospace;font-size:14px;margin-top:8px;letter-spacing:3px;">${code}</div>
        <div style="margin-top:6px;font-size:12px;color:#666;">$${Number(med.sellingPriceLocal || 0).toFixed(2)}</div>
      </div>
    `;
  };

  const handlePrint = (med: Medicine) => {
    const printWindow = window.open("", "_blank", "width=450,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Print Label - ${med.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
        body{font-family:Arial,sans-serif;padding:20px;margin:0;}
        .label{border:2px solid #000;padding:16px;max-width:380px;margin:0 auto;}
        h2{margin:0 0 8px;font-size:18px;}
        .row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #eee;}
        .row:last-child{border:none;} .lbl{color:#666;} .val{font-weight:bold;}
        .btn-bar{text-align:center;margin-top:20px;max-width:380px;margin-left:auto;margin-right:auto;}
        .print-btn{background:#2563eb;color:#fff;border:none;padding:10px 32px;font-size:15px;border-radius:6px;cursor:pointer;}
        .print-btn:hover{background:#1d4ed8;}
        *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        @media print{.btn-bar{display:none !important;} *{-webkit-print-color-adjust:exact !important; print-color-adjust:exact !important;} }
      </style></head>
      <body>
        <div class="label">
          <h2>${med.name}</h2>
          <div class="row"><span class="lbl">Category:</span><span class="val">${med.category || "-"}</span></div>
          <div class="row"><span class="lbl">Batch:</span><span class="val">${med.batchNo || "-"}</span></div>
          <div class="row"><span class="lbl">Expiry:</span><span class="val">${med.expiryDate || "-"}</span></div>
          <div class="row"><span class="lbl">Selling price:</span><span class="val">$${Number((med.sellingPriceLocal ?? med.sellingPrice) ?? 0).toFixed(2)}</span></div>
          <div class="row"><span class="lbl">Manufacturer:</span><span class="val">${med.manufacturer || "-"}</span></div>
          ${generateBarcodeHtml(med)}
        </div>
        <div class="btn-bar">
          <button class="print-btn" onclick="window.print()">Print Label</button>
        </div>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleBarcode = (med: Medicine) => {
    const barcodeWindow = window.open("", "_blank", "width=420,height=350");
    if (!barcodeWindow) return;
    barcodeWindow.document.write(`
      <html><head><title>Barcode - ${med.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
        body{font-family:Arial,sans-serif;text-align:center;padding:40px;margin:0;}
        .name{font-size:18px;font-weight:bold;margin-bottom:16px;}
      </style></head>
      <body>
        <div class="name">${med.name}</div>
        ${generateBarcodeHtml(med)}
      </body></html>
    `);
    barcodeWindow.document.close();
  };

  const getMedicineImageSrc = (url: string | null | undefined): string | null => {
    if (!url?.trim()) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return url.startsWith("/") ? base + url : base + "/" + url;
  };

  const getUnitBadge = (unit: string) => {
    const colors: Record<string, string> = {
      Box: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      Pieces: "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
      Liter: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
      Jar: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      Bottle: "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
      Tube: "bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800",
      Pack: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    };
    return (
      <Badge variant="outline" className={`text-[11px] no-default-hover-elevate no-default-active-elevate ${colors[unit] || colors.Box}`}>
        <Package className="h-3 w-3 mr-1" />
        {unit}
      </Badge>
    );
  };

  const getExpiryBadge = (date: string | null) => {
    if (!date) return <span className="text-xs text-muted-foreground">-</span>;
    const exp = new Date(date);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <Badge variant="outline" className="text-[11px] no-default-hover-elevate no-default-active-elevate bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"><X className="h-3 w-3 mr-1" />Expired</Badge>;
    if (diffDays < 90) return <Badge variant="outline" className="text-[11px] no-default-hover-elevate no-default-active-elevate bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />{date}</Badge>;
    return <Badge variant="outline" className="text-[11px] no-default-hover-elevate no-default-active-elevate bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{date}</Badge>;
  };

  const columns = [
    { header: "", accessor: (row: Medicine) => {
      const src = getMedicineImageSrc(row.imageUrl);
      return (
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center border">
          {src ? (
            <img src={src} alt={row.name} className="w-full h-full object-cover" data-testid={`img-medicine-list-${row.id}`} />
          ) : (
            <Pill className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      );
    }, className: "w-12" },
    { header: "Medicine Name", accessor: (row: Medicine) => (
      <span className="font-semibold text-sm">{row.name}</span>
    )},
    { header: t("common.category"), accessor: (row: Medicine) => (
      <Badge variant="outline" className="text-[11px]">
        {row.category || "-"}
      </Badge>
    )},
    { header: "Unit Type", accessor: (row: Medicine) => getUnitBadge(row.unit || "Box") },
    { header: "Unit Count", accessor: (row: Medicine) => (
      <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium">{row.unitCount || 1}</span>
    )},
    { header: "Qty", accessor: (row: Medicine) => (
      <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-[11px] font-mono font-medium text-blue-700 dark:text-blue-300">{row.qtyPerBox || 1}</span>
    )},
    { header: "Purchase Unit Price", accessor: (row: Medicine) => (
      <span className="text-sm font-medium text-violet-600 dark:text-violet-400">${Number(row.boxPrice || 0).toFixed(2)}</span>
    )},
    { header: "Per Piece Price", accessor: (row: Medicine) => {
      const boxPrice = Number(row.boxPrice || 0);
      const qtyPerBox = Number(row.qtyPerBox || 1);
      const perPiece = qtyPerBox > 0 ? boxPrice / qtyPerBox : 0;
      return (
        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">${perPiece.toFixed(2)}</span>
      );
    }},
    { header: "Sales Unit Price", accessor: (row: Medicine) => {
      const perPiece = Number(row.sellingPriceLocal ?? row.sellingPrice ?? 0);
      const qtyPerBox = Number(row.qtyPerBox || 1);
      const perUnit = perPiece * qtyPerBox;
      return (
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${perUnit.toFixed(2)}</span>
      );
    }},
    { header: "Sales Value/pc", accessor: (row: Medicine) => (
      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">${Number(row.sellingPriceLocal || 0).toFixed(2)}</span>
    )},
    { header: t("medicines.stockCount"), accessor: (row: Medicine) => {
      const isLow = row.stockCount < (row.stockAlert || 10) && row.stockCount > 0;
      const isOut = row.stockCount === 0;
      const isInStock = !isLow && !isOut;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${isOut ? "text-red-600 dark:text-red-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{row.stockCount}</span>
          {isOut && (
            <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
              <PackageX className="h-3 w-3 mr-1" /> Out
            </Badge>
          )}
          {isLow && (
            <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
              <AlertTriangle className="h-3 w-3 mr-1 animate-pulse" /> Low
            </Badge>
          )}
          {isInStock && (
            <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
            </Badge>
          )}
        </div>
      );
    }},
    { header: "Expiry Date", accessor: (row: Medicine) => getExpiryBadge(row.expiryDate) },
    { header: t("common.actions"), accessor: (row: Medicine) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewMed(row); }} data-testid={`action-view-${row.id}`} className="gap-2">
            <Eye className="h-4 w-4 text-blue-500" /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} data-testid={`action-edit-${row.id}`} className="gap-2">
            <Pencil className="h-4 w-4 text-amber-500" /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAdjustStockMed(row); setAdjustStockValue(""); setAdjustStockReason(""); setAdjustStockMode("add"); }} data-testid={`action-adjust-stock-${row.id}`} className="gap-2">
            <Package className="h-4 w-4 text-cyan-500" /> Adjust stock
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStockHistoryMed(row); }} data-testid={`action-stock-history-${row.id}`} className="gap-2">
            <History className="h-4 w-4 text-slate-400" /> Stock history
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePrint(row); }} data-testid={`action-print-${row.id}`} className="gap-2">
            <Printer className="h-4 w-4 text-purple-500" /> {t("medicines.printLabel")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleBarcode(row); }} data-testid={`action-barcode-${row.id}`} className="gap-2">
            <Barcode className="h-4 w-4 text-teal-500" /> {t("medicines.printBarcode")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (confirm("Delete this medicine?")) deleteMutation.mutate(row.id); }} className="text-red-600 gap-2" data-testid={`action-delete-${row.id}`}>
            <Trash2 className="h-4 w-4" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400">
          <Pill className="h-4 w-4" />
          {t("medicines.medicineName")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name">{t("medicines.medicineName")} *</Label>
            <Input ref={refName} id="name" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErrors(prev => ({ ...prev, name: "" })); }} data-testid="input-medicine-name" className={fieldErrors.name ? "border-destructive" : ""} />
            {fieldErrors.name && <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <Label>{t("common.category")}</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-medicine-category"><SelectValue placeholder={t("common.category")} /></SelectTrigger>
              <SelectContent>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="manufacturer">{t("medicines.manufacturer")}</Label>
            <Input id="manufacturer" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} data-testid="input-medicine-manufacturer" />
          </div>
          <div>
            <Label htmlFor="batchNo">{t("medicines.batchNo")}</Label>
            <Input id="batchNo" value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} placeholder="Optional" data-testid="input-medicine-batch" />
          </div>
          <div>
            <Label htmlFor="expiryDate">{t("medicines.expiryDate")}</Label>
            <Input id="expiryDate" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} data-testid="input-medicine-expiry" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
          <ImagePlus className="h-4 w-4" />
          Medicine Image <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
        </div>
        {form.imageUrl ? (
          <div className="space-y-2">
            <div className="relative group inline-block">
              <img
                src={getMedicineImageSrc(form.imageUrl) || form.imageUrl}
                alt="Medicine"
                className="w-24 h-24 object-cover rounded-md border"
                data-testid="img-medicine-preview"
                onError={() => setForm(f => ({ ...f, imageUrl: "" }))}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                data-testid="button-remove-image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Replace image below (upload or paste URL)</p>
          </div>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
          <label
            className="flex flex-col items-center justify-center w-full sm:w-36 h-24 rounded-md border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            data-testid="label-upload-image"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-1">Upload</span>
            <span className="text-[10px] text-muted-foreground">Max 2MB (JPG, PNG)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              data-testid="input-medicine-image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  toast({ title: "Image too large", description: "Maximum size is 2MB", variant: "destructive" });
                  e.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  if (result) setForm(f => ({ ...f, imageUrl: result }));
                };
                reader.onerror = () => {
                  toast({ title: "Failed to read image", variant: "destructive" });
                  e.target.value = "";
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex-1 min-w-0 space-y-1">
            <Label htmlFor="medicine-image-url" className="text-xs text-muted-foreground">Or use image URL</Label>
            <div className="flex gap-2">
              <Input
                id="medicine-image-url"
                type="url"
                placeholder="https://example.com/medicine.jpg"
                onBlur={(e) => {
                  const url = e.target.value?.trim();
                  if (url) applyImageUrl(url);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const url = (e.target as HTMLInputElement).value?.trim();
                    if (url) applyImageUrl(url);
                  }
                }}
                className="text-sm"
                data-testid="input-medicine-image-url"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const input = document.getElementById("medicine-image-url") as HTMLInputElement;
                  const url = input?.value?.trim();
                  if (url) applyImageUrl(url);
                }}
                data-testid="button-apply-image-url"
              >
                Use URL
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
          <Calculator className="h-4 w-4" />
          {t("medicines.purchaseValue")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unit Type *</Label>
            <Select value={form.unit} onValueChange={v => { setForm(f => ({ ...f, unit: v })); setFieldErrors(prev => ({ ...prev, unit: "" })); }}>
              <SelectTrigger ref={refUnit} data-testid="select-medicine-unit"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.unit && <p className="text-xs text-destructive mt-1">{fieldErrors.unit}</p>}
          </div>
          <div>
            <Label htmlFor="unitCount">Unit Count ({form.unit}) *</Label>
            <Input ref={refUnitCount} id="unitCount" type="number" min={1} value={form.unitCount} onChange={e => { setForm(f => ({ ...f, unitCount: Number(e.target.value) || 0 })); setFieldErrors(prev => ({ ...prev, unitCount: "" })); }} data-testid="input-medicine-unit-count" className={fieldErrors.unitCount ? "border-destructive" : ""} />
            {fieldErrors.unitCount && <p className="text-xs text-destructive mt-1">{fieldErrors.unitCount}</p>}
          </div>
          <div>
            <Label htmlFor="boxPrice">{form.unit} Price ($) *</Label>
            <Input ref={refBoxPrice} id="boxPrice" type="number" step="0.01" min={0} value={form.boxPrice || ""} onChange={e => { setForm(f => ({ ...f, boxPrice: Number(e.target.value) || 0 })); setFieldErrors(prev => ({ ...prev, boxPrice: "" })); }} data-testid="input-medicine-box-price" className={fieldErrors.boxPrice ? "border-destructive" : ""} />
            {fieldErrors.boxPrice && <p className="text-xs text-destructive mt-1">{fieldErrors.boxPrice}</p>}
          </div>
          <div>
            <Label htmlFor="qtyPerBox">Qty per {form.unit} *</Label>
            <Input ref={refQtyPerBox} id="qtyPerBox" type="number" min={1} value={form.qtyPerBox} onChange={e => { setForm(f => ({ ...f, qtyPerBox: Number(e.target.value) || 1 })); setFieldErrors(prev => ({ ...prev, qtyPerBox: "" })); }} data-testid="input-medicine-qty-per-box" className={fieldErrors.qtyPerBox ? "border-destructive" : ""} />
            {fieldErrors.qtyPerBox && <p className="text-xs text-destructive mt-1">{fieldErrors.qtyPerBox}</p>}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-md p-3 space-y-2 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            <Calculator className="h-3 w-3" /> Auto Calculation
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per Med Price:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400" data-testid="calc-per-med-price">
                ${perMedPrice.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Purchase:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400" data-testid="calc-total-purchase">
                ${totalPurchasePrice.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Formula: {form.unit} Price (${form.boxPrice}) / Qty per {form.unit} ({form.qtyPerBox}) = ${perMedPrice.toFixed(4)} per piece
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
          <DollarSign className="h-4 w-4" />
          {t("medicines.salesValue")}
        </div>
        <div>
          <Label htmlFor="sellingPrice">Selling Price ($) per {form.unit} *</Label>
          <Input ref={refSellingPrice} id="sellingPrice" type="number" step="0.01" min={0} value={form.sellingPrice || ""} onChange={e => { setForm(f => ({ ...f, sellingPrice: Number(e.target.value) || 0 })); setFieldErrors(prev => ({ ...prev, sellingPrice: "" })); }} data-testid="input-medicine-selling-price" className={fieldErrors.sellingPrice ? "border-destructive" : ""} />
          {fieldErrors.sellingPrice && <p className="text-xs text-destructive mt-1">{fieldErrors.sellingPrice}</p>}
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-md p-3 space-y-2 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
            <Calculator className="h-3 w-3" /> Auto Calculation
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selling price per piece:</span>
              <span className="font-bold text-green-600 dark:text-green-400" data-testid="calc-selling-per-piece">
                ${sellingPricePerPiece.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Sales Value:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400" data-testid="calc-total-sales">
                ${formTotalSalesValue.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Formula: {form.unit} Selling Price (${sellingPricePerUnit.toFixed(2)}) / Qty per {form.unit} ({form.qtyPerBox}) = ${sellingPricePerPiece.toFixed(2)} per piece
          </p>
          <p className="text-[10px] text-muted-foreground italic">
            Total: {form.unit} Selling Price (${sellingPricePerUnit.toFixed(2)}) × Unit Count ({form.unitCount}) = ${formTotalSalesValue.toFixed(2)}
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          Stock Alert
        </div>
        <div>
          <Label htmlFor="stockAlert">Alert when stock below</Label>
          <Input id="stockAlert" type="number" min={1} value={form.stockAlert} onChange={e => setForm(f => ({ ...f, stockAlert: Number(e.target.value) || 10 }))} data-testid="input-medicine-stock-alert" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("medicines.title")}
        description={t("medicines.subtitle")}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)} data-testid="button-category">
              <FolderPlus className="h-4 w-4 mr-1" /> {t("medicines.categoryMgmt")}
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4 mr-1" /> {t("opd.listView")}
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> {t("opd.gridView")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} data-testid="button-refresh">
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} /> {t("common.refresh")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-import-medicine">
                  <Upload className="h-4 w-4 mr-1" /> {t("common.import")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setImportDialog(true)} data-testid="button-import-file">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import from File (Excel/CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTemplate} data-testid="button-download-template">
                  <FileDown className="h-4 w-4 mr-2" /> Download Sample Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-export-medicine">
                  <Download className="h-4 w-4 mr-1" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} data-testid="button-export-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="button-export-csv">
                  <FileText className="h-4 w-4 mr-2" /> Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultForm); setFieldErrors({}); } }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-medicine">
                  <Plus className="h-4 w-4 mr-1" /> {t("medicines.addMedicine")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl lg:max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-teal-500" />
                    {t("medicines.addMedicine")}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Enter details for a new medicine</DialogDescription>
                </DialogHeader>
                {formContent}
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending} data-testid="button-submit-medicine">
                  {createMutation.isPending ? t("common.creating") : t("medicines.addMedicine")}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {editMed && (
        <Dialog open={!!editMed} onOpenChange={(open) => { if (!open) { setEditMed(null); setForm(defaultForm); setFieldErrors({}); } }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl lg:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-500" />
                {t("common.edit")}
              </DialogTitle>
              <DialogDescription className="sr-only">Modify medicine details</DialogDescription>
            </DialogHeader>
            {formContent}
            <Button onClick={handleSubmit} className="w-full" disabled={updateMutation.isPending} data-testid="button-update-medicine">
              {updateMutation.isPending ? t("common.updating") : t("common.update")}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {adjustStockMed && (
        <Dialog open={!!adjustStockMed} onOpenChange={(open) => { if (!open) { setAdjustStockMed(null); setAdjustStockValue(""); setAdjustStockReason(""); } }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-cyan-500" />
                Adjust stock — {adjustStockMed.name}
              </DialogTitle>
              <DialogDescription>Update inventory count. Current stock: <strong>{adjustStockMed.stockCount}</strong> pieces.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Adjustment type</Label>
                <Select value={adjustStockMode} onValueChange={(v: "set" | "add" | "subtract") => setAdjustStockMode(v)}>
                  <SelectTrigger data-testid="select-adjust-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set stock to (exact value)</SelectItem>
                    <SelectItem value="add">Add to stock</SelectItem>
                    <SelectItem value="subtract">Subtract from stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{adjustStockMode === "set" ? "New stock count" : "Quantity"}</Label>
                <Input
                  type="number"
                  min={adjustStockMode === "subtract" ? 0 : 1}
                  value={adjustStockValue}
                  onChange={(e) => setAdjustStockValue(e.target.value)}
                  placeholder={adjustStockMode === "set" ? "e.g. 500" : "e.g. 100"}
                  data-testid="input-adjust-stock-value"
                />
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input
                  value={adjustStockReason}
                  onChange={(e) => setAdjustStockReason(e.target.value)}
                  placeholder="e.g. Restock, Sale, Damaged"
                  data-testid="input-adjust-stock-reason"
                />
              </div>
              <Button
                className="w-full"
                disabled={adjustStockMutation.isPending || !adjustStockValue}
                onClick={() => {
                  const num = Math.floor(Number(adjustStockValue));
                  if (isNaN(num) || (adjustStockMode === "subtract" && num < 0)) return;
                  const current = adjustStockMed.stockCount ?? 0;
                  const newStock = adjustStockMode === "set" ? Math.max(0, num) : adjustStockMode === "add" ? current + num : Math.max(0, current - num);
                  adjustStockMutation.mutate({ id: adjustStockMed.id, stockCount: newStock, reason: adjustStockReason || undefined, adjustmentType: adjustStockMode });
                }}
                data-testid="button-confirm-adjust-stock"
              >
                {adjustStockMutation.isPending ? "Updating..." : "Update stock"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {stockHistoryMed && (
        <Dialog open={!!stockHistoryMed} onOpenChange={(open) => { if (!open) setStockHistoryMed(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-2xl sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-500" />
                Stock history — {stockHistoryMed.name}
              </DialogTitle>
              <DialogDescription>Adjustments and movements for this medicine.</DialogDescription>
            </DialogHeader>
            <div className="overflow-auto flex-1 min-h-0 border rounded-lg">
              {stockHistoryLoading ? (
                <div className="p-6 text-center text-muted-foreground">Loading...</div>
              ) : stockHistory.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No stock adjustments recorded yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Date & time</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Previous</th>
                      <th className="text-right p-3 font-medium">New</th>
                      <th className="text-left p-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockHistory.map((adj) => (
                      <tr key={adj.id} className="border-t">
                        <td className="p-3 text-muted-foreground">
                          {adj.createdAt ? new Date(adj.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 capitalize">{adj.adjustmentType}</td>
                        <td className="p-3 text-right">{adj.previousStock}</td>
                        <td className="p-3 text-right font-medium">{adj.newStock}</td>
                        <td className="p-3 text-muted-foreground">{adj.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {viewMed && (
        <Dialog open={!!viewMed} onOpenChange={(open) => { if (!open) setViewMed(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                {t("medicines.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">View medicine information</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="w-full h-40 rounded-md overflow-hidden bg-muted flex items-center justify-center border">
                {getMedicineImageSrc(viewMed.imageUrl) ? (
                  <img src={getMedicineImageSrc(viewMed.imageUrl)!} alt={viewMed.name} className="w-full h-full object-cover" data-testid="img-medicine-detail" />
                ) : (
                  <Pill className="h-16 w-16 text-muted-foreground/50" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("medicines.medicineName")}</p>
                  <p className="font-semibold">{viewMed.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.category")}</p>
                  <p>{viewMed.category || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("medicines.manufacturer")}</p>
                  <p>{viewMed.manufacturer || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("medicines.batchNo")}</p>
                  <p>{viewMed.batchNo || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("medicines.expiryDate")}</p>
                  {getExpiryBadge(viewMed.expiryDate)}
                </div>
              </div>

              <Separator />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">{t("medicines.purchaseValue")}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground text-xs">Unit:</span> <span className="font-medium">{viewMed.unit}</span></div>
                  <div><span className="text-muted-foreground text-xs">Count:</span> <span className="font-medium">{viewMed.unitCount}</span></div>
                  <div><span className="text-muted-foreground text-xs">{viewMed.unit} Price:</span> <span className="font-semibold">${Number(viewMed.boxPrice).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground text-xs">Qty/{viewMed.unit}:</span> <span className="font-medium">{viewMed.qtyPerBox}</span></div>
                  <div><span className="text-muted-foreground text-xs">Per Med:</span> <span className="font-bold text-orange-600 dark:text-orange-400">${Number(viewMed.perMedPrice).toFixed(4)}</span></div>
                  <div><span className="text-muted-foreground text-xs">Total:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">${Number(viewMed.totalPurchasePrice).toFixed(2)}</span></div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-md p-3 border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">{t("medicines.salesValue")}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-green-500" /> <span className="text-muted-foreground text-xs">Selling price/pc:</span> <span className="font-bold text-green-600 dark:text-green-400">${Number(viewMed.sellingPriceLocal ?? viewMed.sellingPrice).toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Stock Count:</span>
                  <span className={`font-bold ${viewMed.stockCount < (viewMed.stockAlert || 10) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{viewMed.stockCount}</span>
                </div>
                {viewMed.stockCount < (viewMed.stockAlert || 10) && (
                  <Badge variant="outline" className="text-[11px] no-default-hover-elevate no-default-active-elevate bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                  </Badge>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-500" />
              {t("medicines.categoryMgmt")}
            </DialogTitle>
            <DialogDescription className="sr-only">Add or remove medicine categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New category name..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCategory()}
                data-testid="input-new-category"
              />
              <Button onClick={addCategory} size="sm" data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Default Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {MEDICINE_CATEGORIES.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Tag className="h-3 w-3" />
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {customCategories.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Custom Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {customCategories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                      <Tag className="h-3 w-3" />
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors"
                        data-testid={`button-remove-category-${cat}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground italic">
              Default categories cannot be removed. Custom categories are saved locally and available when adding or editing medicines.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="medicine-stats">
          {[
            { key: "total", label: t("medicines.totalItems"), gradient: "from-blue-500 to-blue-600", value: totalMeds, icon: Package, testId: "stat-total-meds" },
            { key: "in-stock", label: t("medicines.inStock"), gradient: "from-emerald-500 to-emerald-600", value: inStock.length, icon: PackageCheck, testId: "stat-in-stock" },
            { key: "low-stock", label: t("medicines.lowStock"), gradient: "from-amber-500 to-amber-600", value: lowStock.length, icon: AlertTriangle, testId: "stat-low-stock" },
            { key: "out-stock", label: t("medicines.outOfStock"), gradient: "from-red-500 to-red-600", value: outOfStock.length, icon: PackageX, testId: "stat-out-stock" },
            { key: "purchase", label: t("medicines.purchaseValue"), gradient: "from-violet-500 to-violet-600", value: `$${totalPurchaseValue.toFixed(2)}`, icon: DollarSign, testId: "stat-purchase-value" },
            { key: "sales", label: t("medicines.salesValue"), gradient: "from-cyan-500 to-cyan-600", value: `$${totalSalesValue.toFixed(2)}`, icon: TrendingUp, testId: "stat-sales-value" },
          ].map((s) => (
            <Card key={s.key} data-testid={s.testId}>
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

        {lowStock.length > 0 && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Low Stock Alert - {lowStock.length} medicine(s) below threshold
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(m => (
                  <Badge key={m.id} variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    {m.name} ({m.stockCount} left)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 pb-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">{t("medicines.title")}</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <SearchInputWithBarcode
                  placeholder="Search by name, batch, manufacturer..."
                  className="text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={(v) => setSearchTerm(v)}
                  data-testid="input-search-medicines"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[170px]" data-testid="select-filter-category">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")} {t("common.category")}</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")} {t("common.status")}</SelectItem>
                  <SelectItem value="in_stock">{t("medicines.inStock")}</SelectItem>
                  <SelectItem value="low_stock">{t("medicines.lowStock")}</SelectItem>
                  <SelectItem value="out_of_stock">{t("medicines.outOfStock")}</SelectItem>
                </SelectContent>
              </Select>
              {(categoryFilter !== "all" || statusFilter !== "all" || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCategoryFilter("all"); setStatusFilter("all"); setSearchTerm(""); }}
                  data-testid="button-clear-filters"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={viewMode === "grid" ? "p-4" : "p-0"}>
            {viewMode === "list" ? (
              <>
                {selectedIds.size > 0 && (
                  <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border-b">
                    <span className="text-sm font-medium">{selectedIds.size} selected</span>
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-medicines">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                    </Button>
                  </div>
                )}
                <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No medicines yet" selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="medicine-grid">
                {isLoading ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">Loading...</p>
                ) : filtered.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground py-8">No medicines yet</p>
                ) : filtered.map(med => {
                  const isLow = med.stockCount < (med.stockAlert || 10);
                  return (
                    <Card key={med.id} className="hover-elevate" data-testid={`card-medicine-${med.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="w-full h-28 rounded-md overflow-hidden mb-2 bg-muted flex items-center justify-center border">
                          {getMedicineImageSrc(med.imageUrl) ? (
                            <img src={getMedicineImageSrc(med.imageUrl)!} alt={med.name} className="w-full h-full object-cover" data-testid={`img-medicine-${med.id}`} />
                          ) : (
                            <Pill className="h-12 w-12 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{med.name}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-grid-actions-${med.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewMed(med)} className="gap-2">
                                <Eye className="h-4 w-4 text-blue-500" /> {t("common.view")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(med)} className="gap-2">
                                <Pencil className="h-4 w-4 text-amber-500" /> {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setAdjustStockMed(med); setAdjustStockValue(""); setAdjustStockReason(""); setAdjustStockMode("add"); }} className="gap-2">
                                <Package className="h-4 w-4 text-cyan-500" /> Adjust stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStockHistoryMed(med)} className="gap-2">
                                <History className="h-4 w-4 text-slate-400" /> Stock history
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(med)} className="gap-2">
                                <Printer className="h-4 w-4 text-purple-500" /> {t("medicines.printLabel")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBarcode(med)} className="gap-2">
                                <Barcode className="h-4 w-4 text-teal-500" /> {t("medicines.printBarcode")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { if (confirm("Delete this medicine?")) deleteMutation.mutate(med.id); }} className="text-red-600 gap-2">
                                <Trash2 className="h-4 w-4" /> {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {med.category || "-"}
                          </Badge>
                          {getUnitBadge(med.unit || "Box")}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Box Price:</span>
                            <span className="font-medium text-violet-600 dark:text-violet-400">${Number(med.boxPrice || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Per Med:</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">${Number(med.perMedPrice || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Selling/pc:</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">${Number((med.sellingPriceLocal ?? med.sellingPrice) ?? 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-xs font-semibold ${med.stockCount === 0 ? "text-red-600 dark:text-red-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {med.stockCount} in stock
                            </span>
                            {med.stockCount === 0 && (
                              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
                                <PackageX className="h-2.5 w-2.5 mr-0.5" /> Out
                              </Badge>
                            )}
                            {isLow && med.stockCount > 0 && (
                              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5 animate-pulse" /> Low
                              </Badge>
                            )}
                            {!isLow && med.stockCount > 0 && (
                              <Badge variant="outline" className="text-[9px] no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              </Badge>
                            )}
                          </div>
                          {getExpiryBadge(med.expiryDate)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {importDialog && (
        <Dialog open={importDialog} onOpenChange={(open) => { setImportDialog(open); if (!open) setImportResult(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-teal-500" />
                {t("common.import")} {t("billing.medicines")}
              </DialogTitle>
              <DialogDescription className="sr-only">Upload a file to import medicine records</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-1">Upload Excel or CSV file</p>
                <p className="text-xs text-muted-foreground mb-3">Supports .xlsx, .xls, .csv formats</p>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>{importing ? "Importing..." : "Choose File"}</span>
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleImport}
                    disabled={importing}
                    data-testid="input-import-file"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <FileDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Need a template?</p>
                  <p className="text-[10px] text-muted-foreground">Download a sample file with the correct format</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-template-download">
                  Download
                </Button>
              </div>

              {importResult && (
                <div className="p-3 rounded-md border space-y-1">
                  <p className="text-sm font-medium">Import Results</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600">Imported: {importResult.imported}</span>
                    {importResult.skipped > 0 && <span className="text-amber-600">Skipped: {importResult.skipped}</span>}
                    <span className="text-muted-foreground">Total: {importResult.total}</span>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-1 text-xs text-destructive space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
