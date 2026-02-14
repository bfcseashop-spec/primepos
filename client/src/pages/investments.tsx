import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
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
import {
  Plus, DollarSign, X, Tag, Trash2, Eye, Pencil, Printer,
  MoreHorizontal, Users, Wallet, AlertTriangle, CheckCircle2, CreditCard,
  TrendingUp, ArrowDownRight, ArrowUpRight, CircleDollarSign, PiggyBank, Receipt, ChevronUp,
  Upload, ImageIcon
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { Investment, InvestmentInvestor, Investor, Contribution } from "@shared/schema";
import { useTranslation } from "@/i18n";

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

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvestmentsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvestment, setViewInvestment] = useState<Investment | null>(null);
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null);
  const [editForm, setEditForm] = useState<any>({ title: "", category: "", amount: "", returnAmount: "", investorName: "", paymentMethod: "cash", investors: [], status: "active", startDate: "", endDate: "", notes: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(loadCategories);
  const [newCategory, setNewCategory] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; ids?: number[] }>({ open: false });
  const [createInvestors, setCreateInvestors] = useState<{ investorId?: number; name: string; sharePercentage: number }[]>([{ investorId: undefined, name: "", sharePercentage: 0 }]);
  const [createAmount, setCreateAmount] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState("cash");
  const [investorsDialogOpen, setInvestorsDialogOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [investorForm, setInvestorForm] = useState({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" });
  const [deleteInvestorConfirm, setDeleteInvestorConfirm] = useState<number | null>(null);

  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [contributionForm, setContributionForm] = useState({ investmentId: 0, investorName: "", amount: "", date: new Date().toISOString().split("T")[0], category: "", paymentSlip: "", note: "" });
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [contributionFilter, setContributionFilter] = useState("all");
  const [editContribution, setEditContribution] = useState<Contribution | null>(null);
  const [deleteContributionConfirm, setDeleteContributionConfirm] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [capitalDialogOpen, setCapitalDialogOpen] = useState(false);
  const [capitalEditTarget, setCapitalEditTarget] = useState<{ investmentId: number; investorIdx: number } | null>(null);
  const [capitalForm, setCapitalForm] = useState({ investmentId: 0, investorName: "", sharePercentage: 0 });
  const [deleteCapitalConfirm, setDeleteCapitalConfirm] = useState<{ investmentId: number; investorIdx: number; investorName: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setShowScrollTop(scrollRef.current.scrollTop > 300);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { data: investorsList = [] } = useQuery<Investor[]>({ queryKey: ["/api/investors"] });
  const { data: investments = [], isLoading } = useQuery<Investment[]>({ queryKey: ["/api/investments"] });
  const { data: allContributions = [] } = useQuery<Contribution[]>({ queryKey: ["/api/contributions"] });

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
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/investments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      setViewInvestment(null);
      setEditInvestment(null);
      toast({ title: "Investment deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => apiRequest("POST", "/api/investments/bulk-delete", { ids }),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({ title: `${ids.length} investment(s) deleted` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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

  const createContributionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/contributions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      setContributionDialogOpen(false);
      setContributionForm({ investmentId: 0, investorName: "", amount: "", date: new Date().toISOString().split("T")[0], category: "", paymentSlip: "", note: "" });
      toast({ title: "Contribution recorded" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateContributionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/contributions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      setEditContribution(null);
      toast({ title: "Contribution updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteContributionMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/contributions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      toast({ title: "Contribution deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleConfirmDelete = () => {
    if (deleteConfirm.id != null) {
      deleteMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.ids?.length) {
      bulkDeleteMutation.mutate(deleteConfirm.ids);
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
      investorName: investorsList.length === 0 ? null : null,
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

  const openCapitalDialog = (investmentId?: number) => {
    setCapitalEditTarget(null);
    setCapitalForm({
      investmentId: investmentId || (investments.length > 0 ? investments[0].id : 0),
      investorName: "",
      sharePercentage: 0,
    });
    setCapitalDialogOpen(true);
  };

  const openCapitalEdit = (investmentId: number, investorIdx: number) => {
    const inv = investments.find(i => i.id === investmentId);
    if (!inv) return;
    const invInvestors = ((inv as any).investors ?? []) as InvestmentInvestor[];
    const investor = invInvestors[investorIdx];
    if (!investor) return;
    setCapitalEditTarget({ investmentId, investorIdx });
    setCapitalForm({
      investmentId,
      investorName: investor.name,
      sharePercentage: investor.sharePercentage,
    });
    setCapitalDialogOpen(true);
  };

  const handleCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capitalForm.investorName.trim() || capitalForm.sharePercentage <= 0) {
      toast({ title: "Fill in investor name and percentage", variant: "destructive" });
      return;
    }
    const inv = investments.find(i => i.id === capitalForm.investmentId);
    if (!inv) return;
    const total = Number(inv.amount) || 0;
    let currentInvestors = [...((inv as any).investors ?? [])] as { investorId?: number; name: string; sharePercentage: number }[];

    if (capitalEditTarget) {
      currentInvestors[capitalEditTarget.investorIdx] = {
        ...currentInvestors[capitalEditTarget.investorIdx],
        name: capitalForm.investorName.trim(),
        sharePercentage: capitalForm.sharePercentage,
      };
    } else {
      const match = investorsList.find(i => i.name === capitalForm.investorName.trim());
      currentInvestors.push({
        investorId: match?.id,
        name: capitalForm.investorName.trim(),
        sharePercentage: capitalForm.sharePercentage,
      });
    }

    const normalized = normalizeInvestors(total, currentInvestors);
    updateMutation.mutate({
      id: capitalForm.investmentId,
      data: { investors: normalized },
    }, {
      onSuccess: () => {
        setCapitalDialogOpen(false);
        setCapitalEditTarget(null);
        toast({ title: capitalEditTarget ? "Capital updated" : "Capital added" });
      }
    });
  };

  const handleCapitalDelete = () => {
    if (!deleteCapitalConfirm) return;
    const { investmentId, investorIdx } = deleteCapitalConfirm;
    const inv = investments.find(i => i.id === investmentId);
    if (!inv) return;
    const total = Number(inv.amount) || 0;
    let currentInvestors = [...((inv as any).investors ?? [])] as { investorId?: number; name: string; sharePercentage: number }[];
    if (currentInvestors.length <= 1) {
      toast({ title: "Cannot remove the last investor", variant: "destructive" });
      setDeleteCapitalConfirm(null);
      return;
    }
    currentInvestors.splice(investorIdx, 1);
    const normalized = normalizeInvestors(total, currentInvestors);
    updateMutation.mutate({
      id: investmentId,
      data: { investors: normalized },
    }, {
      onSuccess: () => {
        setDeleteCapitalConfirm(null);
        toast({ title: "Capital removed" });
      }
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
      title: inv.title, category: inv.category, amount: String(inv.amount),
      returnAmount: String(inv.returnAmount || ""),
      investorName: inv.investorName || "",
      paymentMethod: (inv as any).paymentMethod || "cash",
      investors: investorsForm,
      status: inv.status || "active",
      startDate: inv.startDate || "", endDate: inv.endDate || "", notes: inv.notes || "",
    });
  };

  const filtered = investments.filter(i => {
    const invI = (i as any).investors ?? [];
    const investorNames = invI.map((x: any) => x.name).join(" ");
    return !searchTerm ||
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investorNames.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalInvestment = filtered.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = useMemo(() => {
    const investmentIds = new Set(filtered.map(i => i.id));
    return allContributions
      .filter(c => investmentIds.has(c.investmentId))
      .reduce((s, c) => s + Number(c.amount), 0);
  }, [filtered, allContributions]);
  const remainingTotal = totalInvestment - totalPaid;

  const investorTableData = useMemo(() => {
    const map: Record<string, { name: string; shareAmount: number; paid: number }> = {};
    for (const inv of filtered) {
      const invInvestors = ((inv as any).investors ?? []) as InvestmentInvestor[];
      if (invInvestors.length === 0) {
        const name = inv.investorName || "Unknown";
        if (!map[name]) map[name] = { name, shareAmount: 0, paid: 0 };
        map[name].shareAmount += Number(inv.amount);
      } else {
        for (const e of invInvestors) {
          const name = e.name || "Unknown";
          if (!map[name]) map[name] = { name, shareAmount: 0, paid: 0 };
          map[name].shareAmount += Number(e.amount || 0);
        }
      }
    }
    const investmentIds = new Set(filtered.map(i => i.id));
    for (const c of allContributions) {
      if (!investmentIds.has(c.investmentId)) continue;
      const name = c.investorName;
      if (map[name]) {
        map[name].paid += Number(c.amount);
      } else {
        map[name] = { name, shareAmount: 0, paid: Number(c.amount) };
      }
    }
    const rows = Object.values(map).sort((a, b) => b.shareAmount - a.shareAmount);
    const grandTotal = rows.reduce((s, r) => s + r.shareAmount, 0);
    return rows.map(r => ({
      ...r,
      sharePct: grandTotal > 0 ? Math.round((r.shareAmount / grandTotal) * 10000) / 100 : 0,
    }));
  }, [filtered, allContributions]);

  const investorCardData = useMemo(() => {
    const result: { name: string; sharePercentage: number; shareAmount: number; paid: number; investmentId: number; investorIdx: number }[] = [];
    for (const inv of filtered) {
      const invInvestors = ((inv as any).investors ?? []) as InvestmentInvestor[];
      invInvestors.forEach((e, idx) => {
        result.push({
          name: e.name || "Unknown",
          sharePercentage: e.sharePercentage,
          shareAmount: Number(e.amount || 0),
          paid: 0,
          investmentId: inv.id,
          investorIdx: idx,
        });
      });
      if (invInvestors.length === 0 && inv.investorName) {
        result.push({
          name: inv.investorName,
          sharePercentage: 100,
          shareAmount: Number(inv.amount),
          paid: 0,
          investmentId: inv.id,
          investorIdx: -1,
        });
      }
    }
    const investmentIds = new Set(filtered.map(i => i.id));
    for (const c of allContributions) {
      if (!investmentIds.has(c.investmentId)) continue;
      const match = result.find(r => r.name === c.investorName && r.investmentId === c.investmentId);
      if (match) match.paid += Number(c.amount);
    }
    return result;
  }, [filtered, allContributions]);

  const filteredContributions = useMemo(() => {
    const investmentIds = new Set(filtered.map(i => i.id));
    let list = allContributions.filter(c => investmentIds.has(c.investmentId));
    if (contributionFilter !== "all") {
      list = list.filter(c => c.investorName === contributionFilter);
    }
    return list;
  }, [allContributions, filtered, contributionFilter]);

  const allInvestorNames = useMemo(() => {
    const names = new Set<string>();
    for (const inv of investments) {
      const invInvestors = ((inv as any).investors ?? []) as InvestmentInvestor[];
      if (invInvestors.length === 0) {
        if (inv.investorName) names.add(inv.investorName);
      } else {
        for (const e of invInvestors) names.add(e.name);
      }
    }
    return Array.from(names).sort();
  }, [investments]);

  const openContributionDialog = (investmentId?: number, investorName?: string) => {
    setContributionForm({
      investmentId: investmentId || (investments.length > 0 ? investments[0].id : 0),
      investorName: investorName || "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      category: "",
      paymentSlip: "",
      note: "",
    });
    setContributionDialogOpen(true);
  };

  const handleContributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionForm.investmentId || !contributionForm.investorName || !contributionForm.amount) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    createContributionMutation.mutate({
      investmentId: contributionForm.investmentId,
      investorName: contributionForm.investorName,
      amount: contributionForm.amount,
      date: contributionForm.date,
      category: contributionForm.category || null,
      paymentSlip: contributionForm.paymentSlip || null,
      note: contributionForm.note || null,
    });
  };

  const handleEditContributionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContribution) return;
    updateContributionMutation.mutate({
      id: editContribution.id,
      data: {
        investorName: (editContribution as any)._editName ?? editContribution.investorName,
        amount: (editContribution as any)._editAmount ?? String(editContribution.amount),
        date: (editContribution as any)._editDate ?? editContribution.date,
        category: (editContribution as any)._editCategory ?? editContribution.category,
        paymentSlip: (editContribution as any)._editPaymentSlip ?? editContribution.paymentSlip,
        note: (editContribution as any)._editNote ?? editContribution.note,
      },
    });
  };

  const handleSlipUpload = useCallback(async (file: File, target: "create" | "edit") => {
    setUploadingSlip(true);
    try {
      const formData = new FormData();
      formData.append("slip", file);
      const res = await fetch("/api/contributions/upload-slip", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      if (target === "create") {
        setContributionForm(f => ({ ...f, paymentSlip: url }));
      } else {
        setEditContribution(prev => prev ? { ...prev, _editPaymentSlip: url } as any : null);
      }
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingSlip(false);
    }
  }, [toast]);

  const investorsForSelectedInvestment = useMemo(() => {
    const inv = investments.find(i => i.id === contributionForm.investmentId);
    if (!inv) return [];
    const invInvestors = ((inv as any).investors ?? []) as InvestmentInvestor[];
    if (invInvestors.length === 0 && inv.investorName) return [inv.investorName];
    return invInvestors.map(i => i.name);
  }, [contributionForm.investmentId, investments]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("investments.title")}
        description="Track investments, investor shares, contributions, and remaining dues"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
<Button variant="outline" onClick={() => { setInvestorsDialogOpen(true); setEditingInvestor(null); setInvestorForm({ name: "", email: "", phone: "", notes: "", sharePercentage: "100" }); }} data-testid="button-manage-investors">
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

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-auto scroll-smooth p-4 space-y-5 relative">
        {/* Top KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card data-testid="stat-total-capital">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                  <PiggyBank className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <TrendingUp className="h-4 w-4 text-blue-500/40" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Capital</p>
              <p className="text-xl font-bold mt-0.5" data-testid="text-total-capital">${fmt(totalInvestment)}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-contributions">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
                  <Receipt className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-xs text-muted-foreground">{filteredContributions.length} records</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Contributions</p>
              <p className="text-xl font-bold mt-0.5" data-testid="text-total-contributions">${fmt(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-paid">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                {totalPaid > 0 && <ArrowUpRight className="h-4 w-4 text-emerald-500/50" />}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total Paid</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5" data-testid="text-total-paid">${fmt(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card data-testid="stat-remaining">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${remainingTotal > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                  {remainingTotal > 0
                    ? <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                    : <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  }
                </div>
                {remainingTotal > 0 && <ArrowDownRight className="h-4 w-4 text-amber-500/50" />}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Remaining</p>
              <p className={`text-xl font-bold mt-0.5 ${remainingTotal > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} data-testid="text-remaining-total">${fmt(Math.max(0, remainingTotal))}</p>
            </CardContent>
          </Card>
        </div>

        {/* Investor Detail Cards */}
        {investorCardData.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Capital & Share</h3>
              <Button variant="outline" size="sm" onClick={() => openCapitalDialog()} data-testid="button-add-capital">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Capital
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investorCardData.map((row, cardIdx) => {
              const due = Math.max(0, row.shareAmount - row.paid);
              const overpaid = Math.max(0, row.paid - row.shareAmount);
              const paidPct = row.shareAmount > 0 ? Math.min(100, Math.round((row.paid / row.shareAmount) * 100)) : 0;
              const inv = investments.find(i => i.id === row.investmentId);
              return (
                <Card key={`${row.investmentId}-${row.investorIdx}-${cardIdx}`} data-testid={`card-investor-${row.name}-${row.investmentId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shrink-0">
                          <span className="text-white text-xs font-bold">{row.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{row.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">{row.sharePercentage}% share</Badge>
                            {inv && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{inv.title}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {due > 0 ? (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs">Due</Badge>
                        ) : overpaid > 0 ? (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs">Overpaid</Badge>
                        ) : (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">Fully Paid</Badge>
                        )}
                        {row.investorIdx >= 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-capital-actions-${row.name}-${row.investmentId}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openCapitalEdit(row.investmentId, row.investorIdx)} className="gap-2">
                                <Pencil className="h-4 w-4 text-amber-500" /> Edit Capital
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteCapitalConfirm({ investmentId: row.investmentId, investorIdx: row.investorIdx, investorName: row.name })} className="text-red-600 gap-2">
                                <Trash2 className="h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                        <span>Payment Progress</span>
                        <span className="font-medium">{paidPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${paidPct >= 100 ? "bg-emerald-500" : paidPct > 50 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(100, paidPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Capital Amount</p>
                        <p className="font-semibold">${fmt(row.shareAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">${fmt(row.paid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due Investment</p>
                        <p className={`font-semibold ${due > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          ${fmt(due)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Payable Amount</p>
                        <p className={`font-semibold ${due > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                          ${fmt(due)}
                        </p>
                      </div>
                    </div>

                    {overpaid > 0 && (
                      <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Overpaid Amount</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">${fmt(overpaid)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        )}

        {/* Contributions List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Contributions
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Payment history for all investments</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={contributionFilter} onValueChange={setContributionFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-contribution-filter">
                  <SelectValue placeholder="Filter by investor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investors</SelectItem>
                  {allInvestorNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => openContributionDialog()} data-testid="button-add-contribution">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredContributions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No contributions recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2.5 font-medium">Date</th>
                      <th className="text-left p-2.5 font-medium">Investment</th>
                      <th className="text-left p-2.5 font-medium">Investor</th>
                      <th className="text-left p-2.5 font-medium">Category</th>
                      <th className="text-right p-2.5 font-medium">Amount</th>
                      <th className="text-center p-2.5 font-medium">Slip</th>
                      <th className="text-left p-2.5 font-medium">Note</th>
                      <th className="text-right p-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContributions.map((c) => {
                      const inv = investments.find(i => i.id === c.investmentId);
                      return (
                        <tr key={c.id} className="border-b last:border-0" data-testid={`row-contribution-${c.id}`}>
                          <td className="p-2.5">{c.date}</td>
                          <td className="p-2.5 font-medium">{inv?.title || `#${c.investmentId}`}</td>
                          <td className="p-2.5">{c.investorName}</td>
                          <td className="p-2.5">
                            {c.category ? (
                              <Badge variant="secondary" className="text-xs">{c.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-right p-2.5 text-emerald-600 dark:text-emerald-400 font-medium">${fmt(Number(c.amount))}</td>
                          <td className="p-2.5 text-center">
                            {c.paymentSlip ? (
                              <a href={c.paymentSlip} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs hover:underline" data-testid={`link-slip-${c.id}`}>
                                <ImageIcon className="h-3.5 w-3.5" /> View
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground max-w-[200px] truncate">{c.note || "-"}</td>
                          <td className="text-right p-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-contribution-actions-${c.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditContribution({ ...c, _editName: c.investorName, _editAmount: String(c.amount), _editDate: c.date, _editCategory: c.category || "", _editPaymentSlip: c.paymentSlip || "", _editNote: c.note || "" } as any)} className="gap-2">
                                  <Pencil className="h-4 w-4 text-amber-500" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteContributionConfirm(c.id)} className="text-red-600 gap-2">
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {showScrollTop && (
          <Button
            size="icon"
            variant="secondary"
            className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
            onClick={scrollToTop}
            data-testid="button-scroll-to-top"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Manage Investors Dialog */}
      <Dialog open={investorsDialogOpen} onOpenChange={(open) => { setInvestorsDialogOpen(open); if (!open) setEditingInvestor(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Investors</DialogTitle>
            <DialogDescription>Add and edit investors to select when creating investments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{editingInvestor ? "Edit investor" : "Add new investor"}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input placeholder="Name *" value={investorForm.name} onChange={(e) => setInvestorForm((f) => ({ ...f, name: e.target.value }))} data-testid="input-investor-name" />
                <Input placeholder="Email" value={investorForm.email} onChange={(e) => setInvestorForm((f) => ({ ...f, email: e.target.value }))} data-testid="input-investor-email" />
                <Input placeholder="Phone" value={investorForm.phone} onChange={(e) => setInvestorForm((f) => ({ ...f, phone: e.target.value }))} data-testid="input-investor-phone" />
                <Button
                  disabled={!investorForm.name.trim()}
                  onClick={() => {
                    if (editingInvestor) {
                      updateInvestorMutation.mutate({ id: editingInvestor.id, data: investorForm });
                    } else {
                      createInvestorMutation.mutate(investorForm);
                    }
                  }}
                  data-testid="button-save-investor"
                >
                  {editingInvestor ? "Update" : "Add"}
                </Button>
                {editingInvestor && <Button type="button" variant="ghost" onClick={() => { setEditingInvestor(null); setInvestorForm({ name: "", email: "", phone: "", notes: "" }); }}>Cancel</Button>}
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
                      {(inv.email || inv.phone) && <span className="text-xs text-muted-foreground ml-2">{inv.email || inv.phone}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingInvestor(inv); setInvestorForm({ name: inv.name, email: inv.email || "", phone: inv.phone || "", notes: inv.notes || "" }); }}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteInvestorConfirm(inv.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Contribution Dialog */}
      <Dialog open={contributionDialogOpen} onOpenChange={setContributionDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Contribution</DialogTitle>
            <DialogDescription>Record a payment made by an investor toward an investment</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContributionSubmit} className="space-y-3">
            <div>
              <Label>Investment *</Label>
              <Select value={String(contributionForm.investmentId)} onValueChange={(v) => setContributionForm(f => ({ ...f, investmentId: Number(v), investorName: "" }))}>
                <SelectTrigger data-testid="select-contribution-investment"><SelectValue placeholder="Select investment" /></SelectTrigger>
                <SelectContent>
                  {investments.map(inv => (
                    <SelectItem key={inv.id} value={String(inv.id)}>{inv.title} (${fmt(Number(inv.amount))})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Investor *</Label>
              <Select value={contributionForm.investorName} onValueChange={(v) => setContributionForm(f => ({ ...f, investorName: v }))}>
                <SelectTrigger data-testid="select-contribution-investor"><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>
                  {investorsForSelectedInvestment.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  {investorsList.filter(i => !investorsForSelectedInvestment.includes(i.name)).map(i => (
                    <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={contributionForm.category} onValueChange={(v) => setContributionForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-contribution-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount ($) *</Label>
                <Input type="number" step="0.01" required value={contributionForm.amount} onChange={(e) => setContributionForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-contribution-amount" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" required value={contributionForm.date} onChange={(e) => setContributionForm(f => ({ ...f, date: e.target.value }))} data-testid="input-contribution-date" />
              </div>
            </div>
            <div>
              <Label>Payment Slip</Label>
              <div className="flex items-center gap-2 mt-1">
                {contributionForm.paymentSlip ? (
                  <div className="relative group">
                    <img src={contributionForm.paymentSlip} alt="Payment slip" className="h-20 w-20 object-cover rounded-md border" />
                    <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => setContributionForm(f => ({ ...f, paymentSlip: "" }))} data-testid="button-remove-create-slip">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-md px-4 py-2 text-sm text-muted-foreground hover-elevate" data-testid="label-upload-create-slip">
                    <Upload className="h-4 w-4" />
                    {uploadingSlip ? "Uploading..." : "Upload Image"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingSlip} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlipUpload(f, "create"); }} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea rows={2} value={contributionForm.note} onChange={(e) => setContributionForm(f => ({ ...f, note: e.target.value }))} data-testid="input-contribution-note" />
            </div>
            <Button type="submit" className="w-full" disabled={createContributionMutation.isPending || uploadingSlip} data-testid="button-submit-contribution">
              {createContributionMutation.isPending ? "Recording..." : "Record Contribution"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contribution Dialog */}
      <Dialog open={!!editContribution} onOpenChange={(open) => { if (!open) setEditContribution(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contribution</DialogTitle>
            <DialogDescription className="sr-only">Edit contribution details</DialogDescription>
          </DialogHeader>
          {editContribution && (
            <form onSubmit={handleEditContributionSubmit} className="space-y-3">
              <div>
                <Label>Investor</Label>
                <Input value={(editContribution as any)._editName || ""} onChange={(e) => setEditContribution({ ...editContribution, _editName: e.target.value } as any)} data-testid="input-edit-contribution-name" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={(editContribution as any)._editCategory || ""} onValueChange={(v) => setEditContribution({ ...editContribution, _editCategory: v } as any)}>
                  <SelectTrigger data-testid="select-edit-contribution-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" step="0.01" value={(editContribution as any)._editAmount || ""} onChange={(e) => setEditContribution({ ...editContribution, _editAmount: e.target.value } as any)} data-testid="input-edit-contribution-amount" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={(editContribution as any)._editDate || ""} onChange={(e) => setEditContribution({ ...editContribution, _editDate: e.target.value } as any)} data-testid="input-edit-contribution-date" />
                </div>
              </div>
              <div>
                <Label>Payment Slip</Label>
                <div className="flex items-center gap-2 mt-1">
                  {((editContribution as any)._editPaymentSlip ?? editContribution.paymentSlip) ? (
                    <div className="relative group">
                      <img src={(editContribution as any)._editPaymentSlip ?? editContribution.paymentSlip} alt="Payment slip" className="h-20 w-20 object-cover rounded-md border" />
                      <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={() => setEditContribution({ ...editContribution, _editPaymentSlip: "" } as any)} data-testid="button-remove-edit-slip">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-md px-4 py-2 text-sm text-muted-foreground hover-elevate" data-testid="label-upload-edit-slip">
                      <Upload className="h-4 w-4" />
                      {uploadingSlip ? "Uploading..." : "Upload Image"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingSlip} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlipUpload(f, "edit"); }} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea rows={2} value={(editContribution as any)._editNote || ""} onChange={(e) => setEditContribution({ ...editContribution, _editNote: e.target.value } as any)} data-testid="input-edit-contribution-note" />
              </div>
              <Button type="submit" className="w-full" disabled={updateContributionMutation.isPending || uploadingSlip} data-testid="button-update-contribution">
                {updateContributionMutation.isPending ? "Updating..." : "Update Contribution"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Investment Dialog */}
      <Dialog open={!!viewInvestment} onOpenChange={(open) => { if (!open) setViewInvestment(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" /> Investment Details
            </DialogTitle>
            <DialogDescription className="sr-only">View investment details</DialogDescription>
          </DialogHeader>
          {viewInvestment && (() => {
            const invInvestors = ((viewInvestment as any).investors ?? []) as InvestmentInvestor[];
            const invContributions = allContributions.filter(c => c.investmentId === viewInvestment.id);
            const invTotalPaid = invContributions.reduce((s, c) => s + Number(c.amount), 0);
            const invRemaining = Math.max(0, Number(viewInvestment.amount) - invTotalPaid);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Title</p><p className="font-semibold">{viewInvestment.title}</p></div>
                  <div><p className="text-xs text-muted-foreground">Category</p><p><Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-violet-600 dark:text-violet-400">{viewInvestment.category}</Badge></p></div>
                  <div><p className="text-xs text-muted-foreground">Total Amount</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">${fmt(Number(viewInvestment.amount))}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="font-semibold text-emerald-600 dark:text-emerald-400">${fmt(invTotalPaid)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Remaining</p><p className={`font-semibold ${invRemaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>${fmt(invRemaining)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><p><Badge variant="outline" className={`no-default-hover-elevate no-default-active-elevate ${viewInvestment.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-blue-500/10 text-blue-700"}`}>{viewInvestment.status}</Badge></p></div>
                  <div><p className="text-xs text-muted-foreground">Start Date</p><p>{viewInvestment.startDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Return Date</p><p>{viewInvestment.endDate || "-"}</p></div>
                </div>
                {invInvestors.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Investor Shares</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50 border-b"><th className="text-left p-2">Name</th><th className="text-right p-2">Share</th><th className="text-right p-2">Amount</th><th className="text-right p-2">Paid</th><th className="text-right p-2">Due</th></tr></thead>
                        <tbody>
                          {invInvestors.map((i, idx) => {
                            const iPaid = invContributions.filter(c => c.investorName === i.name).reduce((s, c) => s + Number(c.amount), 0);
                            const iDue = Math.max(0, Number(i.amount) - iPaid);
                            return (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="p-2">{i.name}</td>
                                <td className="text-right p-2">{i.sharePercentage}%</td>
                                <td className="text-right p-2 font-medium">${i.amount}</td>
                                <td className="text-right p-2 text-emerald-600 dark:text-emerald-400">${fmt(iPaid)}</td>
                                <td className="text-right p-2">{iDue > 0 ? <span className="text-amber-600 dark:text-amber-400">${fmt(iDue)}</span> : <span className="text-muted-foreground">$0.00</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {invContributions.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment History</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-muted/50 border-b"><th className="text-left p-2">Date</th><th className="text-left p-2">Investor</th><th className="text-right p-2">Amount</th><th className="text-left p-2">Note</th></tr></thead>
                        <tbody>
                          {invContributions.map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="p-2">{c.date}</td>
                              <td className="p-2">{c.investorName}</td>
                              <td className="text-right p-2 text-emerald-600 dark:text-emerald-400 font-medium">${fmt(Number(c.amount))}</td>
                              <td className="p-2 text-muted-foreground">{c.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {viewInvestment.notes && (
                  <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{viewInvestment.notes}</p></div>
                )}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { openEdit(viewInvestment); setViewInvestment(null); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => openContributionDialog(viewInvestment.id)}><CreditCard className="h-3.5 w-3.5 mr-1" /> Record Payment</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Investment Dialog */}
      <Dialog open={!!editInvestment} onOpenChange={(open) => { if (!open) setEditInvestment(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-500" /> Edit Investment
            </DialogTitle>
            <DialogDescription className="sr-only">Edit investment</DialogDescription>
          </DialogHeader>
          {editInvestment && (
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input id="edit-title" required value={editForm.title} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))} data-testid="input-edit-investment-title" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm((f: any) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-edit-investment-category"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-amount">Amount ($) *</Label>
                  <Input id="edit-amount" type="number" step="0.01" required value={editForm.amount} onChange={e => setEditForm((f: any) => ({ ...f, amount: e.target.value }))} data-testid="input-edit-investment-amount" />
                </div>
                <div>
                  <Label htmlFor="edit-returnAmount">Expected Return ($)</Label>
                  <Input id="edit-returnAmount" type="number" step="0.01" value={editForm.returnAmount} onChange={e => setEditForm((f: any) => ({ ...f, returnAmount: e.target.value }))} data-testid="input-edit-investment-return" />
                </div>
              </div>
              <div>
                <Label>Pay by</Label>
                <Select value={editForm.paymentMethod} onValueChange={v => setEditForm((f: any) => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Investors / Share %</Label>
                <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                  {editForm.investors.map((inv: any, idx: number) => {
                    const total = Number(editForm.amount) || 0;
                    const sum = editForm.investors.reduce((s: number, i: any) => s + i.sharePercentage, 0);
                    const scale = sum > 0 ? 100 / sum : 0;
                    const pct = inv.sharePercentage * scale;
                    const computedAmount = ((total * pct) / 100).toFixed(2);
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <Select
                          value={inv.investorId ? String(inv.investorId) : "__custom__"}
                          onValueChange={(v) => {
                            if (v === "__custom__") {
                              setEditForm((f: any) => ({ ...f, investors: f.investors.map((p: any, i: number) => i === idx ? { ...p, investorId: undefined, name: "" } : p) }));
                              return;
                            }
                            const invObj = investorsList.find((i) => i.id === Number(v));
                            if (invObj) setEditForm((f: any) => ({ ...f, investors: f.investors.map((p: any, i: number) => i === idx ? { investorId: invObj.id, name: invObj.name, sharePercentage: p.sharePercentage } : p) }));
                          }}
                        >
                          <SelectTrigger className="flex-1 min-w-[140px]"><SelectValue placeholder="Select investor" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__custom__">Type name...</SelectItem>
                            {investorsList.map((i) => (<SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        {!inv.investorId && (
                          <Input placeholder="Name" value={inv.name} onChange={(e) => setEditForm((f: any) => ({ ...f, investors: f.investors.map((p: any, i: number) => i === idx ? { ...p, name: e.target.value } : p) }))} className="flex-1 min-w-[100px]" />
                        )}
                        <Input type="number" min={0} max={100} step={0.5} placeholder="%" value={inv.sharePercentage || ""} onChange={(e) => setEditForm((f: any) => ({ ...f, investors: f.investors.map((p: any, i: number) => i === idx ? { ...p, sharePercentage: Number(e.target.value) || 0 } : p) }))} className="w-20" />
                        <span className="text-sm text-muted-foreground w-20 shrink-0">= ${computedAmount}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditForm((f: any) => ({ ...f, investors: f.investors.filter((_: any, i: number) => i !== idx) }))} disabled={editForm.investors.length <= 1}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditForm((f: any) => ({ ...f, investors: [...f.investors, { name: "", sharePercentage: 0 }] }))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add investor
                  </Button>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-startDate">Start Date *</Label>
                  <Input id="edit-startDate" type="date" required value={editForm.startDate} onChange={e => setEditForm((f: any) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Return Date</Label>
                  <Input id="edit-endDate" type="date" value={editForm.endDate} onChange={e => setEditForm((f: any) => ({ ...f, endDate: e.target.value }))} />
                </div>
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

      {/* Confirm Dialogs */}
      <ConfirmDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open })} title="Delete Investment?" description="This action cannot be undone." onConfirm={handleConfirmDelete} />
      <ConfirmDialog open={deleteInvestorConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteInvestorConfirm(null); }} title="Delete Investor?" description="Remove this investor from the list." onConfirm={() => { if (deleteInvestorConfirm !== null) deleteInvestorMutation.mutate(deleteInvestorConfirm); setDeleteInvestorConfirm(null); }} />
      <ConfirmDialog open={deleteContributionConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteContributionConfirm(null); }} title="Delete Contribution?" description="This payment record will be removed." onConfirm={() => { if (deleteContributionConfirm !== null) deleteContributionMutation.mutate(deleteContributionConfirm); setDeleteContributionConfirm(null); }} />
      <ConfirmDialog open={deleteCapitalConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteCapitalConfirm(null); }} title="Remove Capital?" description={`Remove ${deleteCapitalConfirm?.investorName}'s capital share? The remaining percentages will be re-normalized to 100%.`} onConfirm={handleCapitalDelete} />

      {/* Add / Edit Capital Dialog */}
      <Dialog open={capitalDialogOpen} onOpenChange={setCapitalDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {capitalEditTarget ? <Pencil className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5 text-blue-500" />}
              {capitalEditTarget ? "Edit Capital" : "Add Capital"}
            </DialogTitle>
            <DialogDescription className="sr-only">{capitalEditTarget ? "Edit capital share" : "Add new capital share"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCapitalSubmit} className="space-y-3">
            <div>
              <Label>Investment *</Label>
              <Select value={String(capitalForm.investmentId)} onValueChange={(v) => setCapitalForm(f => ({ ...f, investmentId: Number(v) }))} disabled={!!capitalEditTarget}>
                <SelectTrigger data-testid="select-capital-investment"><SelectValue placeholder="Select investment" /></SelectTrigger>
                <SelectContent>
                  {investments.map(inv => (
                    <SelectItem key={inv.id} value={String(inv.id)}>{inv.title} (${fmt(Number(inv.amount))})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Investor Name *</Label>
              <Select
                value={investorsList.find(i => i.name === capitalForm.investorName) ? capitalForm.investorName : "__custom__"}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setCapitalForm(f => ({ ...f, investorName: "" }));
                  } else {
                    setCapitalForm(f => ({ ...f, investorName: v }));
                  }
                }}
              >
                <SelectTrigger data-testid="select-capital-investor"><SelectValue placeholder="Select investor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Type name...</SelectItem>
                  {investorsList.map(i => (
                    <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!investorsList.find(i => i.name === capitalForm.investorName) || capitalForm.investorName === "") && (
                <Input
                  className="mt-2"
                  placeholder="Enter investor name"
                  value={capitalForm.investorName}
                  onChange={(e) => setCapitalForm(f => ({ ...f, investorName: e.target.value }))}
                  data-testid="input-capital-investor-name"
                />
              )}
            </div>
            <div>
              <Label>Share Percentage (%) *</Label>
              <Input type="number" min={0.01} max={100} step={0.5} value={capitalForm.sharePercentage || ""} onChange={(e) => setCapitalForm(f => ({ ...f, sharePercentage: Number(e.target.value) || 0 }))} data-testid="input-capital-percentage" />
              {capitalForm.investmentId > 0 && capitalForm.sharePercentage > 0 && (() => {
                const inv = investments.find(i => i.id === capitalForm.investmentId);
                if (!inv) return null;
                const total = Number(inv.amount) || 0;
                const currentInvestors = [...((inv as any).investors ?? [])] as InvestmentInvestor[];
                let sumPct = capitalForm.sharePercentage;
                currentInvestors.forEach((ci, idx) => {
                  if (capitalEditTarget && idx === capitalEditTarget.investorIdx) return;
                  sumPct += ci.sharePercentage;
                });
                const normalizedPct = sumPct > 0 ? Math.round((capitalForm.sharePercentage / sumPct) * 10000) / 100 : 0;
                const computedAmount = ((total * normalizedPct) / 100).toFixed(2);
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    Normalized: {normalizedPct}% = <span className="font-medium text-foreground">${fmt(Number(computedAmount))}</span>
                  </p>
                );
              })()}
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-submit-capital">
              {updateMutation.isPending ? "Saving..." : capitalEditTarget ? "Update Capital" : "Add Capital"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
