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
import { Plus, Search, Trash2, DollarSign, Percent, FileText, Printer, CreditCard, ArrowLeft, X } from "lucide-react";
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

  const printReceipt = (bill: any) => {
    const patient = patients.find(p => p.id === Number(selectedPatient || bill.patientId));
    const items = bill.items || billItems;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    const clinicName = settings?.clinicName || "Prime Clinic";
    const clinicEmail = settings?.email || "info@primeclinic.com";
    printWindow.document.write(`
      <html><head><title>Receipt - ${clinicName}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 350px; margin: 0 auto; font-size: 13px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #333; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .items { margin: 8px 0; }
        h2 { margin: 4px 0; }
        h3 { margin: 2px 0; font-size: 11px; font-weight: normal; color: #666; }
        p { margin: 2px 0; }
        .logo { max-height: 48px; margin: 0 auto 6px; display: block; }
        .footer { margin-top: 12px; font-size: 11px; color: #666; }
      </style></head><body>
        <div class="center">
          ${settings?.logo ? `<img src="${settings.logo}" alt="Logo" class="logo" />` : ""}
          <h2>${clinicName}</h2>
          ${settings?.address ? `<h3>${settings.address}</h3>` : ""}
          ${settings?.phone ? `<h3>${settings.phone}</h3>` : ""}
        </div>
        <div class="line"></div>
        <div class="center">
          <p class="bold">INVOICE</p>
          <p>Invoice #: ${bill.billNo}</p>
          <p>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="line"></div>
        <p><span class="bold">Patient:</span> ${patient?.name || "N/A"}</p>
        ${bill.referenceDoctor ? `<p><span class="bold">Doctor:</span> ${bill.referenceDoctor}</p>` : ""}
        <div class="line"></div>
        <div class="items">
          ${(Array.isArray(items) ? items : []).map((item: any) => `
            <div class="row">
              <span>${item.name} x${item.quantity}</span>
              <span>$${Number(item.total).toFixed(2)}</span>
            </div>
          `).join("")}
        </div>
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>$${bill.subtotal}</span></div>
        <div class="row"><span>Discount</span><span>-$${bill.discount}</span></div>
        <div class="line"></div>
        <div class="row bold"><span>Total</span><span>$${bill.total}</span></div>
        <div class="row"><span>Paid</span><span>$${bill.paidAmount}</span></div>
        <div class="row"><span>Method</span><span>${getPaymentLabel(bill.paymentMethod)}</span></div>
        <div class="line"></div>
        <div class="center footer">
          <p class="bold">Thank you for choosing ${clinicName}!</p>
          <p>For questions, contact ${clinicEmail}</p>
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
                    <div className="text-center mb-4">
                      {settings?.logo && (
                        <img src={settings.logo} alt="Clinic Logo" className="h-12 mx-auto mb-2 object-contain" data-testid="img-clinic-logo" />
                      )}
                      <h2 className="text-lg font-bold">{settings?.clinicName || "Prime Clinic"}</h2>
                      {settings?.address && <p className="text-[11px] text-muted-foreground">{settings.address}</p>}
                      {(settings?.phone || settings?.email) && (
                        <p className="text-[11px] text-muted-foreground">
                          {[settings?.phone, settings?.email].filter(Boolean).join(" | ")}
                        </p>
                      )}
                      <Separator className="my-2" />
                      <h3 className="text-xl font-bold tracking-wide">INVOICE</h3>
                      <p className="text-xs text-muted-foreground">Invoice #: {settings?.invoicePrefix || "INV"}-{String(bills.length + 1).padStart(4, "0")}</p>
                      <p className="text-xs text-muted-foreground">{paymentDate || new Date().toISOString().split("T")[0]}</p>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Patient:</span>{" "}
                        <span className="font-medium">{patients.find(p => p.id === Number(selectedPatient))?.name || "-"}</span>
                      </div>
                      {referenceDoctor && referenceDoctor !== "none" && (
                        <div>
                          <span className="text-muted-foreground">Doctor:</span>{" "}
                          <span className="font-medium">{referenceDoctor}</span>
                        </div>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="mb-3">
                      <div className="grid grid-cols-[1fr,60px,60px,80px] gap-2 text-xs font-semibold text-muted-foreground pb-1 border-b">
                        <span>Item</span>
                        <span className="text-right">Price</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Amount</span>
                      </div>
                      {billItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-[1fr,60px,60px,80px] gap-2 py-1.5 text-sm border-b border-dashed">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] px-1">{item.type === "service" ? "SVC" : "MED"}</Badge>
                            <span>{item.name}</span>
                          </div>
                          <span className="text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</span>
                          <span className="text-center">{item.quantity}</span>
                          <span className="text-right font-medium">${item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Discount{discountType === "percentage" ? ` (${Number(discount) || 0}%)` : ""}
                        </span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Method</span>
                      <Badge variant="outline">{getPaymentLabel(paymentMethod)}</Badge>
                    </div>

                    <Separator className="my-3" />

                    <div className="text-center text-xs text-muted-foreground space-y-0.5 pt-1" data-testid="invoice-footer">
                      <p className="font-medium">Thank you for choosing {settings?.clinicName || "Prime Clinic"}!</p>
                      <p>For questions, contact {settings?.email || "info@primeclinic.com"}</p>
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
    </div>
  );
}
