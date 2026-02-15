import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Search, Package, DollarSign, ShoppingCart, CheckCircle2, Clock,
  MoreHorizontal, Eye, Pencil, Trash2, X, CreditCard, Banknote,
  CalendarDays, Pill, TrendingUp, AlertTriangle
} from "lucide-react";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";
import type { MedicinePurchase, Medicine } from "@shared/schema";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "aba", label: "ABA" },
  { value: "acleda", label: "Acleda" },
  { value: "card", label: "Card" },
  { value: "other_bank", label: "Other Bank" },
];

const UNIT_TYPES = ["Pcs", "Box", "Bottle", "Jar", "Liter", "Pack", "Strip", "Tube", "Vial", "Ampule"];

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 no-default-hover-elevate no-default-active-elevate">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 no-default-hover-elevate no-default-active-elevate">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 no-default-hover-elevate no-default-active-elevate">Pending</Badge>;
  }
}

function getPaymentBadge(method: string) {
  const colors: Record<string, string> = {
    cash: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
    aba: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20",
    acleda: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
    card: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20",
    other_bank: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20",
  };
  const label = PAYMENT_METHODS.find(m => m.value === method)?.label || method;
  return <Badge variant="outline" className={`${colors[method] || colors.other_bank} no-default-hover-elevate no-default-active-elevate`}>{label}</Badge>;
}

function generatePurchaseNo(purchases: MedicinePurchase[]): string {
  const count = purchases.length + 1;
  return `PUR-${String(count).padStart(4, "0")}`;
}

export default function MedicinePurchasesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPurchase, setEditPurchase] = useState<MedicinePurchase | null>(null);
  const [viewPurchase, setViewPurchase] = useState<MedicinePurchase | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, monthYear, setMonthYear, dateRange } = useDateFilter();

  const { data: purchases = [], isLoading } = useQuery<MedicinePurchase[]>({
    queryKey: ["/api/medicine-purchases"],
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/medicine-purchases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicine-purchases"] });
      setDialogOpen(false);
      toast({ title: "Purchase recorded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/medicine-purchases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicine-purchases"] });
      setEditPurchase(null);
      toast({ title: "Purchase updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/medicine-purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medicine-purchases"] });
      toast({ title: "Purchase deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = purchases.filter(p => {
    const matchSearch = !searchTerm ||
      p.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchPayment = filterPayment === "all" || p.paymentMethod === filterPayment;
    const matchDate = isDateInRange(p.purchaseDate, dateRange);
    return matchSearch && matchStatus && matchPayment && matchDate;
  });

  const totalPurchaseValue = filtered.reduce((sum, p) => sum + parseFloat(p.totalPrice || "0"), 0);
  const completedCount = filtered.filter(p => p.status === "completed").length;
  const pendingCount = filtered.filter(p => p.status === "pending").length;
  const avgPurchaseValue = filtered.length > 0 ? totalPurchaseValue / filtered.length : 0;

  const columns = [
    {
      header: "Purchase No",
      accessor: (row: MedicinePurchase) => (
        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-purchase-no-${row.id}`}>{row.purchaseNo}</span>
      ),
    },
    {
      header: "Medicine",
      accessor: (row: MedicinePurchase) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500/10">
            <Pill className="h-4 w-4 text-orange-500" />
          </div>
          <span className="font-medium text-sm" data-testid={`text-medicine-name-${row.id}`}>{row.medicineName}</span>
        </div>
      ),
    },
    {
      header: "Supplier",
      accessor: (row: MedicinePurchase) => (
        <span className="text-sm text-muted-foreground">{row.supplier || "-"}</span>
      ),
    },
    {
      header: "Qty",
      accessor: (row: MedicinePurchase) => (
        <span className="text-sm font-medium">{row.quantity} {row.unitType}</span>
      ),
    },
    {
      header: "Unit Price",
      accessor: (row: MedicinePurchase) => (
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">${parseFloat(row.purchasePrice || "0").toFixed(2)}</span>
      ),
    },
    {
      header: "Total",
      accessor: (row: MedicinePurchase) => (
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300" data-testid={`text-total-${row.id}`}>${parseFloat(row.totalPrice || "0").toFixed(2)}</span>
      ),
    },
    {
      header: "Date",
      accessor: (row: MedicinePurchase) => (
        <span className="text-sm text-muted-foreground">{row.purchaseDate}</span>
      ),
    },
    {
      header: "Payment",
      accessor: (row: MedicinePurchase) => getPaymentBadge(row.paymentMethod),
    },
    {
      header: "Status",
      accessor: (row: MedicinePurchase) => getStatusBadge(row.status),
    },
    {
      header: "",
      accessor: (row: MedicinePurchase) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid={`button-actions-${row.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewPurchase(row)} data-testid={`button-view-${row.id}`}>
              <Eye className="h-4 w-4 mr-2 text-blue-500" />View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditPurchase(row)} data-testid={`button-edit-${row.id}`}>
              <Pencil className="h-4 w-4 mr-2 text-amber-500" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteConfirm({ open: true, id: row.id })} className="text-red-600 dark:text-red-400" data-testid={`button-delete-${row.id}`}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Medicine Purchase Record" />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Purchases"
            value={filtered.length}
            icon={ShoppingCart}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          />
          <StatsCard
            title="Total Value"
            value={`$${totalPurchaseValue.toFixed(2)}`}
            icon={DollarSign}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
          />
          <StatsCard
            title="Completed"
            value={completedCount}
            icon={CheckCircle2}
            iconColor="text-teal-500"
            iconBg="bg-teal-500/10"
          />
          <StatsCard
            title="Pending"
            value={pendingCount}
            icon={Clock}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          />
        </div>

        <DateFilterBar
          datePeriod={datePeriod}
          setDatePeriod={setDatePeriod}
          customFromDate={customFromDate}
          setCustomFromDate={setCustomFromDate}
          customToDate={customToDate}
          setCustomToDate={setCustomToDate}
          monthYear={monthYear}
          setMonthYear={setMonthYear}
          dateRange={dateRange}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by medicine, purchase no, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-payment">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-purchase">
            <Plus className="h-4 w-4 mr-2" />New Purchase
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No purchase records found"
        />
      </div>

      <PurchaseFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        medicines={medicines}
        defaultPurchaseNo={generatePurchaseNo(purchases)}
      />

      {editPurchase && (
        <PurchaseFormDialog
          open={!!editPurchase}
          onClose={() => setEditPurchase(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editPurchase.id, data })}
          isPending={updateMutation.isPending}
          medicines={medicines}
          initialData={editPurchase}
        />
      )}

      {viewPurchase && (
        <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Purchase Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Purchase No" value={viewPurchase.purchaseNo} />
                <DetailRow label="Medicine" value={viewPurchase.medicineName} />
                <DetailRow label="Supplier" value={viewPurchase.supplier || "-"} />
                <DetailRow label="Quantity" value={`${viewPurchase.quantity} ${viewPurchase.unitType}`} />
                <DetailRow label="Unit Price" value={`$${parseFloat(viewPurchase.purchasePrice || "0").toFixed(2)}`} />
                <DetailRow label="Total Price" value={`$${parseFloat(viewPurchase.totalPrice || "0").toFixed(2)}`} highlight />
                <DetailRow label="Batch No" value={viewPurchase.batchNo || "-"} />
                <DetailRow label="Expiry Date" value={viewPurchase.expiryDate || "-"} />
                <DetailRow label="Purchase Date" value={viewPurchase.purchaseDate} />
                <div>
                  <span className="text-xs text-muted-foreground">Payment</span>
                  <div className="mt-1">{getPaymentBadge(viewPurchase.paymentMethod)}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-1">{getStatusBadge(viewPurchase.status)}</div>
                </div>
              </div>
              {viewPurchase.notes && (
                <div>
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <p className="text-sm mt-1">{viewPurchase.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open })}
        title="Delete Purchase Record"
        description="Are you sure you want to delete this purchase record? This action cannot be undone."
        onConfirm={() => {
          if (deleteConfirm.id) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm({ open: false });
        }}
        variant="destructive"
      />
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`text-sm mt-0.5 ${highlight ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function PurchaseFormDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  medicines,
  initialData,
  defaultPurchaseNo,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  medicines: Medicine[];
  initialData?: MedicinePurchase | null;
  defaultPurchaseNo?: string;
}) {
  const [form, setForm] = useState({
    purchaseNo: initialData?.purchaseNo || defaultPurchaseNo || "",
    medicineId: initialData?.medicineId || null as number | null,
    medicineName: initialData?.medicineName || "",
    supplier: initialData?.supplier || "",
    quantity: initialData?.quantity || 1,
    unitType: initialData?.unitType || "Pcs",
    purchasePrice: initialData?.purchasePrice || "0",
    totalPrice: initialData?.totalPrice || "0",
    batchNo: initialData?.batchNo || "",
    expiryDate: initialData?.expiryDate || "",
    paymentMethod: initialData?.paymentMethod || "cash",
    status: initialData?.status || "completed",
    notes: initialData?.notes || "",
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split("T")[0],
  });

  const updateField = (field: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "quantity" || field === "purchasePrice") {
        const qty = field === "quantity" ? value : prev.quantity;
        const price = field === "purchasePrice" ? value : prev.purchasePrice;
        next.totalPrice = (qty * parseFloat(price || "0")).toFixed(2);
      }
      return next;
    });
  };

  const handleMedicineSelect = (medicineId: string) => {
    if (medicineId === "custom") {
      updateField("medicineId", null);
      updateField("medicineName", "");
      return;
    }
    const med = medicines.find(m => m.id === parseInt(medicineId));
    if (med) {
      setForm(prev => ({
        ...prev,
        medicineId: med.id,
        medicineName: med.name,
        purchasePrice: med.boxPrice || "0",
        totalPrice: (prev.quantity * parseFloat(med.boxPrice || "0")).toFixed(2),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineName.trim()) return;
    onSubmit({
      ...form,
      purchasePrice: form.purchasePrice.toString(),
      totalPrice: form.totalPrice.toString(),
      medicineId: form.medicineId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            {initialData ? "Edit Purchase" : "New Purchase Record"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Purchase No</Label>
              <Input
                value={form.purchaseNo}
                onChange={(e) => updateField("purchaseNo", e.target.value)}
                data-testid="input-purchase-no"
              />
            </div>
            <div>
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => updateField("purchaseDate", e.target.value)}
                data-testid="input-purchase-date"
              />
            </div>
          </div>

          <div>
            <Label>Medicine</Label>
            <Select
              value={form.medicineId ? form.medicineId.toString() : "custom"}
              onValueChange={handleMedicineSelect}
            >
              <SelectTrigger data-testid="select-medicine">
                <SelectValue placeholder="Select medicine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Entry</SelectItem>
                {medicines.map(m => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(!form.medicineId || form.medicineId === null) && (
            <div>
              <Label>Medicine Name</Label>
              <Input
                value={form.medicineName}
                onChange={(e) => updateField("medicineName", e.target.value)}
                placeholder="Enter medicine name"
                data-testid="input-medicine-name"
              />
            </div>
          )}

          <div>
            <Label>Supplier</Label>
            <Input
              value={form.supplier}
              onChange={(e) => updateField("supplier", e.target.value)}
              placeholder="Supplier name"
              data-testid="input-supplier"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => updateField("quantity", parseInt(e.target.value) || 0)}
                data-testid="input-quantity"
              />
            </div>
            <div>
              <Label>Unit Type</Label>
              <Select value={form.unitType} onValueChange={(v) => updateField("unitType", v)}>
                <SelectTrigger data-testid="select-unit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.purchasePrice}
                onChange={(e) => updateField("purchasePrice", e.target.value)}
                data-testid="input-purchase-price"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Price</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300" data-testid="text-form-total">
              ${parseFloat(form.totalPrice).toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Batch No</Label>
              <Input
                value={form.batchNo}
                onChange={(e) => updateField("batchNo", e.target.value)}
                placeholder="Batch number"
                data-testid="input-batch-no"
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => updateField("expiryDate", e.target.value)}
                data-testid="input-expiry-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => updateField("paymentMethod", v)}>
                <SelectTrigger data-testid="select-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              data-testid="input-notes"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.medicineName.trim()} data-testid="button-submit-purchase">
              {isPending ? "Saving..." : initialData ? "Update" : "Save Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
