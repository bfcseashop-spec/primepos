import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Trash2, DollarSign, Percent, FileText, Printer, CreditCard, ArrowLeft, X, MoreHorizontal, Eye, Pencil } from "lucide-react";
import type { Patient, Service, Medicine, BillItem, User, ClinicSettings } from "@shared/schema";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash Pay" },
  { value: "aba", label: "ABA" },
  { value: "acleda", label: "Acleda" },
  { value: "other_bank", label: "Other Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "card", label: "Card Pay" },
  { value: "gpay", label: "GPay" },
  { value: "wechat", label: "WeChat Pay" },
];

export default function BillingPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [discount, setDiscount] = useState("0");
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceDoctor, setReferenceDoctor] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: bills = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bills"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: settings } = useQuery<ClinicSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: medicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const doctorNames = users
    .filter((u) => u.fullName?.toLowerCase().startsWith("dr"))
    .map((u) => u.fullName);

  const [billAction, setBillAction] = useState<"create" | "print" | "payment">("create");
  const [showPreview, setShowPreview] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);
  const [editBill, setEditBill] = useState<any>(null);

  const getPaymentLabel = (method: string) => {
    const found = PAYMENT_METHODS.find(p => p.value === method);
    return found ? found.label : method;
  };

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bills", data);
      return res.json();
    },
    onSuccess: (bill: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      if (billAction === "print") {
        printReceipt(bill);
        toast({ title: "Bill created and receipt printed" });
      } else if (billAction === "payment") {
        toast({ title: "Bill created with payment recorded" });
      } else {
        toast({ title: "Bill created successfully" });
      }

      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Bill deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/bills/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditBill(null);
      toast({ title: "Bill updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const printReceipt = (bill: any) => {
    const patient = patients.find(p => p.id === Number(selectedPatient || bill.patientId));
    const items = bill.items || billItems;
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;
    const clinicName = settings?.clinicName || "Prime Clinic";
    const clinicEmail = settings?.email || "info@primeclinic.com";
    const clinicPhone = settings?.phone || "";
    const clinicAddress = settings?.address || "";
    const statusLabel = bill.status === "paid" ? "Paid" : "Pending";
    const statusColor = bill.status === "paid" ? "#16a34a" : "#f59e0b";
    const dateStr = bill.paymentDate || new Date().toISOString().split("T")[0];
    const formattedDate = new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const itemRows = (Array.isArray(items) ? items : []).map((item: any, idx: number) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;">${idx + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html><head><title>Invoice - ${bill.billNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 30px; max-width: 800px; margin: 0 auto; font-size: 13px; }
        @media print { body { padding: 15px; } }
      </style></head><body>

        <!-- Header -->
        <table style="width:100%;margin-bottom:20px;">
          <tr>
            <td style="width:50%;vertical-align:middle;">
              ${settings?.logo ? `<img src="${settings.logo}" alt="Logo" style="max-height:50px;margin-bottom:4px;display:block;" />` : ""}
              <div style="font-size:18px;font-weight:700;color:#0f766e;">${clinicName}</div>
              ${clinicAddress ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${clinicAddress}</div>` : ""}
              ${clinicPhone ? `<div style="font-size:11px;color:#6b7280;">${clinicPhone}</div>` : ""}
              ${clinicEmail ? `<div style="font-size:11px;color:#6b7280;">${clinicEmail}</div>` : ""}
            </td>
            <td style="width:50%;text-align:right;vertical-align:top;">
              <div style="font-size:24px;font-weight:800;color:#1f2937;letter-spacing:1px;">INVOICE</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">Invoice #: <strong>${bill.billNo}</strong></div>
              <div style="font-size:12px;color:#6b7280;">Date: ${formattedDate}</div>
              <div style="margin-top:6px;">
                <span style="display:inline-block;padding:3px 12px;border-radius:4px;font-size:11px;font-weight:600;color:white;background:${statusColor};">${statusLabel}</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Patient & Payment Info -->
        <table style="width:100%;margin-bottom:18px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:12px 14px;width:50%;vertical-align:top;">
              <div style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;">Patient</div>
              <div style="font-size:13px;font-weight:600;">${patient?.name || "N/A"}</div>
              ${patient?.patientId ? `<div style="font-size:11px;color:#6b7280;">ID: ${patient.patientId}</div>` : ""}
              ${patient?.gender ? `<div style="font-size:11px;color:#6b7280;">Gender: ${patient.gender}</div>` : ""}
            </td>
            <td style="padding:12px 14px;width:50%;vertical-align:top;border-left:1px solid #e5e7eb;">
              <div style="font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;">Details</div>
              ${bill.referenceDoctor ? `<div style="font-size:12px;"><span style="color:#6b7280;">Ref Doctor:</span> <strong>${bill.referenceDoctor}</strong></div>` : ""}
              <div style="font-size:12px;"><span style="color:#6b7280;">Payment:</span> <strong>${getPaymentLabel(bill.paymentMethod)}</strong></div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead>
            <tr style="background:#0f766e;color:white;">
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600;width:40px;">#</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;">Description</th>
              <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:600;width:80px;">Price</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600;width:50px;">Qty</th>
              <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:600;width:90px;">Total (USD)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width:100%;margin-bottom:20px;">
          <tr>
            <td style="width:60%;"></td>
            <td style="width:40%;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:5px 10px;font-size:12px;color:#6b7280;">Subtotal</td>
                  <td style="padding:5px 10px;text-align:right;font-size:12px;">$${Number(bill.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 10px;font-size:12px;color:#6b7280;">Discount</td>
                  <td style="padding:5px 10px;text-align:right;font-size:12px;color:#ef4444;">-$${Number(bill.discount).toFixed(2)}</td>
                </tr>
                <tr style="border-top:2px solid #0f766e;">
                  <td style="padding:8px 10px;font-size:14px;font-weight:700;color:#0f766e;">Grand Total</td>
                  <td style="padding:8px 10px;text-align:right;font-size:14px;font-weight:700;color:#0f766e;">$${Number(bill.total).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Payment Information -->
        <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:6px;padding:12px 14px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:600;color:#0f766e;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Payment Information</div>
          <div style="font-size:12px;color:#374151;">Payment for the above medical services at ${clinicName}.</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">Amount Paid: <strong>$${Number(bill.paidAmount).toFixed(2)}</strong> via <strong>${getPaymentLabel(bill.paymentMethod)}</strong></div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding-top:16px;border-top:1px solid #e5e7eb;">
          <div style="font-size:13px;font-weight:600;color:#1f2937;margin-bottom:3px;">Thank you for choosing ${clinicName}!</div>
          <div style="font-size:11px;color:#6b7280;">For questions, contact ${clinicEmail}</div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const resetForm = () => {
    setBillItems([]);
    setSelectedPatient("");
    setDiscount("0");
    setDiscountType("amount");
    setPaymentMethod("cash");
    setReferenceDoctor("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setShowPreview(false);
  };

  const addServiceItem = (serviceId: string) => {
    const service = services.find(s => s.id === Number(serviceId));
    if (!service) return;
    setBillItems(prev => [...prev, {
      name: service.name,
      type: "service",
      quantity: 1,
      unitPrice: Number(service.price),
      total: Number(service.price),
    }]);
  };

  const addMedicineItem = (medicineId: string) => {
    const med = medicines.find(m => m.id === Number(medicineId));
    if (!med) return;
    setBillItems(prev => [...prev, {
      name: med.name,
      type: "medicine",
      quantity: 1,
      unitPrice: Number(med.sellingPrice),
      total: Number(med.sellingPrice),
    }]);
  };

  const updateItemQuantity = (index: number, qty: number) => {
    setBillItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: qty, total: item.unitPrice * qty } : item
    ));
  };

  const removeItem = (index: number) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const discountValue = Number(discount) || 0;
  const discountAmount = discountType === "percentage"
    ? (subtotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, subtotal - discountAmount);

  const handleCreateBill = () => {
    if (!selectedPatient || billItems.length === 0) {
      toast({ title: "Please select a patient and add items", variant: "destructive" });
      return;
    }
    createBillMutation.mutate({
      billNo: `BILL-${Date.now()}`,
      patientId: Number(selectedPatient),
      items: billItems,
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      discountType,
      tax: "0.00",
      total: total.toFixed(2),
      paidAmount: total.toFixed(2),
      paymentMethod,
      referenceDoctor: referenceDoctor && referenceDoctor !== "none" ? referenceDoctor : null,
      paymentDate: paymentDate || null,
      status: "paid",
    });
  };

  const filteredBills = bills.filter((b: any) =>
    b.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const billColumns = [
    { header: "Bill #", accessor: "billNo" as keyof any },
    { header: "Patient", accessor: "patientName" as keyof any },
    { header: "Items", accessor: (row: any) => {
      const items = Array.isArray(row.items) ? row.items : [];
      return <span className="text-xs text-muted-foreground">{items.length} items</span>;
    }},
    { header: "Total", accessor: (row: any) => <span className="font-medium">${row.total}</span> },
    { header: "Paid", accessor: (row: any) => `$${row.paidAmount}` },
    { header: "Method", accessor: (row: any) => (
      <Badge variant="outline">{getPaymentLabel(row.paymentMethod)}</Badge>
    )},
    { header: "Doctor", accessor: (row: any) => (
      <span className="text-xs text-muted-foreground">{row.referenceDoctor || "-"}</span>
    )},
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.status === "paid" ? "default" : row.status === "partial" ? "secondary" : "destructive"}>
        {row.status}
      </Badge>
    )},
    { header: "Date", accessor: (row: any) => {
      if (row.paymentDate) return row.paymentDate;
      return row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-";
    }},
    { header: "Actions", accessor: (row: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewBill(row); }} data-testid={`action-view-${row.id}`}>
            <Eye className="h-4 w-4 mr-2" /> View Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); printReceipt(row); }} data-testid={`action-print-${row.id}`}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditBill(row); }} data-testid={`action-edit-${row.id}`}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (confirm("Are you sure you want to delete this bill?")) deleteBillMutation.mutate(row.id); }} className="text-red-600" data-testid={`action-delete-${row.id}`}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Billing"
        description="Manage patient bills and invoices"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-bill">
                <Plus className="h-4 w-4 mr-1" /> New Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{showPreview ? "Invoice Preview" : "Create New Bill"}</DialogTitle>
                <DialogDescription>{showPreview ? "Review the invoice before printing." : "Add services, medicines and payment details for the bill."}</DialogDescription>
              </DialogHeader>

              {showPreview ? (
                <div className="space-y-4">
                  <div className="border rounded-md p-5 bg-white dark:bg-card" data-testid="invoice-preview">
                    {/* Header: Logo + Clinic Info | INVOICE + Number */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        {settings?.logo && (
                          <img src={settings.logo} alt="Clinic Logo" className="h-10 mb-1.5 object-contain" data-testid="img-clinic-logo" />
                        )}
                        <h2 className="text-base font-bold text-teal-700 dark:text-teal-400">{settings?.clinicName || "Prime Clinic"}</h2>
                        {settings?.address && <p className="text-[10px] text-muted-foreground">{settings.address}</p>}
                        {settings?.phone && <p className="text-[10px] text-muted-foreground">{settings.phone}</p>}
                        {settings?.email && <p className="text-[10px] text-muted-foreground">{settings.email}</p>}
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-extrabold tracking-wide">INVOICE</h3>
                        <p className="text-xs text-muted-foreground mt-1">Invoice #: <span className="font-semibold text-foreground">{settings?.invoicePrefix || "INV"}-{String(bills.length + 1).padStart(4, "0")}</span></p>
                        <p className="text-xs text-muted-foreground">Date: {new Date(paymentDate || new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                        <Badge className="mt-1.5 bg-amber-500 text-white border-amber-600">Pending</Badge>
                      </div>
                    </div>

                    {/* Patient & Details */}
                    <div className="grid grid-cols-2 gap-0 rounded-md border bg-muted/30 mb-4">
                      <div className="p-3">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mb-1">Patient</p>
                        <p className="text-sm font-semibold">{patients.find(p => p.id === Number(selectedPatient))?.name || "-"}</p>
                        {(() => { const p = patients.find(pt => pt.id === Number(selectedPatient)); return p ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">ID: {p.patientId}</p>
                            {p.gender && <p className="text-[11px] text-muted-foreground">Gender: {p.gender}</p>}
                          </>
                        ) : null; })()}
                      </div>
                      <div className="p-3 border-l">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mb-1">Details</p>
                        {referenceDoctor && referenceDoctor !== "none" && (
                          <p className="text-[11px]"><span className="text-muted-foreground">Ref Doctor:</span> <span className="font-medium">{referenceDoctor}</span></p>
                        )}
                        <p className="text-[11px]"><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{getPaymentLabel(paymentMethod)}</span></p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-4 rounded-md overflow-hidden border">
                      <div className="grid grid-cols-[36px,1fr,70px,46px,80px] bg-teal-700 text-white text-[11px] font-semibold">
                        <span className="p-2 text-center">#</span>
                        <span className="p-2">Description</span>
                        <span className="p-2 text-right">Price</span>
                        <span className="p-2 text-center">Qty</span>
                        <span className="p-2 text-right">Total (USD)</span>
                      </div>
                      {billItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-[36px,1fr,70px,46px,80px] text-sm border-b last:border-b-0">
                          <span className="p-2 text-center text-muted-foreground text-xs">{i + 1}</span>
                          <span className="p-2">{item.name}</span>
                          <span className="p-2 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</span>
                          <span className="p-2 text-center">{item.quantity}</span>
                          <span className="p-2 text-right font-medium">${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-4">
                      <div className="w-52 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Discount{discountType === "percentage" ? ` (${Number(discount) || 0}%)` : ""}</span>
                          <span className="text-red-500">-${discountAmount.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-teal-700 dark:text-teal-400 text-base pt-0.5">
                          <span>Grand Total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="rounded-md bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3 mb-4">
                      <p className="text-[10px] uppercase text-teal-700 dark:text-teal-400 font-semibold tracking-wide mb-1">Payment Information</p>
                      <p className="text-xs text-muted-foreground">Payment for the above medical services at {settings?.clinicName || "Prime Clinic"}.</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Amount: <span className="font-semibold text-foreground">${total.toFixed(2)}</span> via <span className="font-semibold text-foreground">{getPaymentLabel(paymentMethod)}</span></p>
                    </div>

                    {/* Footer */}
                    <Separator className="mb-3" />
                    <div className="text-center space-y-0.5" data-testid="invoice-footer">
                      <p className="text-sm font-semibold">Thank you for choosing {settings?.clinicName || "Prime Clinic"}!</p>
                      <p className="text-xs text-muted-foreground">For questions, contact {settings?.email || "info@primeclinic.com"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(false)}
                      data-testid="button-back-to-form"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back to Edit
                    </Button>
                    <Button
                      onClick={() => { setBillAction("print"); handleCreateBill(); }}
                      disabled={createBillMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-600 text-white border-blue-700"
                      data-testid="button-confirm-print"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      {createBillMutation.isPending ? "Printing..." : "Confirm & Print"}
                    </Button>
                  </div>
                </div>
              ) : (

              <div className="space-y-4">
                <div>
                  <Label>Patient *</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger data-testid="select-bill-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.patientId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Add Service</Label>
                    <Select onValueChange={addServiceItem}>
                      <SelectTrigger data-testid="select-add-service"><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.isActive).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} - ${s.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Add Medicine</Label>
                    <Select onValueChange={addMedicineItem}>
                      <SelectTrigger data-testid="select-add-medicine"><SelectValue placeholder="Select medicine" /></SelectTrigger>
                      <SelectContent>
                        {medicines.filter(m => m.isActive).map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name} - ${m.sellingPrice}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {billItems.length > 0 && (
                  <div className="border rounded-md">
                    <div className="grid grid-cols-[1fr,80px,80px,80px,40px] gap-2 p-2 bg-muted/50 text-xs font-medium">
                      <span>Item</span>
                      <span className="text-right">Price</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Total</span>
                      <span></span>
                    </div>
                    {billItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-[1fr,80px,80px,80px,40px] gap-2 p-2 items-center border-t text-sm">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{item.type === "service" ? "SVC" : "MED"}</Badge>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(i, Number(e.target.value))}
                          className="h-7 text-center text-xs"
                          data-testid={`input-bill-qty-${i}`}
                        />
                        <span className="text-right font-medium">${item.total.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)} data-testid={`button-remove-item-${i}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Discount</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="flex-1"
                        data-testid="input-bill-discount"
                      />
                      <Button
                        type="button"
                        variant={discountType === "amount" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setDiscountType("amount")}
                        data-testid="button-discount-amount"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={discountType === "percentage" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setDiscountType("percentage")}
                        data-testid="button-discount-percentage"
                      >
                        <Percent className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(pm => (
                          <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Reference Doctor <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Select value={referenceDoctor} onValueChange={setReferenceDoctor}>
                      <SelectTrigger data-testid="select-reference-doctor"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {doctorNames.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of Payment <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      data-testid="input-payment-date"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-md p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount{discountType === "percentage" ? ` (${discountValue}%)` : ""}
                    </span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => { setBillAction("create"); handleCreateBill(); }}
                    disabled={createBillMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-700"
                    data-testid="button-submit-bill"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    {createBillMutation.isPending && billAction === "create" ? "Creating..." : "Create Bill"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (!selectedPatient || billItems.length === 0) {
                        toast({ title: "Please select a patient and add items", variant: "destructive" });
                        return;
                      }
                      setShowPreview(true);
                    }}
                    disabled={createBillMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-600 text-white border-blue-700"
                    data-testid="button-print-receipt"
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print Receipt
                  </Button>
                  <Button
                    onClick={() => { setBillAction("payment"); handleCreateBill(); }}
                    disabled={createBillMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-600 text-white border-amber-700"
                    data-testid="button-make-payment"
                  >
                    <CreditCard className="h-4 w-4 mr-1.5" />
                    {createBillMutation.isPending && billAction === "payment" ? "Processing..." : "Make Payment"}
                  </Button>
                </div>
              </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Bills</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-bills"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={billColumns} data={filteredBills} isLoading={isLoading} emptyMessage="No bills yet" />
          </CardContent>
        </Card>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewBill} onOpenChange={(open) => { if (!open) setViewBill(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice - {viewBill?.billNo}</DialogTitle>
            <DialogDescription>View invoice details</DialogDescription>
          </DialogHeader>
          {viewBill && (() => {
            const patient = patients.find(p => p.id === viewBill.patientId);
            const items: any[] = Array.isArray(viewBill.items) ? viewBill.items : [];
            const vSubtotal = Number(viewBill.subtotal) || 0;
            const vDiscount = Number(viewBill.discount) || 0;
            const vTotal = Number(viewBill.total) || 0;
            const dateStr = viewBill.paymentDate || (viewBill.createdAt ? new Date(viewBill.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            return (
              <div className="space-y-4">
                <div className="border rounded-md p-5 bg-white dark:bg-card">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      {settings?.logo && <img src={settings.logo} alt="Logo" className="h-10 mb-1.5 object-contain" />}
                      <h2 className="text-base font-bold text-teal-700 dark:text-teal-400">{settings?.clinicName || "Prime Clinic"}</h2>
                      {settings?.address && <p className="text-[10px] text-muted-foreground">{settings.address}</p>}
                      {settings?.phone && <p className="text-[10px] text-muted-foreground">{settings.phone}</p>}
                      {settings?.email && <p className="text-[10px] text-muted-foreground">{settings.email}</p>}
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl font-extrabold tracking-wide">INVOICE</h3>
                      <p className="text-xs text-muted-foreground mt-1">Invoice #: <span className="font-semibold text-foreground">{viewBill.billNo}</span></p>
                      <p className="text-xs text-muted-foreground">Date: {new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                      <Badge className={`mt-1.5 ${viewBill.status === "paid" ? "bg-green-600 border-green-700" : "bg-amber-500 border-amber-600"} text-white`}>
                        {viewBill.status === "paid" ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0 rounded-md border bg-muted/30 mb-4">
                    <div className="p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mb-1">Patient</p>
                      <p className="text-sm font-semibold">{viewBill.patientName || patient?.name || "-"}</p>
                      {patient?.patientId && <p className="text-[11px] text-muted-foreground">ID: {patient.patientId}</p>}
                      {patient?.gender && <p className="text-[11px] text-muted-foreground">Gender: {patient.gender}</p>}
                    </div>
                    <div className="p-3 border-l">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide mb-1">Details</p>
                      {viewBill.referenceDoctor && <p className="text-[11px]"><span className="text-muted-foreground">Ref Doctor:</span> <span className="font-medium">{viewBill.referenceDoctor}</span></p>}
                      <p className="text-[11px]"><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{getPaymentLabel(viewBill.paymentMethod)}</span></p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-md overflow-hidden border">
                    <div className="grid grid-cols-[36px,1fr,70px,46px,80px] bg-teal-700 text-white text-[11px] font-semibold">
                      <span className="p-2 text-center">#</span>
                      <span className="p-2">Description</span>
                      <span className="p-2 text-right">Price</span>
                      <span className="p-2 text-center">Qty</span>
                      <span className="p-2 text-right">Total</span>
                    </div>
                    {items.map((item: any, i: number) => (
                      <div key={i} className="grid grid-cols-[36px,1fr,70px,46px,80px] text-sm border-b last:border-b-0">
                        <span className="p-2 text-center text-muted-foreground text-xs">{i + 1}</span>
                        <span className="p-2">{item.name}</span>
                        <span className="p-2 text-right text-muted-foreground">${Number(item.unitPrice).toFixed(2)}</span>
                        <span className="p-2 text-center">{item.quantity}</span>
                        <span className="p-2 text-right font-medium">${Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mb-4">
                    <div className="w-52 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${vSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-red-500">-${vDiscount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-teal-700 dark:text-teal-400 text-base pt-0.5">
                        <span>Grand Total</span>
                        <span>${vTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3 mb-4">
                    <p className="text-[10px] uppercase text-teal-700 dark:text-teal-400 font-semibold tracking-wide mb-1">Payment Information</p>
                    <p className="text-xs text-muted-foreground">Payment for the above medical services at {settings?.clinicName || "Prime Clinic"}.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Amount Paid: <span className="font-semibold text-foreground">${Number(viewBill.paidAmount).toFixed(2)}</span> via <span className="font-semibold text-foreground">{getPaymentLabel(viewBill.paymentMethod)}</span></p>
                  </div>

                  <Separator className="mb-3" />
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-semibold">Thank you for choosing {settings?.clinicName || "Prime Clinic"}!</p>
                    <p className="text-xs text-muted-foreground">For questions, contact {settings?.email || "info@primeclinic.com"}</p>
                  </div>
                </div>

                <Button onClick={() => { printReceipt(viewBill); }} className="w-full bg-blue-600 hover:bg-blue-600 text-white border-blue-700" data-testid="button-view-print">
                  <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={!!editBill} onOpenChange={(open) => { if (!open) setEditBill(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill - {editBill?.billNo}</DialogTitle>
            <DialogDescription>Update bill details</DialogDescription>
          </DialogHeader>
          {editBill && (() => {
            const [editStatus, setEditStatus] = [editBill._editStatus || editBill.status, (v: string) => setEditBill({ ...editBill, _editStatus: v })];
            const [editPaid, setEditPaid] = [editBill._editPaid || String(editBill.paidAmount), (v: string) => setEditBill({ ...editBill, _editPaid: v })];
            const [editMethod, setEditMethod] = [editBill._editMethod || editBill.paymentMethod, (v: string) => setEditBill({ ...editBill, _editMethod: v })];
            const [editDoctor, setEditDoctor] = [editBill._editDoctor ?? (editBill.referenceDoctor || ""), (v: string) => setEditBill({ ...editBill, _editDoctor: v })];
            return (
              <div className="space-y-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger data-testid="edit-bill-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paid Amount ($)</Label>
                  <Input type="number" step="0.01" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} data-testid="edit-bill-paid" />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={editMethod} onValueChange={setEditMethod}>
                    <SelectTrigger data-testid="edit-bill-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference Doctor</Label>
                  <Select value={editDoctor || "none"} onValueChange={(v) => setEditDoctor(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="edit-bill-doctor"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {doctorNames.map(d => d && <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={updateBillMutation.isPending}
                  data-testid="button-save-edit"
                  onClick={() => {
                    updateBillMutation.mutate({
                      id: editBill.id,
                      data: {
                        status: editStatus,
                        paidAmount: editPaid,
                        paymentMethod: editMethod,
                        referenceDoctor: editDoctor || null,
                      },
                    });
                  }}
                >
                  {updateBillMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
