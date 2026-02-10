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
import { Plus, Search, TrendingUp, DollarSign, Briefcase } from "lucide-react";
import type { Investment } from "@shared/schema";

const INVESTMENT_CATEGORIES = [
  "Equipment", "Real Estate", "Expansion", "Technology",
  "Marketing", "Training", "Research", "Other"
];

export default function InvestmentsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalReturns = investments.reduce((s, i) => s + Number(i.returnAmount || 0), 0);
  const activeCount = investments.filter(i => i.status === "active").length;

  const filtered = investments.filter(i =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.investorName?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const columns = [
    { header: "Title", accessor: "title" as keyof Investment },
    { header: "Category", accessor: (row: Investment) => <Badge variant="outline">{row.category}</Badge> },
    { header: "Amount", accessor: (row: Investment) => <span className="font-medium">${row.amount}</span> },
    { header: "Returns", accessor: (row: Investment) => <span className="text-green-600 dark:text-green-400">${row.returnAmount || "0"}</span> },
    { header: "Investor", accessor: (row: Investment) => row.investorName || "-" },
    { header: "Status", accessor: (row: Investment) => (
      <Badge variant={row.status === "active" ? "default" : row.status === "completed" ? "secondary" : "destructive"}>
        {row.status}
      </Badge>
    )},
    { header: "Start Date", accessor: "startDate" as keyof Investment },
    { header: "End Date", accessor: (row: Investment) => row.endDate || "-" },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Investment Management"
        description="Track clinic investments and returns"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-investment">
                <Plus className="h-4 w-4 mr-1" /> Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record New Investment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required data-testid="input-investment-title" />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select name="category" required>
                    <SelectTrigger data-testid="select-investment-category"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required data-testid="input-investment-amount" />
                  </div>
                  <div>
                    <Label htmlFor="returnAmount">Expected Return ($)</Label>
                    <Input id="returnAmount" name="returnAmount" type="number" step="0.01" data-testid="input-investment-return" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="investorName">Investor Name</Label>
                  <Input id="investorName" name="investorName" data-testid="input-investment-investor" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input id="startDate" name="startDate" type="date" required data-testid="input-investment-start" />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" data-testid="input-investment-end" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} data-testid="input-investment-notes" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-investment">
                  {createMutation.isPending ? "Recording..." : "Record Investment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatsCard title="Total Invested" value={`$${totalInvested.toFixed(2)}`} icon={DollarSign} />
          <StatsCard title="Total Returns" value={`$${totalReturns.toFixed(2)}`} icon={TrendingUp} />
          <StatsCard title="Active Investments" value={activeCount} icon={Briefcase} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Investments</CardTitle>
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
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No investments recorded" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
