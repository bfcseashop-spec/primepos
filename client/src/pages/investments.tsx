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
import { Plus, Search, TrendingUp, DollarSign, Briefcase, X, Tag, Trash2 } from "lucide-react";
import type { Investment } from "@shared/schema";
import { useTranslation } from "@/i18n";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [newCategory, setNewCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, dateRange } = useDateFilter();

  useEffect(() => {
    localStorage.setItem("investment_categories", JSON.stringify(categories));
  }, [categories]);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
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

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected investment(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      title: form.get("title"),
      category: form.get("category"),
      amount: form.get("amount"),
      returnAmount: form.get("returnAmount") || "0",
      investorName: form.get("investorName") || null,
      status: "active",
      startDate: form.get("startDate"),
      endDate: form.get("endDate") || null,
      notes: form.get("notes") || null,
    });
  };

  const filtered = investments.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchDate = isDateInRange(i.startDate, dateRange);
    return matchSearch && matchDate;
  });

  const totalInvested = filtered.reduce((s, i) => s + Number(i.amount), 0);
  const totalReturns = filtered.reduce((s, i) => s + Number(i.returnAmount || 0), 0);
  const activeCount = filtered.filter(i => i.status === "active").length;
  const netROI = totalReturns - totalInvested;

  const columns = [
    { header: "Title", accessor: "title" as keyof Investment },
    { header: t("common.category"), accessor: (row: Investment) => <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-violet-600 dark:text-violet-400">{row.category}</Badge> },
    { header: t("common.amount"), accessor: (row: Investment) => <span className="font-medium text-emerald-600 dark:text-emerald-400">${row.amount}</span> },
    { header: t("investments.totalReturns"), accessor: (row: Investment) => <span className="font-medium text-emerald-600 dark:text-emerald-400">${row.returnAmount || "0"}</span> },
    { header: t("investments.investorName"), accessor: (row: Investment) => row.investorName || "-" },
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
      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this investment?")) deleteMutation.mutate(row.id); }} data-testid={`button-delete-investment-${row.id}`}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("investments.title")}
        description={t("investments.subtitle")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-manage-categories">
                <Tag className="h-4 w-4 mr-1" /> + {t("common.category")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-investment">
                <Plus className="h-4 w-4 mr-1" /> {t("investments.addInvestment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("investments.addInvestment")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
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
                    <Label htmlFor="amount">{t("common.amount")} ($) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-investment-amount" />
                  </div>
                  <div>
                    <Label htmlFor="returnAmount">Expected Return ($)</Label>
                    <Input id="returnAmount" name="returnAmount" type="number" step="0.01" data-testid="input-investment-return" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="investorName">{t("investments.investorName")}</Label>
                  <Input id="investorName" name="investorName" data-testid="input-investment-investor" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">{t("investments.title")}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search investments..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No investments recorded" selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
