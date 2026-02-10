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
import { Plus, Search, Receipt, TrendingDown, Calendar } from "lucide-react";
import type { Expense } from "@shared/schema";

const EXPENSE_CATEGORIES = [
  "Rent", "Salaries", "Utilities", "Medical Supplies", "Equipment",
  "Maintenance", "Insurance", "Marketing", "Travel", "Miscellaneous"
];

export default function ExpensesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
    });
  };

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + Number(e.amount), 0);

  const columns = [
    { header: "Category", accessor: (row: Expense) => <Badge variant="outline">{row.category}</Badge> },
    { header: "Description", accessor: "description" as keyof Expense },
    { header: "Amount", accessor: (row: Expense) => <span className="font-medium text-red-600 dark:text-red-400">${row.amount}</span> },
    { header: "Method", accessor: (row: Expense) => <Badge variant="secondary">{row.paymentMethod}</Badge> },
    { header: "Date", accessor: "date" as keyof Expense },
    { header: "Notes", accessor: (row: Expense) => (
      <span className="text-xs text-muted-foreground max-w-[150px] truncate block">{row.notes || "-"}</span>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Expense Management"
        description="Track and manage clinic expenses"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-expense">
                <Plus className="h-4 w-4 mr-1" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label>Category *</Label>
                  <Select name="category" required>
                    <SelectTrigger data-testid="select-expense-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input id="description" name="description" required data-testid="input-expense-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-expense-amount" />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input id="date" name="date" type="date" required data-testid="input-expense-date" />
                  </div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select name="paymentMethod" defaultValue="cash">
                    <SelectTrigger data-testid="select-expense-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} data-testid="input-expense-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-expense">
                  {createMutation.isPending ? "Recording..." : "Record Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatsCard title="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} icon={Receipt} />
          <StatsCard title="This Month" value={`$${thisMonthExpenses.toFixed(2)}`} icon={Calendar} />
          <StatsCard title="Entries" value={expenses.length} icon={TrendingDown} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Expenses</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-expenses"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No expenses recorded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
