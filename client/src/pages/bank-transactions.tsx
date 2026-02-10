import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Landmark, Banknote, CreditCard, Building2, Smartphone, Receipt, TrendingUp } from "lucide-react";
import type { BankTransaction } from "@shared/schema";

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string; progressColor: string }> = {
  cash: { label: "Cash Pay", icon: Banknote, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10", progressColor: "bg-emerald-500" },
  aba: { label: "ABA", icon: Building2, color: "text-blue-500 dark:text-blue-400", bgColor: "bg-blue-500/10", progressColor: "bg-blue-500" },
  acleda: { label: "Acleda", icon: Building2, color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", progressColor: "bg-amber-500" },
  other_bank: { label: "Other Bank", icon: Building2, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-500/10", progressColor: "bg-slate-500" },
  card: { label: "Card Pay", icon: CreditCard, color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10", progressColor: "bg-violet-500" },
  wechat: { label: "WeChat Pay", icon: Smartphone, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10", progressColor: "bg-green-500" },
  gpay: { label: "GPay", icon: Smartphone, color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-500/10", progressColor: "bg-sky-500" },
};

export default function BankTransactionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const { data: transactions = [], isLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions"],
  });

  const { data: bills = [] } = useQuery<any[]>({
    queryKey: ["/api/bills"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bank-transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      setDialogOpen(false);
      toast({ title: "Transaction recorded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      type: form.get("type"),
      amount: form.get("amount"),
      bankName: form.get("bankName"),
      accountNo: form.get("accountNo") || null,
      referenceNo: form.get("referenceNo") || null,
      description: form.get("description") || null,
      date: form.get("date"),
    });
  };

  const totalDeposits = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);

  const filtered = transactions.filter(t =>
    t.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const paymentsByMethod = bills.reduce((acc: Record<string, { count: number; total: number; bills: any[] }>, bill: any) => {
    const method = bill.paymentMethod || "cash";
    if (!acc[method]) acc[method] = { count: 0, total: 0, bills: [] };
    acc[method].count += 1;
    acc[method].total += Number(bill.paidAmount) || 0;
    acc[method].bills.push(bill);
    return acc;
  }, {});

  const totalBillCollections = bills.reduce((s: number, b: any) => s + (Number(b.paidAmount) || 0), 0);

  const filteredBillPayments = bills.filter((b: any) => {
    const matchesSearch = !billSearchTerm ||
      b.billNo?.toLowerCase().includes(billSearchTerm.toLowerCase()) ||
      b.patientName?.toLowerCase().includes(billSearchTerm.toLowerCase());
    const matchesMethod = methodFilter === "all" || b.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const billPaymentColumns = [
    { header: t("billing.billNo"), accessor: (row: any) => (
      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-bill-no-${row.id}`}>{row.billNo}</span>
    )},
    { header: t("billing.patient"), accessor: (row: any) => (
      <span className="text-sm font-medium" data-testid={`text-bill-patient-${row.id}`}>{row.patientName || "-"}</span>
    )},
    { header: t("common.amount"), accessor: (row: any) => (
      <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400" data-testid={`text-bill-amount-${row.id}`}>${Number(row.paidAmount).toFixed(2)}</span>
    )},
    { header: t("billing.paymentMethod"), accessor: (row: any) => {
      const cfg = PAYMENT_METHOD_CONFIG[row.paymentMethod] || { label: row.paymentMethod, icon: Banknote, color: "text-muted-foreground", bgColor: "bg-muted" };
      const Icon = cfg.icon;
      return (
        <Badge variant="outline" className={`no-default-hover-elevate no-default-active-elevate ${cfg.bgColor} ${cfg.color} border text-[10px]`} data-testid={`badge-method-${row.id}`}>
          <Icon className="h-3 w-3 mr-1" />
          {cfg.label}
        </Badge>
      );
    }},
    { header: t("common.status"), accessor: (row: any) => {
      if (row.status === "paid") return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px]" data-testid={`badge-status-${row.id}`}>{t("billing.paid")}</Badge>;
      if (row.status === "partial") return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px]" data-testid={`badge-status-${row.id}`}>{t("billing.partial")}</Badge>;
      return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 text-[10px]" data-testid={`badge-status-${row.id}`}>{t("billing.pending")}</Badge>;
    }},
    { header: t("common.date"), accessor: (row: any) => (
      <span className="text-xs text-muted-foreground">{row.paymentDate || "-"}</span>
    )},
  ];

  const columns = [
    { header: t("common.type"), accessor: (row: BankTransaction) => (
      <div className="flex items-center gap-1.5">
        {row.type === "deposit" ? (
          <div className="p-1 rounded-md bg-emerald-500/10">
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="p-1 rounded-md bg-red-500/10">
            <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </div>
        )}
        <Badge variant="outline" className={row.type === "deposit"
          ? "no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
          : "no-default-hover-elevate no-default-active-elevate bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"
        }>
          {row.type}
        </Badge>
      </div>
    )},
    { header: t("common.amount"), accessor: (row: BankTransaction) => (
      <span className={`font-semibold ${row.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
        {row.type === "deposit" ? "+" : "-"}${row.amount}
      </span>
    )},
    { header: "Bank", accessor: "bankName" as keyof BankTransaction },
    { header: "Account", accessor: (row: BankTransaction) => row.accountNo || "-" },
    { header: t("bank.reference"), accessor: (row: BankTransaction) => row.referenceNo || "-" },
    { header: t("common.description"), accessor: (row: BankTransaction) => (
      <span className="text-xs text-muted-foreground max-w-[150px] truncate block">{row.description || "-"}</span>
    )},
    { header: t("common.date"), accessor: "date" as keyof BankTransaction },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("bank.title")}
        description={t("bank.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-transaction">
                <Plus className="h-4 w-4 mr-1" /> {t("bank.addTransaction")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("bank.addTransaction")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label>{t("common.type")} *</Label>
                  <Select name="type" required>
                    <SelectTrigger data-testid="select-transaction-type"><SelectValue placeholder={t("common.type")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">{t("bank.deposit")}</SelectItem>
                      <SelectItem value="withdrawal">{t("bank.withdrawal")}</SelectItem>
                      <SelectItem value="transfer">{t("bank.transfer")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">{t("common.amount")} ($) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-transaction-amount" />
                  </div>
                  <div>
                    <Label htmlFor="date">{t("common.date")} *</Label>
                    <Input id="date" name="date" type="date" required data-testid="input-transaction-date" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input id="bankName" name="bankName" required data-testid="input-transaction-bank" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="accountNo">Account No</Label>
                    <Input id="accountNo" name="accountNo" data-testid="input-transaction-account" />
                  </div>
                  <div>
                    <Label htmlFor="referenceNo">{t("bank.reference")} No</Label>
                    <Input id="referenceNo" name="referenceNo" data-testid="input-transaction-reference" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">{t("common.description")}</Label>
                  <Textarea id="description" name="description" rows={2} data-testid="input-transaction-description" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-transaction">
                  {createMutation.isPending ? t("common.saving") : t("bank.addTransaction")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="bank-summary-stats">
          <Card data-testid="stat-deposits-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 shrink-0`}>
                  <ArrowDownLeft className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("bank.totalDeposits")}</p>
                  <p className="text-xl font-bold" data-testid="stat-deposits">${totalDeposits.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-withdrawals-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-red-500 to-red-600 shrink-0`}>
                  <ArrowUpRight className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("bank.totalWithdrawals")}</p>
                  <p className="text-xl font-bold" data-testid="stat-withdrawals">${totalWithdrawals.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-net-balance-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shrink-0`}>
                  <Landmark className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("bank.balance")}</p>
                  <p className="text-xl font-bold" data-testid="stat-net-balance">${(totalDeposits - totalWithdrawals).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-bill-collections-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-violet-600 shrink-0`}>
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("bank.billCollections")}</p>
                  <p className="text-xl font-bold" data-testid="stat-bill-collections">${totalBillCollections.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="collections" className="space-y-4">
          <TabsList className="bg-muted/60 p-1" data-testid="tabs-bank-transactions">
            <TabsTrigger value="collections" className="data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-400" data-testid="tab-collections">
              <Receipt className="h-4 w-4 mr-1.5 text-violet-500" /> {t("bank.billCollections")}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400" data-testid="tab-transactions">
              <Landmark className="h-4 w-4 mr-1.5 text-blue-500" /> {t("bank.bankTransactions")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="payment-method-summary">
              {Object.entries(paymentsByMethod)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([method, data]) => {
                  const cfg = PAYMENT_METHOD_CONFIG[method] || { label: method, icon: Banknote, color: "text-muted-foreground", bgColor: "bg-muted" };
                  const Icon = cfg.icon;
                  const pct = totalBillCollections > 0 ? ((data.total / totalBillCollections) * 100).toFixed(1) : "0";
                  return (
                    <Card key={method} className="hover-elevate cursor-pointer" onClick={() => setMethodFilter(methodFilter === method ? "all" : method)} data-testid={`card-method-${method}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className={`p-1.5 rounded-md ${cfg.bgColor}`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{data.count} bills</Badge>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
                        <p className={`text-lg font-bold ${cfg.color}`} data-testid={`stat-method-total-${method}`}>${data.total.toFixed(2)}</p>
                        <div className="mt-1.5 w-full bg-muted rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${cfg.progressColor}`} style={{ width: `${pct}%`, opacity: 0.8 }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{pct}% of total</p>
                      </CardContent>
                    </Card>
                  );
                })}
              {Object.keys(paymentsByMethod).length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <div className="mx-auto mb-3 p-3 rounded-full bg-violet-500/10 w-fit">
                    <Receipt className="h-6 w-6 text-violet-500" />
                  </div>
                  <p className="text-sm font-medium">{t("common.noData")}</p>
                  <p className="text-xs mt-1">Bill payment records will appear here</p>
                </div>
              )}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Receipt className="h-4 w-4 text-violet-500" />
                  <CardTitle className="text-sm font-semibold">{t("bank.billCollections")}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{filteredBillPayments.length}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-36 text-xs" data-testid="select-method-filter">
                      <SelectValue placeholder={t("common.all")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="filter-method-all">{t("common.all")}</SelectItem>
                      {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key} data-testid={`filter-method-${key}`}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("common.search")}
                      className="pl-8 text-xs"
                      value={billSearchTerm}
                      onChange={(e) => setBillSearchTerm(e.target.value)}
                      data-testid="input-search-bill-payments"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={billPaymentColumns} data={filteredBillPayments} isLoading={false} emptyMessage={t("common.noData")} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Landmark className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold">{t("bank.bankTransactions")}</CardTitle>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("common.search")}
                    className="pl-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-transactions"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage={t("common.noData")} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
