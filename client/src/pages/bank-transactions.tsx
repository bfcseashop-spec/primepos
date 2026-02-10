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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Landmark } from "lucide-react";
import type { BankTransaction } from "@shared/schema";

export default function BankTransactionsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: transactions = [], isLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions"],
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
        description="Track deposits and withdrawals"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatsCard title="Total Deposits" value={`$${totalDeposits.toFixed(2)}`} icon={ArrowDownLeft} />
          <StatsCard title="Total Withdrawals" value={`$${totalWithdrawals.toFixed(2)}`} icon={ArrowUpRight} />
          <StatsCard title="Net Balance" value={`$${(totalDeposits - totalWithdrawals).toFixed(2)}`} icon={Landmark} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Transactions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8 h-8 text-sm"
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
      </div>
    </div>
  );
}
