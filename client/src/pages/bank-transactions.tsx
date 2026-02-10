import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  cash: { label: "Cash Pay", icon: Banknote, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-950/50" },
  aba: { label: "ABA", icon: Building2, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950/50" },
  acleda: { label: "Acleda", icon: Building2, color: "text-yellow-700 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-950/50" },
  other_bank: { label: "Other Bank", icon: Building2, color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/50" },
  card: { label: "Card Pay", icon: CreditCard, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950/50" },
  wechat: { label: "WeChat Pay", icon: Smartphone, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-950/50" },
  gpay: { label: "GPay", icon: Smartphone, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-950/50" },
};

export default function BankTransactionsPage() {
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
    { header: "Bill #", accessor: (row: any) => (
      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-bill-no-${row.id}`}>{row.billNo}</span>
    )},
    { header: "Patient", accessor: (row: any) => (
      <span className="text-sm font-medium" data-testid={`text-bill-patient-${row.id}`}>{row.patientName || "-"}</span>
    )},
    { header: "Amount", accessor: (row: any) => (
      <span className="font-semibold text-sm text-green-600 dark:text-green-400" data-testid={`text-bill-amount-${row.id}`}>${Number(row.paidAmount).toFixed(2)}</span>
    )},
    { header: "Method", accessor: (row: any) => {
      const cfg = PAYMENT_METHOD_CONFIG[row.paymentMethod] || { label: row.paymentMethod, icon: Banknote, color: "text-muted-foreground", bgColor: "bg-muted" };
      const Icon = cfg.icon;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.bgColor} ${cfg.color}`} data-testid={`badge-method-${row.id}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      );
    }},
    { header: "Status", accessor: (row: any) => {
      if (row.status === "paid") return <Badge variant="default" className="bg-green-600 text-[10px]" data-testid={`badge-status-${row.id}`}>Paid</Badge>;
      if (row.status === "partial") return <Badge variant="secondary" className="text-[10px]" data-testid={`badge-status-${row.id}`}>Partial</Badge>;
      return <Badge variant="outline" className="text-[10px]" data-testid={`badge-status-${row.id}`}>Unpaid</Badge>;
    }},
    { header: "Date", accessor: (row: any) => (
      <span className="text-xs text-muted-foreground">{row.paymentDate || "-"}</span>
    )},
  ];

  const columns = [
    { header: "Type", accessor: (row: BankTransaction) => (
      <div className="flex items-center gap-1.5">
        {row.type === "deposit" ? (
          <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
        )}
        <Badge variant={row.type === "deposit" ? "default" : "secondary"}>
          {row.type}
        </Badge>
      </div>
    )},
    { header: "Amount", accessor: (row: BankTransaction) => (
      <span className={`font-medium ${row.type === "deposit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
        {row.type === "deposit" ? "+" : "-"}${row.amount}
      </span>
    )},
    { header: "Bank", accessor: "bankName" as keyof BankTransaction },
    { header: "Account", accessor: (row: BankTransaction) => row.accountNo || "-" },
    { header: "Reference", accessor: (row: BankTransaction) => row.referenceNo || "-" },
    { header: "Description", accessor: (row: BankTransaction) => (
      <span className="text-xs text-muted-foreground max-w-[150px] truncate block">{row.description || "-"}</span>
    )},
    { header: "Date", accessor: "date" as keyof BankTransaction },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Bank Transactions"
        description="Track deposits, withdrawals, and bill payment collections"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-transaction">
                <Plus className="h-4 w-4 mr-1" /> Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Bank Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label>Type *</Label>
                  <Select name="type" required>
                    <SelectTrigger data-testid="select-transaction-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-transaction-amount" />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
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
                    <Label htmlFor="referenceNo">Reference No</Label>
                    <Input id="referenceNo" name="referenceNo" data-testid="input-transaction-reference" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={2} data-testid="input-transaction-description" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-transaction">
                  {createMutation.isPending ? "Recording..." : "Record Transaction"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="bank-summary-stats">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/50">
                <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Deposits</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="stat-deposits">${totalDeposits.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/50">
                <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Withdrawals</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="stat-withdrawals">${totalWithdrawals.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Net Balance</p>
                <p className="text-lg font-bold" data-testid="stat-net-balance">${(totalDeposits - totalWithdrawals).toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Bill Collections</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="stat-bill-collections">${totalBillCollections.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="collections" className="space-y-4">
          <TabsList data-testid="tabs-bank-transactions">
            <TabsTrigger value="collections" data-testid="tab-collections">
              <Receipt className="h-4 w-4 mr-1.5" /> Bill Collections
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <Landmark className="h-4 w-4 mr-1.5" /> Bank Transactions
            </TabsTrigger>
          </TabsList>

          {/* Bill Collections Tab */}
          <TabsContent value="collections" className="space-y-4">
            {/* Payment Method Summary Cards */}
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
                          <div className={`h-1.5 rounded-full ${cfg.bgColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{pct}% of total</p>
                      </CardContent>
                    </Card>
                  );
                })}
              {Object.keys(paymentsByMethod).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">No bill payments collected yet</div>
              )}
            </div>

            {/* Bill Payments Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Bill Payment Records</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{filteredBillPayments.length}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-36 text-xs" data-testid="select-method-filter">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="filter-method-all">All Methods</SelectItem>
                      {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key} data-testid={`filter-method-${key}`}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search bills..."
                      className="pl-8 text-xs"
                      value={billSearchTerm}
                      onChange={(e) => setBillSearchTerm(e.target.value)}
                      data-testid="input-search-bill-payments"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={billPaymentColumns} data={filteredBillPayments} isLoading={false} emptyMessage="No bill payments found" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">All Transactions</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-transactions"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No transactions recorded" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
