import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Search, AlertTriangle, Package, Pill, TrendingUp, DollarSign,
  Box, Droplets, FlaskConical, MoreHorizontal, Eye, Pencil, Trash2,
  Calculator, Users, Globe, ShieldAlert, CheckCircle2, X,
  List, LayoutGrid, RefreshCw, Tag, FolderPlus
} from "lucide-react";
import type { Medicine } from "@shared/schema";

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
  name: "", genericName: "", category: "", manufacturer: "",
  batchNo: "", expiryDate: "", unit: "Box",
  unitCount: 1, boxPrice: 0, qtyPerBox: 1,
  sellingPriceLocal: 0, sellingPriceForeigner: 0,
  stockAlert: 10,
};

export default function MedicinesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [viewMed, setViewMed] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("medicine_custom_categories");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newCategory, setNewCategory] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allCategories = [...MEDICINE_CATEGORIES, ...customCategories];

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const perMedPrice = form.qtyPerBox > 0 ? form.boxPrice / form.qtyPerBox : 0;
  const totalPurchasePrice = form.unitCount * form.boxPrice;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/medicines", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: "Medicine added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      toast({ title: "Medicine updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      toast({ title: "Medicine deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (allCategories.includes(trimmed)) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem("medicine_custom_categories", JSON.stringify(updated));
    setNewCategory("");
    toast({ title: `Category "${trimmed}" added` });
  };

  const removeCategory = (cat: string) => {
    const updated = customCategories.filter(c => c !== cat);
    setCustomCategories(updated);
    localStorage.setItem("medicine_custom_categories", JSON.stringify(updated));
    toast({ title: `Category "${cat}" removed` });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: "Medicines refreshed" });
  };

  const handleSubmit = () => {
    if (!form.name) return toast({ title: "Medicine name is required", variant: "destructive" });

    const payload = {
      name: form.name,
      genericName: form.genericName || null,
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
      sellingPriceLocal: String(form.sellingPriceLocal),
      sellingPriceForeigner: String(form.sellingPriceForeigner),
      stockCount: form.unitCount * form.qtyPerBox,
      stockAlert: form.stockAlert,
      quantity: form.unitCount * form.qtyPerBox,
      unitPrice: String(perMedPrice.toFixed(2)),
      sellingPrice: String(form.sellingPriceLocal),
      isActive: true,
    };

    if (editMed) {
      updateMutation.mutate({ id: editMed.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (med: Medicine) => {
    setForm({
      name: med.name,
      genericName: med.genericName || "",
      category: med.category || "",
      manufacturer: med.manufacturer || "",
      batchNo: med.batchNo || "",
      expiryDate: med.expiryDate || "",
      unit: med.unit || "Box",
      unitCount: med.unitCount || 1,
      boxPrice: Number(med.boxPrice) || 0,
      qtyPerBox: med.qtyPerBox || 1,
      sellingPriceLocal: Number(med.sellingPriceLocal) || 0,
      sellingPriceForeigner: Number(med.sellingPriceForeigner) || 0,
      stockAlert: med.stockAlert || 10,
    });
    setEditMed(med);
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (m.category?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const lowStock = medicines.filter(m => m.stockCount < (m.stockAlert || 10) && m.isActive);
  const totalMeds = medicines.length;
  const activeMeds = medicines.filter(m => m.isActive).length;
  const totalValue = medicines.reduce((sum, m) => sum + Number(m.totalPurchasePrice || 0), 0);

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
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${colors[unit] || colors.Box}`}>
        <Package className="h-3 w-3" />
        {unit}
      </span>
    );
  };

  const getExpiryBadge = (date: string | null) => {
    if (!date) return <span className="text-xs text-muted-foreground">-</span>;
    const exp = new Date(date);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"><X className="h-3 w-3" />Expired</span>;
    if (diffDays < 90) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertTriangle className="h-3 w-3" />{date}</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle2 className="h-3 w-3" />{date}</span>;
  };

  const columns = [
    { header: "Medicine", accessor: (row: Medicine) => (
      <div>
        <span className="font-semibold text-sm">{row.name}</span>
        {row.genericName && <span className="block text-xs text-muted-foreground italic">{row.genericName}</span>}
      </div>
    )},
    { header: "Category", accessor: (row: Medicine) => (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
        {row.category || "-"}
      </span>
    )},
    { header: "Unit", accessor: (row: Medicine) => getUnitBadge(row.unit || "Box") },
    { header: "Box Price", accessor: (row: Medicine) => (
      <span className="text-sm font-medium">${Number(row.boxPrice || 0).toFixed(2)}</span>
    )},
    { header: "Qty/Box", accessor: (row: Medicine) => (
      <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium">{row.qtyPerBox || "-"}</span>
    )},
    { header: "Per Med", accessor: (row: Medicine) => (
      <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">${Number(row.perMedPrice || 0).toFixed(4)}</span>
    )},
    { header: "Total Purchase", accessor: (row: Medicine) => (
      <span className="text-sm font-semibold">${Number(row.totalPurchasePrice || 0).toFixed(2)}</span>
    )},
    { header: "Sell (Local)", accessor: (row: Medicine) => (
      <span className="text-sm text-green-600 dark:text-green-400 font-medium">${Number(row.sellingPriceLocal || 0).toFixed(2)}</span>
    )},
    { header: "Sell (Foreign)", accessor: (row: Medicine) => (
      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">${Number(row.sellingPriceForeigner || 0).toFixed(2)}</span>
    )},
    { header: "Stock", accessor: (row: Medicine) => {
      const isLow = row.stockCount < (row.stockAlert || 10);
      return (
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${isLow ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{row.stockCount}</span>
          {isLow && <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />}
        </div>
      );
    }},
    { header: "Expiry", accessor: (row: Medicine) => getExpiryBadge(row.expiryDate) },
    { header: "Actions", accessor: (row: Medicine) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewMed(row); }} data-testid={`action-view-${row.id}`} className="gap-2">
            <Eye className="h-4 w-4 text-blue-500" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} data-testid={`action-edit-${row.id}`} className="gap-2">
            <Pencil className="h-4 w-4 text-amber-500" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (confirm("Delete this medicine?")) deleteMutation.mutate(row.id); }} className="text-red-600 gap-2" data-testid={`action-delete-${row.id}`}>
            <Trash2 className="h-4 w-4" /> Delete
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
          Basic Information
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name">Medicine Name *</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-medicine-name" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input id="genericName" value={form.genericName} onChange={e => setForm(f => ({ ...f, genericName: e.target.value }))} placeholder="Optional" data-testid="input-medicine-generic" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-medicine-category"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {allCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} data-testid="input-medicine-manufacturer" />
          </div>
          <div>
            <Label htmlFor="batchNo">Batch No</Label>
            <Input id="batchNo" value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))} placeholder="Optional" data-testid="input-medicine-batch" />
          </div>
          <div>
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} data-testid="input-medicine-expiry" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
          <Calculator className="h-4 w-4" />
          Purchase Pricing
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unit Type *</Label>
            <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
              <SelectTrigger data-testid="select-medicine-unit"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unitCount">Unit Count ({form.unit}) *</Label>
            <Input id="unitCount" type="number" min={1} value={form.unitCount} onChange={e => setForm(f => ({ ...f, unitCount: Number(e.target.value) || 0 }))} data-testid="input-medicine-unit-count" />
          </div>
          <div>
            <Label htmlFor="boxPrice">{form.unit} Price ($) *</Label>
            <Input id="boxPrice" type="number" step="0.01" min={0} value={form.boxPrice || ""} onChange={e => setForm(f => ({ ...f, boxPrice: Number(e.target.value) || 0 }))} data-testid="input-medicine-box-price" />
          </div>
          <div>
            <Label htmlFor="qtyPerBox">Qty per {form.unit} *</Label>
            <Input id="qtyPerBox" type="number" min={1} value={form.qtyPerBox} onChange={e => setForm(f => ({ ...f, qtyPerBox: Number(e.target.value) || 1 }))} data-testid="input-medicine-qty-per-box" />
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
          Selling Prices
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sellingPriceLocal" className="flex items-center gap-1">
              <Users className="h-3 w-3 text-green-500" /> Local Price ($) *
            </Label>
            <Input id="sellingPriceLocal" type="number" step="0.01" min={0} value={form.sellingPriceLocal || ""} onChange={e => setForm(f => ({ ...f, sellingPriceLocal: Number(e.target.value) || 0 }))} data-testid="input-medicine-sell-local" />
          </div>
          <div>
            <Label htmlFor="sellingPriceForeigner" className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-blue-500" /> Foreigner Price ($) *
            </Label>
            <Input id="sellingPriceForeigner" type="number" step="0.01" min={0} value={form.sellingPriceForeigner || ""} onChange={e => setForm(f => ({ ...f, sellingPriceForeigner: Number(e.target.value) || 0 }))} data-testid="input-medicine-sell-foreign" />
          </div>
        </div>

        {form.sellingPriceLocal > 0 && perMedPrice > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-md p-2 border border-green-200 dark:border-green-800">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local Margin:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {((form.sellingPriceLocal - perMedPrice) / perMedPrice * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Foreign Margin:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {form.sellingPriceForeigner > 0 ? ((form.sellingPriceForeigner - perMedPrice) / perMedPrice * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            </div>
          </div>
        )}
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
        title="Medicine Management"
        description="Manage medicine inventory, pricing and stock alerts"
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)} data-testid="button-category">
              <FolderPlus className="h-4 w-4 mr-1" /> Category
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
              className="toggle-elevate"
            >
              <List className="h-4 w-4 mr-1" /> List View
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
              className="toggle-elevate"
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> Grid View
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} data-testid="button-refresh">
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(defaultForm); }}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-medicine">
                  <Plus className="h-4 w-4 mr-1" /> Add Medicine
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-teal-500" />
                    Add New Medicine
                  </DialogTitle>
                </DialogHeader>
                {formContent}
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending} data-testid="button-submit-medicine">
                  {createMutation.isPending ? "Adding..." : "Add Medicine"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {editMed && (
        <Dialog open={!!editMed} onOpenChange={(open) => { if (!open) { setEditMed(null); setForm(defaultForm); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-500" />
                Edit Medicine
              </DialogTitle>
            </DialogHeader>
            {formContent}
            <Button onClick={handleSubmit} className="w-full" disabled={updateMutation.isPending} data-testid="button-update-medicine">
              {updateMutation.isPending ? "Updating..." : "Update Medicine"}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {viewMed && (
        <Dialog open={!!viewMed} onOpenChange={(open) => { if (!open) setViewMed(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Medicine Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Medicine Name</p>
                  <p className="font-semibold">{viewMed.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Generic Name</p>
                  <p className="font-medium">{viewMed.genericName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p>{viewMed.category || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Manufacturer</p>
                  <p>{viewMed.manufacturer || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Batch No</p>
                  <p>{viewMed.batchNo || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry Date</p>
                  {getExpiryBadge(viewMed.expiryDate)}
                </div>
              </div>

              <Separator />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">Purchase Pricing</p>
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
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">Selling Prices</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1"><Users className="h-3 w-3 text-green-500" /> <span className="text-muted-foreground text-xs">Local:</span> <span className="font-bold text-green-600 dark:text-green-400">${Number(viewMed.sellingPriceLocal).toFixed(2)}</span></div>
                  <div className="flex items-center gap-1"><Globe className="h-3 w-3 text-blue-500" /> <span className="text-muted-foreground text-xs">Foreigner:</span> <span className="font-bold text-blue-600 dark:text-blue-400">${Number(viewMed.sellingPriceForeigner).toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Stock Count:</span>
                  <span className={`font-bold ${viewMed.stockCount < (viewMed.stockAlert || 10) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{viewMed.stockCount}</span>
                </div>
                {viewMed.stockCount < (viewMed.stockAlert || 10) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-3 w-3" /> Low Stock
                  </span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-500" />
              Manage Categories
            </DialogTitle>
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
        <div className="grid grid-cols-4 gap-3" data-testid="medicine-stats">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Medicines</p>
                <p className="text-xl font-bold" data-testid="stat-total-meds">{totalMeds}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/50">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="stat-active-meds">{activeMeds}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Value</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="stat-total-value">${totalValue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/50">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Low Stock</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="stat-low-stock">{lowStock.length}</p>
              </div>
            </CardContent>
          </Card>
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
                  <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <ShieldAlert className="h-3 w-3" />
                    {m.name} ({m.stockCount} left)
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">All Medicines</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search medicines..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-medicines"
              />
            </div>
          </CardHeader>
          <CardContent className={viewMode === "grid" ? "p-4" : "p-0"}>
            {viewMode === "list" ? (
              <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No medicines yet" />
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
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{med.name}</p>
                            {med.genericName && <p className="text-xs text-muted-foreground italic truncate">{med.genericName}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-grid-actions-${med.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewMed(med)} className="gap-2">
                                <Eye className="h-4 w-4 text-blue-500" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(med)} className="gap-2">
                                <Pencil className="h-4 w-4 text-amber-500" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { if (confirm("Delete this medicine?")) deleteMutation.mutate(med.id); }} className="text-red-600 gap-2">
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {med.category || "-"}
                          </span>
                          {getUnitBadge(med.unit || "Box")}
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Box Price:</span>
                            <span className="font-medium">${Number(med.boxPrice || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Per Med:</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">${Number(med.perMedPrice || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Local:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">${Number(med.sellingPriceLocal || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Foreign:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">${Number(med.sellingPriceForeigner || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-xs font-semibold ${isLow ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                              {med.stockCount} in stock
                            </span>
                            {isLow && <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />}
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
    </div>
  );
}
