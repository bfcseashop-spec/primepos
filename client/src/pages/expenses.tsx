import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, downloadFile } from "@/lib/queryClient";
import {
  Plus, Search, DollarSign, CheckCircle2, Clock, List, LayoutGrid,
  RefreshCw, MoreHorizontal, Eye, Pencil, Trash2, X, Filter,
  CreditCard, Banknote, FileText, FolderPlus, Upload, Download,
  FileSpreadsheet, FileDown, File
} from "lucide-react";
import type { Expense } from "@shared/schema";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";
import { useTranslation } from "@/i18n";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent", "Salaries", "Utilities", "Medical Supplies", "Equipment",
  "Maintenance", "Insurance", "Marketing", "Travel", "Miscellaneous"
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash Pay" },
  { value: "aba", label: "ABA" },
  { value: "acleda", label: "Acleda" },
  { value: "other_bank", label: "Other Bank" },
  { value: "card", label: "Card Pay" },
  { value: "wechat", label: "WeChat Pay" },
  { value: "gpay", label: "GPay" },
];

function getStoredExpenseCategories(): string[] {
  try {
    const stored = localStorage.getItem("expense_custom_categories");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveExpenseCategories(custom: string[]) {
  localStorage.setItem("expense_custom_categories", JSON.stringify(custom));
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "approved":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 no-default-hover-elevate no-default-active-elevate">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 no-default-hover-elevate no-default-active-elevate">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 no-default-hover-elevate no-default-active-elevate">Pending</Badge>;
  }
}

function getPaymentIcon(method: string | null) {
  switch (method) {
    case "card": return <CreditCard className="h-3 w-3 text-violet-500 dark:text-violet-400" />;
    case "cash": return <Banknote className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />;
    case "aba": return <CreditCard className="h-3 w-3 text-blue-500 dark:text-blue-400" />;
    case "acleda": return <CreditCard className="h-3 w-3 text-amber-500 dark:text-amber-400" />;
    case "wechat": return <CreditCard className="h-3 w-3 text-green-500 dark:text-green-400" />;
    case "gpay": return <CreditCard className="h-3 w-3 text-sky-500 dark:text-sky-400" />;
    default: return <CreditCard className="h-3 w-3 text-slate-500 dark:text-slate-400" />;
  }
}

function getPaymentBadgeClass(method: string | null): string {
  switch (method) {
    case "cash": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    case "aba": return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20";
    case "acleda": return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
    case "card": return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20";
    case "wechat": return "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20";
    case "gpay": return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20";
    default: return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20";
  }
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>(getStoredExpenseCategories());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number; errors: string[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, dateRange } = useDateFilter();

  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories];

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      toast({ title: "Expense recorded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditExpense(null);
      toast({ title: "Expense updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Expense deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/expenses/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} expense(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      category: form.get("category"),
      description: form.get("description"),
      amount: form.get("amount"),
      paymentMethod: form.get("paymentMethod") || "cash",
      date: form.get("date"),
      notes: form.get("notes") || null,
      status: "pending",
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editExpense) return;
    const form = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editExpense.id,
      data: {
        category: form.get("category"),
        description: form.get("description"),
        amount: form.get("amount"),
        paymentMethod: form.get("paymentMethod"),
        date: form.get("date"),
        notes: form.get("notes") || null,
        status: form.get("status"),
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected expense(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.includes(name)) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    const updated = [...customCategories, name];
    setCustomCategories(updated);
    saveExpenseCategories(updated);
    setNewCategoryName("");
    toast({ title: `Category "${name}" added` });
  };

  const handleDeleteCategory = (cat: string) => {
    const updated = customCategories.filter(c => c !== cat);
    setCustomCategories(updated);
    saveExpenseCategories(updated);
    toast({ title: `Category "${cat}" removed` });
  };

  const handleExport = async (format: string) => {
    try {
      await downloadFile(`/api/expenses/export/${format}`, format === "pdf" ? "expenses.pdf" : format === "csv" ? "expenses.csv" : "expenses.xlsx");
      toast({ title: "Download started" });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile("/api/expenses/sample-template", "expense_import_template.xlsx");
      toast({ title: "Download started" });
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
      const res = await fetch("/api/expenses/import", { method: "POST", body: formData, credentials: "include" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: `Imported ${result.imported} expense(s)` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const filtered = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;
    const matchesStatus = filterStatus === "all" || (e.status || "pending") === filterStatus;
    const matchesDate = isDateInRange(e.date, dateRange);
    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  const totalExpenses = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const approvedExpenses = filtered.filter(e => e.status === "approved").reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingExpenses = filtered.filter(e => !e.status || e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0);

  const usedCategories = Array.from(new Set(expenses.map(e => e.category)));

  const columns = [
    { header: "Date", accessor: (row: Expense) => (
      <span className="text-xs text-muted-foreground">{row.date}</span>
    )},
    { header: "Category", accessor: (row: Expense) => (
      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{row.category}</Badge>
    )},
    { header: "Description", accessor: (row: Expense) => (
      <span className="font-medium text-sm">{row.description}</span>
    )},
    { header: "Amount", accessor: (row: Expense) => (
      <span className="font-semibold text-red-600 dark:text-red-400">${Number(row.amount).toFixed(2)}</span>
    )},
    { header: "Method", accessor: (row: Expense) => (
      <Badge variant="outline" className={`${getPaymentBadgeClass(row.paymentMethod)} no-default-hover-elevate no-default-active-elevate`}>
        <span className="flex items-center gap-1.5">
          {getPaymentIcon(row.paymentMethod)}
          <span className="text-xs capitalize">{row.paymentMethod || "cash"}</span>
        </span>
      </Badge>
    )},
    { header: "Status", accessor: (row: Expense) => getStatusBadge(row.status) },
    { header: "Actions", accessor: (row: Expense) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-expense-actions-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewExpense(row)} data-testid={`button-view-expense-${row.id}`}>
            <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditExpense(row)} data-testid={`button-edit-expense-${row.id}`}>
            <Pencil className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(row.status !== "approved") && (
            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: row.id, data: { status: "approved" } })} data-testid={`button-approve-expense-${row.id}`}>
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" /> Approve
            </DropdownMenuItem>
          )}
          {(row.status !== "rejected") && (
            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: row.id, data: { status: "rejected" } })} data-testid={`button-reject-expense-${row.id}`}>
              <X className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> Reject
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => { if (confirm("Delete this expense?")) deleteMutation.mutate(row.id); }}
            data-testid={`button-delete-expense-${row.id}`}
          >
            <Trash2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  const ExpenseForm = ({ onSubmit, expense, isPending, submitLabel }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; expense?: Expense | null; isPending: boolean; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Category *</Label>
        <Select name="category" required defaultValue={expense?.category || ""}>
          <SelectTrigger data-testid="select-expense-category"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {allCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Description *</Label>
        <Input id="description" name="description" required defaultValue={expense?.description || ""} data-testid="input-expense-description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount ($) *</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={expense?.amount || ""} data-testid="input-expense-amount" />
        </div>
        <div>
          <Label htmlFor="date">Date *</Label>
          <Input id="date" name="date" type="date" required defaultValue={expense?.date || ""} data-testid="input-expense-date" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Payment Method</Label>
          <Select name="paymentMethod" defaultValue={expense?.paymentMethod || "cash"}>
            <SelectTrigger data-testid="select-expense-method"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {expense && (
          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue={expense?.status || "pending"}>
              <SelectTrigger data-testid="select-expense-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={expense?.notes || ""} data-testid="input-expense-notes" />
      </div>
      <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-expense">
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center border rounded-md overflow-visible">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-none ${viewMode === "list" ? "toggle-elevate toggle-elevated" : ""}`}
                onClick={() => setViewMode("list")}
                data-testid="button-expense-list-view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-none ${viewMode === "grid" ? "toggle-elevate toggle-elevated" : ""}`}
                onClick={() => setViewMode("grid")}
                data-testid="button-expense-grid-view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/expenses"] })}
              data-testid="button-refresh-expenses"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-export-expenses">
                  <Download className="h-4 w-4 mr-1" /> {t("common.export")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} data-testid="button-export-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="button-export-csv">
                  <FileText className="h-4 w-4 mr-2" /> CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="button-export-pdf">
                  <File className="h-4 w-4 mr-2" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setImportDialog(true)} data-testid="button-import-expenses">
              <Upload className="h-4 w-4 mr-1" /> {t("common.import")}
            </Button>

            <Button variant="outline" onClick={() => setCategoryDialog(true)} data-testid="button-add-category">
              <FolderPlus className="h-4 w-4 mr-1" /> Add Category
            </Button>

            <Button onClick={() => setDialogOpen(true)} data-testid="button-new-expense">
              <Plus className="h-4 w-4 mr-1" /> {t("expenses.addExpense")}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <DateFilterBar datePeriod={datePeriod} setDatePeriod={setDatePeriod} customFromDate={customFromDate} setCustomFromDate={setCustomFromDate} customToDate={customToDate} setCustomToDate={setCustomToDate} dateRange={dateRange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="card-total-expenses">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("expenses.totalExpenses")}</p>
                  <p className="text-xl font-bold">${totalExpenses.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-approved-expenses">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Approved</p>
                  <p className="text-xl font-bold">${approvedExpenses.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-pending-expenses">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-amber-600 shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Pending</p>
                  <p className="text-xl font-bold">${pendingExpenses.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-categories-count">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600 shrink-0">
                  <FolderPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("expenses.categories")}</p>
                  <p className="text-xl font-bold">{usedCategories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-expenses"
            />
          </div>
          <Button variant="ghost" size="icon" data-testid="button-expense-filter">
            <Filter className="h-4 w-4" />
          </Button>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(usedCategories.length > 0 ? Array.from(new Set([...usedCategories, ...allCategories])) : allCategories).map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === "list" ? (
          <div>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border-b">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-expenses">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                </Button>
              </div>
            )}
            <Card>
              <CardContent className="p-0">
                <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage={
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                      <DollarSign className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium mb-1">No expenses recorded</p>
                    <p className="text-xs text-muted-foreground">Start tracking your expenses by adding a new entry</p>
                  </div>
                } selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">Loading expenses...</p>
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                  <DollarSign className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium mb-1">No expenses recorded</p>
                <p className="text-xs text-muted-foreground">Start tracking your expenses by adding a new entry</p>
              </div>
            ) : (
              filtered.map(exp => (
                <Card key={exp.id} className="hover-elevate" data-testid={`card-expense-${exp.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{exp.description}</p>
                        <p className="text-xs text-muted-foreground">{exp.date}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-expense-grid-actions-${exp.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewExpense(exp)} data-testid={`button-grid-view-expense-${exp.id}`}>
                            <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" /> {t("common.view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditExpense(exp)} data-testid={`button-grid-edit-expense-${exp.id}`}>
                            <Pencil className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {exp.status !== "approved" && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: exp.id, data: { status: "approved" } })} data-testid={`button-grid-approve-expense-${exp.id}`}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" /> Approve
                            </DropdownMenuItem>
                          )}
                          {exp.status !== "rejected" && (
                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: exp.id, data: { status: "rejected" } })} data-testid={`button-grid-reject-expense-${exp.id}`}>
                              <X className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> Reject
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { if (confirm("Delete this expense?")) deleteMutation.mutate(exp.id); }}
                            data-testid={`button-grid-delete-expense-${exp.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{exp.category}</Badge>
                      {getStatusBadge(exp.status)}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">${Number(exp.amount).toFixed(2)}</span>
                      <Badge variant="outline" className={`${getPaymentBadgeClass(exp.paymentMethod)} no-default-hover-elevate no-default-active-elevate`}>
                        <span className="flex items-center gap-1">
                          {getPaymentIcon(exp.paymentMethod)}
                          <span className="text-xs capitalize">{exp.paymentMethod || "cash"}</span>
                        </span>
                      </Badge>
                    </div>

                    {exp.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{exp.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Record New Expense
            </DialogTitle>
            <DialogDescription className="sr-only">Enter details for a new expense record</DialogDescription>
          </DialogHeader>
          <ExpenseForm onSubmit={handleCreate} isPending={createMutation.isPending} submitLabel="Record Expense" />
        </DialogContent>
      </Dialog>

      {editExpense && (
        <Dialog open={!!editExpense} onOpenChange={(open) => { if (!open) setEditExpense(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-500" />
                {t("common.edit")}
              </DialogTitle>
              <DialogDescription className="sr-only">Modify expense details</DialogDescription>
            </DialogHeader>
            <ExpenseForm onSubmit={handleEdit} expense={editExpense} isPending={updateMutation.isPending} submitLabel={t("common.update")} />
          </DialogContent>
        </Dialog>
      )}

      {viewExpense && (
        <Dialog open={!!viewExpense} onOpenChange={(open) => { if (!open) setViewExpense(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-500" />
                Expense Details
              </DialogTitle>
              <DialogDescription className="sr-only">View expense information</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">${Number(viewExpense.amount).toFixed(2)}</span>
                {getStatusBadge(viewExpense.status)}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{viewExpense.category}</span>
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium">{viewExpense.description}</span>
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{viewExpense.date}</span>
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium capitalize">{viewExpense.paymentMethod || "cash"}</span>
                {viewExpense.notes && (
                  <>
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium">{viewExpense.notes}</span>
                  </>
                )}
              </div>
              <Separator />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setViewExpense(null); setEditExpense(viewExpense); }}
                  data-testid="button-view-edit-expense"
                >
                  <Pencil className="h-3 w-3 mr-1" /> {t("common.edit")}
                </Button>
                {viewExpense.status !== "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { updateMutation.mutate({ id: viewExpense.id, data: { status: "approved" } }); setViewExpense(null); }}
                    data-testid="button-view-approve-expense"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Approve
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {categoryDialog && (
        <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-emerald-500" />
                Manage Expense Categories
              </DialogTitle>
              <DialogDescription className="sr-only">Add or remove expense categories</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  className="flex-1 min-w-[150px]"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  data-testid="input-new-category-name"
                />
                <Button onClick={handleAddCategory} data-testid="button-save-category">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <Separator />
              <div className="space-y-1 max-h-[300px] overflow-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2">Default Categories</p>
                {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md">
                    <span className="text-sm">{cat}</span>
                    <Badge variant="outline" className="text-[10px]">Default</Badge>
                  </div>
                ))}
                {customCategories.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-muted-foreground mb-2">Custom Categories</p>
                    {customCategories.map(cat => (
                      <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                        <span className="text-sm">{cat}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(cat)}
                          data-testid={`button-delete-category-${cat}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {importDialog && (
        <Dialog open={importDialog} onOpenChange={(open) => { setImportDialog(open); if (!open) setImportResult(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-500" />
                Import Expenses
              </DialogTitle>
              <DialogDescription className="sr-only">Upload a file to import expense records</DialogDescription>
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
                    data-testid="input-import-expense-file"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 flex-wrap">
                <FileDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Need a template?</p>
                  <p className="text-[10px] text-muted-foreground">Download a sample file with the correct format</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-expense-template-download">
                  Download
                </Button>
              </div>

              {importResult && (
                <div className="p-3 rounded-md border space-y-1">
                  <p className="text-sm font-medium">Import Results</p>
                  <div className="flex items-center gap-4 text-xs flex-wrap">
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
