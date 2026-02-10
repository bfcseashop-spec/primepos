import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, AlertTriangle } from "lucide-react";
import type { Medicine } from "@shared/schema";

const MEDICINE_CATEGORIES = [
  "Tablet", "Capsule", "Syrup", "Injection", "Cream",
  "Ointment", "Drops", "Inhaler", "Powder", "Other"
];

export default function MedicinesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/medicines", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setDialogOpen(false);
      toast({ title: "Medicine added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name"),
      genericName: form.get("genericName") || null,
      category: form.get("category") || null,
      manufacturer: form.get("manufacturer") || null,
      batchNo: form.get("batchNo") || null,
      expiryDate: form.get("expiryDate") || null,
      quantity: Number(form.get("quantity") || 0),
      unitPrice: form.get("unitPrice"),
      sellingPrice: form.get("sellingPrice"),
      isActive: true,
    });
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const lowStock = medicines.filter(m => m.quantity < 10 && m.isActive);

  const columns = [
    { header: "Medicine", accessor: (row: Medicine) => (
      <div>
        <span className="font-medium text-sm">{row.name}</span>
        {row.genericName && <span className="block text-xs text-muted-foreground">{row.genericName}</span>}
      </div>
    )},
    { header: "Category", accessor: (row: Medicine) => <Badge variant="outline">{row.category || "-"}</Badge> },
    { header: "Batch", accessor: (row: Medicine) => row.batchNo || "-" },
    { header: "Stock", accessor: (row: Medicine) => (
      <div className="flex items-center gap-1.5">
        <span className={row.quantity < 10 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{row.quantity}</span>
        {row.quantity < 10 && <AlertTriangle className="h-3 w-3 text-red-500" />}
      </div>
    )},
    { header: "Buy Price", accessor: (row: Medicine) => `$${row.unitPrice}` },
    { header: "Sell Price", accessor: (row: Medicine) => <span className="font-medium">${row.sellingPrice}</span> },
    { header: "Expiry", accessor: (row: Medicine) => row.expiryDate || "-" },
    { header: "Status", accessor: (row: Medicine) => (
      <Badge variant={row.isActive ? "default" : "secondary"}>
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Medicine Management"
        description="Manage medicine inventory and pricing"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-medicine">
                <Plus className="h-4 w-4 mr-1" /> Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Medicine</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="name">Medicine Name *</Label>
                    <Input id="name" name="name" required data-testid="input-medicine-name" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="genericName">Generic Name</Label>
                    <Input id="genericName" name="genericName" data-testid="input-medicine-generic" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select name="category">
                      <SelectTrigger data-testid="select-medicine-category"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {MEDICINE_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input id="manufacturer" name="manufacturer" data-testid="input-medicine-manufacturer" />
                  </div>
                  <div>
                    <Label htmlFor="batchNo">Batch No</Label>
                    <Input id="batchNo" name="batchNo" data-testid="input-medicine-batch" />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" data-testid="input-medicine-expiry" />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input id="quantity" name="quantity" type="number" required data-testid="input-medicine-qty" />
                  </div>
                  <div>
                    <Label htmlFor="unitPrice">Buy Price ($) *</Label>
                    <Input id="unitPrice" name="unitPrice" type="number" step="0.01" required data-testid="input-medicine-unit-price" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="sellingPrice">Selling Price ($) *</Label>
                    <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" required data-testid="input-medicine-selling-price" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-medicine">
                  {createMutation.isPending ? "Adding..." : "Add Medicine"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {lowStock.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                {lowStock.length} medicine(s) with low stock (below 10 units)
              </span>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Medicines</CardTitle>
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
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No medicines yet" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
