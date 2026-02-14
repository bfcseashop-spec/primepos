import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, TrendingUp, DollarSign, Briefcase, X, Tag, Trash2, Eye, Pencil, Printer, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { Investment, InvestmentInvestor, Investor } from "@shared/schema";
import { useTranslation } from "@/i18n";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";
import { Users } from "lucide-react";

function normalizeInvestors(totalAmount: number, list: { investorId?: number; name: string; sharePercentage: number }[]): InvestmentInvestor[] {
  const filtered = list.filter((i) => i.name.trim() !== "");
  if (filtered.length === 0) return [];
  const sum = filtered.reduce((s, i) => s + i.sharePercentage, 0);
  const scale = sum > 0 ? 100 / sum : 0;
  return filtered.map((i) => {
    const pct = Math.round(i.sharePercentage * scale * 100) / 100;
    const amount = ((totalAmount * pct) / 100).toFixed(2);
    return { investorId: i.investorId, name: i.name.trim(), sharePercentage: pct, amount };
  });
}

function getInvestorSummary(inv: Investment): string {
  const list = (inv as Investment & { investors?: InvestmentInvestor[] }).investors ?? [];
  if (list.length === 0) return inv.investorName || "-";
  if (list.length === 1) return `${list[0].name} (100%)`;
  return list.map((i) => `${i.name} (${i.sharePercentage}%)`).join(", ");
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "aba", label: "ABA" },
  { value: "acleda", label: "Acleda" },
  { value: "others", label: "Others" },
];

const DEFAULT_INVESTMENT_CATEGORIES = [
  "Equipment", "Real Estate", "Expansion", "Technology",
  "Marketing", "Training", "Research", "Other"
];

function loadCategories(): string[] {
  try {
    const stored = localStorage.getItem("investment_categories");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_INVESTMENT_CATEGORIES;
}

export default function InvestmentsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvestment, setViewInvestment] = useState<Investment | null>(null);
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; category: string; amount: string; returnAmount: string; investorName: string; paymentMethod: string; investors: { investorId?: number; name: string; sharePercentage: number }[]; status: string; startDate: string; endDate: string; notes: string }>({ title: "", category: "", amount: "", returnAmount: "", investorName: "", paymentMethod: "cash", investors: [], status: "active", startDate: "", endDate: "", notes: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [newCategory, setNewCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; ids?: number[] }>({ open: false });
  const [createInvestors, setCreateInvestors] = useState<{ investorId?: number; name: string; sharePercentage: number }[]>([{ investorId: undefined, name: "", sharePercentage: 0 }]);
  const [createAmount, setCreateAmount] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState("cash");
  const [investorsDialogOpen, setInvestorsDialogOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [investorForm, setInvestorForm] = useState({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" });
  const [deleteInvestorConfirm, setDeleteInvestorConfirm] = useState<number | null>(null);
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, dateRange } = useDateFilter();

  const { data: investorsList = [] } = useQuery<Investor[]>({ queryKey: ["/api/investors"] });

  useEffect(() => {
    localStorage.setItem("investment_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (dialogOpen) {
      setCreateInvestors([{ investorId: undefined, name: "", sharePercentage: 0 }]);
      setCreateAmount("");
      setCreatePaymentMethod("cash");
    }
  }, [dialogOpen]);

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategory("");
    toast({ title: `Category "${trimmed}" added` });
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
    toast({ title: `Category "${cat}" removed` });
  };

  const { data: investments = [], isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/investments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setDialogOpen(false);
      toast({ title: "Investment recorded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/investments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setEditInvestment(null);
      toast({ title: "Investment updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setViewInvestment(null);
      setEditInvestment(null);
      toast({ title: "Investment deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/investments/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} investment(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createInvestorMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/investors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      setInvestorForm({ name: "", email: "", phone: "", notes: "" });
      setEditingInvestor(null);
      toast({ title: "Investor added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Investor> }) => {
      const res = await apiRequest("PUT", `/api/investors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      setEditingInvestor(null);
      toast({ title: "Investor updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const deleteInvestorMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/investors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      toast({ title: "Investor deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, ids: Array.from(selectedIds) });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.id != null) {
      deleteMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.ids?.length) {
      bulkDeleteMutation.mutate(deleteConfirm.ids);
      setSelectedIds(new Set());
    }
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amountStr = (form.get("amount") as string) || createAmount || "0";
    const total = Number(amountStr) || 0;
    const selected = createInvestors.filter((i) => i.investorId != null);
    if (selected.length === 0) {
      toast({ title: "Select at least one investor", variant: "destructive" });
      return;
    }
    const investorsList = normalizeInvestors(total, selected);
    createMutation.mutate({
      title: form.get("title"),
      category: form.get("category"),
      amount: amountStr,
      returnAmount: form.get("returnAmount") || "0",
      investorName: investorsList.length === 0 ? (form.get("investorName") as string) || null : null,
      paymentMethod: createPaymentMethod || "cash",
      investors: investorsList.length > 0 ? investorsList : undefined,
      status: "active",
      startDate: form.get("startDate"),
      endDate: form.get("endDate") || null,
      notes: form.get("notes") || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editInvestment) return;
    const total = Number(editForm.amount) || 0;
    const withSelection = editForm.investors.filter((i) => i.investorId != null || i.name.trim() !== "");
    const investorsList = normalizeInvestors(total, withSelection.length > 0 ? withSelection : editForm.investors);
    updateMutation.mutate({
      id: editInvestment.id,
      data: {
        title: editForm.title,
        category: editForm.category,
        amount: editForm.amount,
        returnAmount: editForm.returnAmount || "0",
        investorName: investorsList.length === 0 ? editForm.investorName || null : null,
        paymentMethod: editForm.paymentMethod || "cash",
        investors: investorsList.length > 0 ? investorsList : undefined,
        status: editForm.status || "active",
        startDate: editForm.startDate,
        endDate: editForm.endDate || null,
        notes: editForm.notes || null,
      },
    });
  };

  const openEdit = (inv: Investment) => {
    setEditInvestment(inv);
    const invWithInvestors = inv as Investment & { investors?: InvestmentInvestor[] };
    const list = invWithInvestors.investors ?? [];
    const investorsForm = list.length > 0
      ? list.map((i) => {
          const match = investorsList.find((m) => m.name === i.name);
          const pct = match ? (Number((match as Investor & { sharePercentage?: string }).sharePercentage) || 100) : i.sharePercentage;
          return { investorId: match?.id, name: i.name, sharePercentage: pct };
        })
      : [{ investorId: undefined, name: "", sharePercentage: 0 }];
    setEditForm({
      title: inv.title,
      category: inv.category,
      amount: String(inv.amount),
      returnAmount: String(inv.returnAmount || ""),
      investorName: inv.investorName || "",
      paymentMethod: (inv as Investment & { paymentMethod?: string }).paymentMethod || "cash",
      investors: investorsForm,
      status: inv.status || "active",
      startDate: inv.startDate || "",
      endDate: inv.endDate || "",
      notes: inv.notes || "",
    });
  };

  const handlePrint = (inv: Investment) => {
    const invWithInvestors = inv as Investment & { investors?: InvestmentInvestor[] };
    const investorsList = invWithInvestors.investors ?? [];
    const breakdownRows = investorsList.length > 0
      ? investorsList.map((i) => `<tr><td>${i.name}</td><td>${i.sharePercentage}%</td><td>$${i.amount}</td></tr>`).join("")
      : "";
    const breakdownTable = investorsList.length > 0
      ? `<div class="row"><span class="label">Investors</span><span class="val">${getInvestorSummary(inv)}</span></div>
        <table style="width:100%;margin-top:8px;border-collapse:collapse"><thead><tr style="border-bottom:1px solid #eee"><th style="text-align:left;padding:6px 0">Name</th><th style="text-align:right">Share</th><th style="text-align:right">Amount</th></tr></thead><tbody>${breakdownRows}</tbody></table>`
      : `<div class="row"><span class="label">Investor</span><span class="val">${inv.investorName || "-"}</span></div>`;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Investment - ${inv.title}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; max-width: 520px; margin: 0 auto; }
        h1 { font-size: 20px; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #666; } .val { font-weight: 600; }
        @media print { body { padding: 16px; } }
      </style></head><body>
        <h1>${inv.title}</h1>
        <div class="row"><span class="label">Category</span><span class="val">${inv.category}</span></div>
        <div class="row"><span class="label">Amount</span><span class="val">$${inv.amount}</span></div>
        <div class="row"><span class="label">Total Returns</span><span class="val">$${inv.returnAmount || "0"}</span></div>
        <div class="row"><span class="label">Pay by</span><span class="val">${PAYMENT_METHODS.find(m => m.value === ((inv as Investment & { paymentMethod?: string }).paymentMethod || "cash"))?.label ?? "Cash"}</span></div>
        ${breakdownTable}
        <div class="row"><span class="label">Status</span><span class="val">${inv.status}</span></div>
        <div class="row"><span class="label">Start Date</span><span class="val">${inv.startDate}</span></div>
        <div class="row"><span class="label">Return Date</span><span class="val">${inv.endDate || "-"}</span></div>
        ${inv.notes ? `<div class="row"><span class="label">Notes</span><span class="val">${inv.notes}</span></div>` : ""}
        <p style="margin-top: 24px;"><button onclick="window.print()" style="padding: 8px 20px; cursor: pointer;">Print</button></p>
      </body></html>
    `);
    win.document.close();
  };

  const filtered = investments.filter(i => {
    const invWithInvestors = i as Investment & { investors?: InvestmentInvestor[] };
    const investorNames = (invWithInvestors.investors ?? []).map((x) => x.name).join(" ");
    const matchSearch = !searchTerm ||
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investorNames.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = isDateInRange(i.startDate, dateRange);
    return matchSearch && matchDate;
  });

  const totalInvested = filtered.reduce((s, i) => s + Number(i.amount), 0);
  const totalReturns = filtered.reduce((s, i) => s + Number(i.returnAmount || 0), 0);
  const activeCount = filtered.filter(i => i.status === "active").length;
  const netROI = totalReturns - totalInvested;

  const perInvestorStats = (() => {
    const map: Record<string, { invested: number; returns: number; active: number }> = {};
    for (const inv of filtered) {
      const list = (inv as Investment & { investors?: InvestmentInvestor[] }).investors ?? [];
      const returnTotal = Number(inv.returnAmount || 0);
      if (list.length === 0) {
        const name = inv.investorName || "Unknown";
        if (!map[name]) map[name] = { invested: 0, returns: 0, active: 0 };
        map[name].invested += Number(inv.amount);
        map[name].returns += returnTotal;
        if (inv.status === "active") map[name].active += 1;
      } else {
        for (const e of list) {
          const name = e.name || "Unknown";
          if (!map[name]) map[name] = { invested: 0, returns: 0, active: 0 };
          map[name].invested += Number(e.amount || 0);
          map[name].returns += returnTotal * (e.sharePercentage / 100);
          if (inv.status === "active") map[name].active += 1;
        }
      }
    }
    return Object.entries(map).sort((a, b) => b[1].invested - a[1].invested);
  })();

  const columns = [
    { header: "Title", accessor: "title" as keyof Investment },
    { header: t("common.category"), accessor: (row: Investment) => <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-violet-600 dark:text-violet-400">{row.category}</Badge> },
    { header: t("common.amount"), accessor: (row: Investment) => <span className="font-medium text-emerald-600 dark:text-emerald-400">${row.amount}</span> },
    { header: t("investments.totalReturns"), accessor: (row: Investment) => <span className="font-medium text-emerald-600 dark:text-emerald-400">${row.returnAmount || "0"}</span> },
    { header: t("investments.investorName"), accessor: (row: Investment) => getInvestorSummary(row) },
    { header: t("common.status"), accessor: (row: Investment) => (
      <Badge variant="outline" className={`no-default-hover-elevate no-default-active-elevate ${
        row.status === "active"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : row.status === "completed"
          ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
      }`}>
        {row.status}
      </Badge>
    )},
    { header: t("common.date"), accessor: "startDate" as keyof Investment },
    { header: t("investments.returnDate"), accessor: (row: Investment) => row.endDate || "-" },
    { header: t("common.actions") || "Actions", accessor: (row: Investment) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} data-testid={`button-actions-investment-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewInvestment(row); }} data-testid={`action-view-${row.id}`} className="gap-2">
            <Eye className="h-4 w-4 text-blue-500" /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} data-testid={`action-edit-${row.id}`} className="gap-2">
            <Pencil className="h-4 w-4 text-amber-500" /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePrint(row); }} data-testid={`action-print-${row.id}`} className="gap-2">
            <Printer className="h-4 w-4 text-purple-500" /> {t("common.print")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, id: row.id }); }} className="text-red-600 gap-2" data-testid={`action-delete-${row.id}`}>
            <Trash2 className="h-4 w-4" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("investments.title")}
        description={t("investments.subtitle")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setInvestorsDialogOpen(true); setEditingInvestor(null); setInvestorForm({ name: "", email: "", phone: "", notes: "" }); }} data-testid="button-manage-investors">
            <Users className="h-4 w-4 mr-1" /> Manage Investors
          </Button>
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-manage-categories">
                <Tag className="h-4 w-4 mr-1" /> + {t("common.category")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription>Add or remove investment categories</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New category name..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                    data-testid="input-new-category"
                  />
                  <Button onClick={addCategory} disabled={!newCategory.trim()} data-testid="button-add-category">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {categories.map(cat => (
                    <Badge key={cat} variant="secondary" className="gap-1 pr-1" data-testid={`badge-category-${cat}`}>
                      {cat}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="ml-0.5 rounded-full p-0.5 hover-elevate"
                        data-testid={`button-remove-category-${cat}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={investorsDialogOpen} onOpenChange={(open) => { setInvestorsDialogOpen(open); if (!open) setEditingInvestor(null); }}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Investors</DialogTitle>
                <DialogDescription>Add and edit investors to select when creating investments.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Add new investor</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Input placeholder="Name *" value={investorForm.name} onChange={(e) => setInvestorForm((f) => ({ ...f, name: e.target.value }))} className="min-w-[120px]" />
                    <Input placeholder="Email" value={investorForm.email} onChange={(e) => setInvestorForm((f) => ({ ...f, email: e.target.value }))} className="min-w-[120px]" />
                    <Input placeholder="Phone" value={investorForm.phone} onChange={(e) => setInvestorForm((f) => ({ ...f, phone: e.target.value }))} className="min-w-[100px]" />
                    <div className="flex items-center gap-1.5 min-w-[100px]">
                      <Input type="number" min={0} max={100} step={0.5} placeholder="Share %" value={investorForm.sharePercentage} onChange={(e) => setInvestorForm((f) => ({ ...f, sharePercentage: e.target.value }))} className="w-20" />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Button type="button" onClick={() => { if (editingInvestor) { updateInvestorMutation.mutate({ id: editingInvestor.id, data: { ...investorForm, sharePercentage: investorForm.sharePercentage || "100" } }); setInvestorForm({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" }); setEditingInvestor(null); } else { createInvestorMutation.mutate({ ...investorForm, sharePercentage: investorForm.sharePercentage || "100" }); setInvestorForm({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" }); } }} disabled={!investorForm.name.trim()} data-testid="button-save-investor">
                      {editingInvestor ? "Update" : "Add"}
                    </Button>
                    {editingInvestor && <Button type="button" variant="ghost" onClick={() => { setEditingInvestor(null); setInvestorForm({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" }); }}>Cancel</Button>}
                  </div>
                  <Input placeholder="Notes" value={investorForm.notes} onChange={(e) => setInvestorForm((f) => ({ ...f, notes: e.target.value }))} className="mt-2" />
                </div>
                <div>
                  <Label>Investors list</Label>
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto mt-1">
                    {investorsList.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No investors yet. Add one above.</p> : investorsList.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 p-2">
                        <div>
                          <span className="font-medium">{inv.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{(inv as Investor & { sharePercentage?: string }).sharePercentage ?? "100"}%</span>
                          {(inv.email || inv.phone) && <span className="text-xs text-muted-foreground ml-2">{inv.email || inv.phone}</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingInvestor(inv); setInvestorForm({ name: inv.name, email: inv.email || "", phone: inv.phone || "", notes: inv.notes || "", sharePercentage: (inv as Investor & { sharePercentage?: string }).sharePercentage ?? "100" }); }}>Edit</Button>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteInvestorConfirm(inv.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-investment">
                <Plus className="h-4 w-4 mr-1" /> {t("investments.addInvestment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("investments.addInvestment")}</DialogTitle>
                <DialogDescription className="sr-only">Record a new investment entry</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label>{t("investments.investorName")} *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Select investors from the list. Share % is set in Manage Investors. Amounts calculated from total below.</p>
                  <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                    {createInvestors.map((inv, idx) => {
                      const total = Number(createAmount) || 0;
                      const selectedInvestors = createInvestors.filter((i) => i.investorId != null);
                      const sum = selectedInvestors.reduce((s, i) => s + i.sharePercentage, 0);
                      const scale = sum > 0 ? 100 / sum : 0;
                      const pct = inv.investorId ? inv.sharePercentage * scale : 0;
                      const computedAmount = ((total * pct) / 100).toFixed(2);
                      const selectedIds = createInvestors.map((i) => i.investorId).filter(Boolean) as number[];
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <Select
                            value={inv.investorId ? String(inv.investorId) : ""}
                            onValueChange={(v) => {
                              const num = Number(v);
                              const invObj = investorsList.find((i) => i.id === num);
                              if (invObj) {
                                const pctVal = Number((invObj as Investor & { sharePercentage?: string }).sharePercentage) || 100;
                                setCreateInvestors((prev) => prev.map((p, i) => i === idx ? { investorId: invObj.id, name: invObj.name, sharePercentage: pctVal } : p));
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1 min-w-[160px]" data-testid={`select-investor-${idx}`}>
                              <SelectValue placeholder="Select investor" />
                            </SelectTrigger>
                            <SelectContent>
                              {investorsList.map((i) => (
                                <SelectItem key={i.id} value={String(i.id)} disabled={selectedIds.includes(i.id) && createInvestors[idx].investorId !== i.id}>
                                  {i.name} ({(i as Investor & { sharePercentage?: string }).sharePercentage ?? "100"}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {inv.investorId ? (
                            <span className="text-sm text-muted-foreground shrink-0">= ${computedAmount}</span>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8"
                            onClick={() => setCreateInvestors((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={createInvestors.length <= 1}
                            data-testid={`button-remove-investor-${idx}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateInvestors((prev) => [...prev, { investorId: undefined, name: "", sharePercentage: 0 }])}
                      disabled={investorsList.length === 0}
                      data-testid="button-add-investor"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add investor
                    </Button>
                    {investorsList.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add investors in Manage Investors first.</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">{t("common.amount")} ($) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      value={createAmount}
                      onChange={(e) => setCreateAmount(e.target.value)}
                      data-testid="input-investment-amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="returnAmount">Expected Return ($)</Label>
                    <Input id="returnAmount" name="returnAmount" type="number" step="0.01" data-testid="input-investment-return" />
                  </div>
                </div>
                <div>
                  <Label>Pay by</Label>
                  <Select value={createPaymentMethod} onValueChange={setCreatePaymentMethod} data-testid="select-payment-method">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required data-testid="input-investment-title" />
                </div>
                <div>
                  <Label>{t("common.category")} *</Label>
                  <Select name="category" required>
                    <SelectTrigger data-testid="select-investment-category"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startDate">{t("common.date")} *</Label>
                    <Input id="startDate" name="startDate" type="date" required data-testid="input-investment-start" />
                  </div>
                  <div>
                    <Label htmlFor="endDate">{t("investments.returnDate")}</Label>
                    <Input id="endDate" name="endDate" type="date" data-testid="input-investment-end" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">{t("common.notes")}</Label>
                  <Textarea id="notes" name="notes" rows={2} data-testid="input-investment-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-investment">
                  {createMutation.isPending ? "Recording..." : t("investments.addInvestment")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <DateFilterBar datePeriod={datePeriod} setDatePeriod={setDatePeriod} customFromDate={customFromDate} setCustomFromDate={setCustomFromDate} customToDate={customToDate} setCustomToDate={setCustomToDate} dateRange={dateRange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="stat-total-invested">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("investments.totalInvestments")}</p>
                  <p className="text-xl font-bold">${totalInvested.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-returns">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("investments.totalReturns")}</p>
                  <p className="text-xl font-bold">${totalReturns.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-active-investments">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 shrink-0">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("investments.activeInvestments")}</p>
                  <p className="text-xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-net-roi">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600 shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Net ROI</p>
                  <p className="text-xl font-bold">${netROI.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {perInvestorStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" /> By investor
              </CardTitle>
              <p className="text-xs text-muted-foreground">Breakdown by investor (filtered list)</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">Investor</th>
                      <th className="text-right p-2 font-medium">Invested</th>
                      <th className="text-right p-2 font-medium">Returns</th>
                      <th className="text-right p-2 font-medium">Active</th>
                      <th className="text-right p-2 font-medium">Net ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perInvestorStats.map(([name, s]) => (
                      <tr key={name} className="border-b last:border-0">
                        <td className="p-2 font-medium">{name}</td>
                        <td className="text-right p-2 text-emerald-600 dark:text-emerald-400">${s.invested.toFixed(2)}</td>
                        <td className="text-right p-2 text-emerald-600 dark:text-emerald-400">${s.returns.toFixed(2)}</td>
                        <td className="text-right p-2">{s.active}</td>
                        <td className="text-right p-2 font-medium">${(s.returns - s.invested).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">{t("investments.title")}</CardTitle>
            <div className="w-64">
              <SearchInputWithBarcode
                placeholder="Search investments..."
                className="h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={(v) => setSearchTerm(v)}
                data-testid="input-search-investments"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border-b">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-investments">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                </Button>
              </div>
            )}
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No investments recorded" selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowClick={(row) => setViewInvestment(row)} />
          </CardContent>
        </Card>

        {/* View modal */}
        <Dialog open={!!viewInvestment} onOpenChange={(open) => { if (!open) setViewInvestment(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                {t("investments.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">View investment details</DialogDescription>
            </DialogHeader>
            {viewInvestment && (() => {
              const invWithInvestors = viewInvestment as Investment & { investors?: InvestmentInvestor[] };
              const investorsList = invWithInvestors.investors ?? [];
              return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Title</p><p className="font-semibold">{viewInvestment.title}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("common.category")}</p><p><Badge variant="outline" className="text-violet-600 dark:text-violet-400">{viewInvestment.category}</Badge></p></div>
                  <div><p className="text-xs text-muted-foreground">{t("common.amount")}</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">${viewInvestment.amount}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("investments.totalReturns")}</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">${viewInvestment.returnAmount || "0"}</p></div>
                  <div className="col-span-2"><p className="text-xs text-muted-foreground">{t("investments.investorName")}</p><p>{getInvestorSummary(viewInvestment)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Pay by</p><p className="font-medium">{PAYMENT_METHODS.find(m => m.value === ((viewInvestment as Investment & { paymentMethod?: string }).paymentMethod || "cash"))?.label ?? "Cash"}</p></div>
                  {investorsList.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Breakdown</p>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-muted/50 border-b"><th className="text-left p-2">Name</th><th className="text-right p-2">Share</th><th className="text-right p-2">Amount</th></tr></thead>
                          <tbody>
                            {investorsList.map((i, idx) => (
                              <tr key={idx} className="border-b last:border-0"><td className="p-2">{i.name}</td><td className="text-right p-2">{i.sharePercentage}%</td><td className="text-right p-2 font-medium text-emerald-600 dark:text-emerald-400">${i.amount}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div><p className="text-xs text-muted-foreground">{t("common.status")}</p><p><Badge variant="outline" className={viewInvestment.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-blue-500/10 text-blue-700"}>{viewInvestment.status}</Badge></p></div>
                  <div><p className="text-xs text-muted-foreground">{t("common.date")}</p><p>{viewInvestment.startDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("investments.returnDate")}</p><p>{viewInvestment.endDate || "-"}</p></div>
                </div>
                {viewInvestment.notes && (
                  <div><p className="text-xs text-muted-foreground">{t("common.notes")}</p><p className="text-sm">{viewInvestment.notes}</p></div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { openEdit(viewInvestment); setViewInvestment(null); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(viewInvestment)}><Printer className="h-3.5 w-3.5 mr-1" /> Print</Button>
                </div>
              </div>
            ); })()}
          </DialogContent>
        </Dialog>

        {/* Edit modal */}
        <Dialog open={!!editInvestment} onOpenChange={(open) => { if (!open) setEditInvestment(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-500" />
                {t("common.edit")} {t("investments.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">Edit investment</DialogDescription>
            </DialogHeader>
            {editInvestment && (
              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input id="edit-title" required value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} data-testid="input-edit-investment-title" />
                </div>
                <div>
                  <Label>{t("common.category")} *</Label>
                  <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))} required>
                    <SelectTrigger data-testid="select-edit-investment-category"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-amount">{t("common.amount")} ($) *</Label>
                    <Input id="edit-amount" type="number" step="0.01" required value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-edit-investment-amount" />
                  </div>
                  <div>
                    <Label htmlFor="edit-returnAmount">{t("investments.totalReturns")} ($)</Label>
                    <Input id="edit-returnAmount" type="number" step="0.01" value={editForm.returnAmount} onChange={e => setEditForm(f => ({ ...f, returnAmount: e.target.value }))} data-testid="input-edit-investment-return" />
                  </div>
                </div>
                <div>
                  <Label>Pay by</Label>
                  <Select value={editForm.paymentMethod} onValueChange={v => setEditForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("investments.investorName")}</Label>
                  <p className="text-xs text-muted-foreground mb-2">Select investors. Share % comes from Manage Investors. Amounts calculated from total.</p>
                  <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                    {editForm.investors.map((inv, idx) => {
                      const total = Number(editForm.amount) || 0;
                      const selectedSum = editForm.investors.filter((i) => i.investorId != null || i.name.trim()).reduce((s, i) => s + i.sharePercentage, 0);
                      const scale = selectedSum > 0 ? 100 / selectedSum : 0;
                      const pct = inv.sharePercentage * scale;
                      const computedAmount = ((total * pct) / 100).toFixed(2);
                      const selectedIds = editForm.investors.map((i) => i.investorId).filter(Boolean) as number[];
                      const isLegacy = !inv.investorId && inv.name.trim() !== "";
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          {inv.investorId != null ? (
                            <Select
                              value={String(inv.investorId)}
                              onValueChange={(v) => {
                                const num = Number(v);
                                const invObj = investorsList.find((i) => i.id === num);
                                if (invObj) {
                                  const pctVal = Number((invObj as Investor & { sharePercentage?: string }).sharePercentage) || 100;
                                  setEditForm((f) => ({ ...f, investors: f.investors.map((p, i) => i === idx ? { investorId: invObj.id, name: invObj.name, sharePercentage: pctVal } : p) }));
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1 min-w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {investorsList.map((i) => (
                                  <SelectItem key={i.id} value={String(i.id)} disabled={selectedIds.includes(i.id) && editForm.investors[idx].investorId !== i.id}>
                                    {i.name} ({(i as Investor & { sharePercentage?: string }).sharePercentage ?? "100"}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : isLegacy ? (
                            <span className="text-sm font-medium min-w-[160px]">{inv.name} ({(inv.sharePercentage)}%)</span>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(v) => {
                                const num = Number(v);
                                const invObj = investorsList.find((i) => i.id === num);
                                if (invObj) {
                                  const pctVal = Number((invObj as Investor & { sharePercentage?: string }).sharePercentage) || 100;
                                  setEditForm((f) => ({ ...f, investors: f.investors.map((p, i) => i === idx ? { investorId: invObj.id, name: invObj.name, sharePercentage: pctVal } : p) }));
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1 min-w-[160px]">
                                <SelectValue placeholder="Select investor" />
                              </SelectTrigger>
                              <SelectContent>
                                {investorsList.map((i) => (
                                  <SelectItem key={i.id} value={String(i.id)} disabled={selectedIds.includes(i.id)}>
                                    {i.name} ({(i as Investor & { sharePercentage?: string }).sharePercentage ?? "100"}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <span className="text-sm text-muted-foreground shrink-0">= ${computedAmount}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8"
                            onClick={() => setEditForm((f) => ({ ...f, investors: f.investors.filter((_, i) => i !== idx) }))}
                            disabled={editForm.investors.length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm((f) => ({ ...f, investors: [...f.investors, { investorId: undefined, name: "", sharePercentage: 0 }] }))}
                      disabled={investorsList.length === 0}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add investor
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>{t("common.status")}</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="completed">completed</SelectItem>
                      <SelectItem value="pending">pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-startDate">{t("common.date")} *</Label>
                    <Input id="edit-startDate" type="date" required value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} data-testid="input-edit-investment-start" />
                  </div>
                  <div>
                    <Label htmlFor="edit-endDate">{t("investments.returnDate")}</Label>
                    <Input id="edit-endDate" type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} data-testid="input-edit-investment-end" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-notes">{t("common.notes")}</Label>
                  <Textarea id="edit-notes" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-edit-investment-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-update-investment">
                  {updateMutation.isPending ? "Updating..." : t("common.update")}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm((c) => ({ ...c, open }))}
          title={t("common.delete") || "Delete"}
          description={deleteConfirm.ids?.length
            ? `Delete ${deleteConfirm.ids.length} selected investment(s)? This cannot be undone.`
            : "Delete this investment? This cannot be undone."}
          confirmLabel={t("common.delete") || "Delete"}
          cancelLabel={t("common.cancel") || "Cancel"}
          variant="destructive"
          onConfirm={handleConfirmDelete}
        />
        <ConfirmDialog
          open={deleteInvestorConfirm != null}
          onOpenChange={(open) => { if (!open) setDeleteInvestorConfirm(null); }}
          title="Delete investor"
          description="Delete this investor? Investments that reference them will keep the name."
          confirmLabel={t("common.delete") || "Delete"}
          cancelLabel={t("common.cancel") || "Cancel"}
          variant="destructive"
          onConfirm={() => { if (deleteInvestorConfirm != null) { deleteInvestorMutation.mutate(deleteInvestorConfirm); setDeleteInvestorConfirm(null); } }}
        />
      </div>
    </div>
  );
}
