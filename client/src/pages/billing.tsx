import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
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
import { SearchableSelect } from "@/components/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Search, Trash2, DollarSign, Percent, FileText, Printer, CreditCard, ArrowLeft, X, MoreHorizontal, Eye, Pencil, Receipt, TrendingUp, Clock, CheckCircle2, Banknote, Wallet, Building2, Globe, Smartphone, Barcode, User as UserIcon, Stethoscope, ShoppingBag, Pill, CalendarDays, Hash, Tag, Package, RotateCcw } from "lucide-react";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";
import type { Patient, Service, Injection, Medicine, BillItem, User as UserType, ClinicSettings, Package as PackageType, Doctor } from "@shared/schema";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5", KHR: "\u17DB",
  THB: "\u0E3F", VND: "\u20AB", CNY: "\u00A5", MYR: "RM", SGD: "S$",
  INR: "\u20B9", AUD: "A$", CAD: "C$", CHF: "CHF", KRW: "\u20A9",
};

function getCurrencyParts(amount: number, settings?: ClinicSettings | null) {
  const primary = settings?.currency || "USD";
  const pSym = CURRENCY_SYMBOLS[primary] || primary;
  const secondary = settings?.secondaryCurrency;
  const rate = Number(settings?.exchangeRate) || 1;
  const pDecimals = ["JPY", "KRW", "VND", "KHR"].includes(primary) ? 0 : 2;
  const primaryStr = `${pSym}${amount.toFixed(pDecimals)}`;
  if (!secondary || secondary === primary) return { primaryStr, secondaryStr: null };
  const sSym = CURRENCY_SYMBOLS[secondary] || secondary;
  const converted = amount * rate;
  const sDecimals = ["JPY", "KRW", "VND", "KHR"].includes(secondary) ? 0 : 2;
  return { primaryStr, secondaryStr: `${sSym}${converted.toFixed(sDecimals)}` };
}

function formatDualCurrency(amount: number, settings?: ClinicSettings | null) {
  const { primaryStr, secondaryStr } = getCurrencyParts(amount, settings);
  if (!secondaryStr) return primaryStr;
  return `${primaryStr} / ${secondaryStr}`;
}

function dualCurrencyHTML(amount: number, settings?: ClinicSettings | null) {
  const { primaryStr, secondaryStr } = getCurrencyParts(amount, settings);
  if (!secondaryStr) return primaryStr;
  return `${primaryStr} <span style="color:#6b7280;font-size:0.85em;">/ ${secondaryStr}</span>`;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash Pay", icon: Banknote, color: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  { value: "aba", label: "ABA", icon: Building2, color: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20" },
  { value: "acleda", label: "Acleda", icon: Building2, color: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20" },
  { value: "other_bank", label: "Other Bank", icon: Building2, color: "text-slate-700 dark:text-slate-300 bg-slate-500/10 border-slate-500/20" },
  { value: "card", label: "Card Pay", icon: CreditCard, color: "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/20" },
  { value: "wechat", label: "WeChat Pay", icon: Smartphone, color: "text-green-700 dark:text-green-300 bg-green-500/10 border-green-500/20" },
  { value: "gpay", label: "GPay", icon: Smartphone, color: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20" },
];

export default function BillingPage() {
  const { t } = useTranslation();
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
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, monthYear, setMonthYear, dateRange } = useDateFilter();

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

  const { data: injectionsList = [] } = useQuery<Injection[]>({
    queryKey: ["/api/injections"],
  });

  const { data: packagesList = [] } = useQuery<PackageType[]>({
    queryKey: ["/api/packages"],
  });

  const { data: doctorsList = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/doctors"],
  });

  const doctorOptions = [
    { value: "none", label: "None" },
    ...doctorsList
      .filter((d) => d.status === "active")
      .map((d) => ({
        value: d.name,
        label: d.specialization ? `${d.name} (${d.specialization})` : d.name,
        searchText: [d.name, d.specialization].filter(Boolean).join(" "),
      })),
  ];

  const [billAction, setBillAction] = useState<"create" | "print" | "payment">("create");
  const [showPreview, setShowPreview] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);
  const [editBill, setEditBill] = useState<any>(null);
  const [medicineQty, setMedicineQty] = useState(1);
  const [medicineBarcodeScan, setMedicineBarcodeScan] = useState("");
  const [deleteBillConfirm, setDeleteBillConfirm] = useState<{ open: boolean; billId?: number }>({ open: false });
  const [returnBill, setReturnBill] = useState<any>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

  const getPaymentLabel = (method: string) => {
    const found = PAYMENT_METHODS.find(p => p.value === method);
    return found ? found.label : method;
  };

  const getPaymentBadge = (method: string) => {
    const found = PAYMENT_METHODS.find(p => p.value === method);
    if (!found) return <Badge variant="outline">{method}</Badge>;
    const Icon = found.icon;
    return (
      <Badge variant="outline" className={`gap-1 text-[11px] ${found.color}`}>
        <Icon className="h-3 w-3" />
        {found.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: typeof CheckCircle2 }> = {
      paid: { variant: "default", label: t("billing.paid"), icon: CheckCircle2 },
      partial: { variant: "secondary", label: t("billing.partial"), icon: Clock },
      pending: { variant: "outline", label: t("billing.pending"), icon: Clock },
      cancelled: { variant: "destructive", label: t("billing.cancelled"), icon: X },
    };
    const cfg = statusMap[status] || { variant: "destructive" as const, label: "Unpaid", icon: X };
    const StatusIcon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1 text-[11px]">
        <StatusIcon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bills", data);
      return res.json();
    },
    onSuccess: (bill: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });

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

  const returnMedicineMutation = useMutation({
    mutationFn: async ({ billId, returns }: { billId: number; returns: { itemIndex: number; quantity: number }[] }) => {
      const res = await apiRequest("POST", `/api/bills/${billId}/return`, { returns });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
      setReturnBill(null);
      setReturnQuantities({});
      toast({ title: "Medicine return processed. Stock and bill updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  type PrintLayout = "compact" | "full";
  const printReceipt = (bill: any, layout: PrintLayout = "compact") => {
    const patient = patients.find(p => p.id === Number(selectedPatient || bill.patientId));
    const rawItems = Array.isArray(bill.items) ? bill.items : [];
    const medicineItems = rawItems.filter((i: any) => i?.type === "medicine");
    const medicationTotal = medicineItems.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
    const packageItems = rawItems.filter((i: any) => i?.packageId != null && i?.packageName);
    const packageGroups = new Map<number, { name: string; total: number }>();
    for (const i of packageItems) {
      const id = Number(i.packageId);
      const name = i.packageName || "Package";
      const total = Number(i.total) || 0;
      const cur = packageGroups.get(id);
      if (cur) cur.total += total;
      else packageGroups.set(id, { name, total });
    }
    const standaloneItems = rawItems.filter((i: any) => i?.type !== "medicine" && (i?.packageId == null && i?.packageName == null));
    const printItems: { name: string; quantity: number; unitPrice: number; total: number }[] = [
      ...standaloneItems.map((i: any) => ({ name: i.name, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0, total: Number(i.total) || 0 })),
      ...[...packageGroups.values()].map((g) => ({ name: g.name, quantity: 1, unitPrice: g.total, total: g.total })),
      ...(medicationTotal > 0 ? [{ name: "Medication", quantity: 1, unitPrice: medicationTotal, total: medicationTotal }] : []),
    ];

    const printWindow = window.open("", "_blank", layout === "compact" ? "width=400,height=600" : "width=800,height=900");
    if (!printWindow) return;
    const clinicName = settings?.clinicName || "";
    const clinicEmail = settings?.email || "";
    const clinicNameDisplay = clinicName || "My Clinic";
    const clinicEmailDisplay = clinicEmail || "";
    const clinicPhone = settings?.phone || "";
    const clinicAddress = settings?.address || "";
    const vatTin = settings?.companyTaxId || "";
    const dateStr = bill.paymentDate || new Date().toISOString().split("T")[0];
    const formattedDate = new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const pSym = CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$";
    const currencyCode = settings?.currency || "USD";
    const isCompact = layout === "compact";
    const pad = isCompact ? "6px 8px" : "8px 10px";
    const padSm = isCompact ? "4px 6px" : "6px 8px";
    const fBase = isCompact ? 10 : 11;
    const fSm = isCompact ? 9 : 10;
    const fLg = isCompact ? 13 : 15;
    const maxW = isCompact ? "340px" : "720px";
    const bodyPad = isCompact ? "12px 14px" : "20px 24px";
    const accent = "#0f172a";
    const muted = "#475569";
    const border = "#e2e8f0";
    const totalHighlight = "#fef9c3";

    const itemRows = printItems.map((item: any, idx: number) => `
      <tr>
        <td style="padding:${padSm};border-bottom:1px solid ${border};text-align:center;font-size:${fSm}px;color:${accent};">${idx + 1}</td>
        <td style="padding:${padSm};border-bottom:1px solid ${border};font-size:${fSm}px;color:${accent};">${item.name}</td>
        <td style="padding:${padSm};border-bottom:1px solid ${border};text-align:center;font-size:${fSm}px;color:${accent};">${item.quantity}</td>
        <td style="padding:${padSm};border-bottom:1px solid ${border};text-align:right;font-size:${fSm}px;color:${accent};">${pSym}${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:${padSm};border-bottom:1px solid ${border};text-align:right;font-size:${fSm}px;font-weight:600;color:${accent};background:${totalHighlight};-webkit-print-color-adjust:exact;print-color-adjust:exact;">${pSym}${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join("");

    const billNoShort = (bill.billNo || "").replace(/\s/g, "");
    const billNoBarcode = billNoShort.replace(/[^A-Za-z0-9\-]/g, "") || billNoShort;
    const logoHref = settings?.logo
      ? (settings.logo.startsWith("http") ? settings.logo : `${typeof window !== "undefined" ? window.location.origin : ""}${settings.logo.startsWith("/") ? settings.logo : "/" + settings.logo}`)
      : "";
    const barcodeSize = isCompact ? 30 : 36;
    const totalDue = Number(bill.total) || 0;
    const paidAmt = Number(bill.paidAmount) || 0;
    const amountOwed = Math.max(0, totalDue - paidAmt);
    const subtotalVal = (Number(bill.subtotal) || 0).toFixed(2);
    const discountVal = (Number(bill.discount) || 0).toFixed(2);

    printWindow.document.write(`
      <html><head><title>Invoice ${billNoShort}</title>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: ${accent}; padding: ${bodyPad}; max-width: ${maxW}; margin: 0 auto; font-size: ${fBase}px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-barcode { font-family: 'Libre Barcode 128', monospace; letter-spacing: 1px; line-height: 1; color: ${accent}; }
        @media print { body { padding: 16px; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      </style></head><body>

        <div style="margin-bottom:16px;">
          <table style="width:100%;">
            <tr>
              <td style="vertical-align:top;">
                ${logoHref ? `<img src="${logoHref}" alt="Logo" style="max-height:${isCompact ? "32px" : "42px"};margin-bottom:6px;display:block;" />` : ""}
                <div style="font-size:${fLg}px;font-weight:700;color:${accent};letter-spacing:0.02em;">${clinicNameDisplay}</div>
                <div style="margin-top:6px;font-size:${fSm}px;color:${muted};line-height:1.5;">
                  ${vatTin ? `<div>លេខអត្តសញ្ញាណកម្ម អតប (VATTIN): ${vatTin}</div>` : ""}
                  ${clinicAddress ? `<div>អាស័យដ្ឋាន៖ ${clinicAddress}</div><div>Address: ${clinicAddress}</div>` : ""}
                  ${clinicPhone ? `<div>ទូរស័ព្ធ៖ ${clinicPhone} &nbsp;|&nbsp; Tel: ${clinicPhone}</div>` : ""}
                  <div>Email: ${clinicEmailDisplay || "-"}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <div style="border-bottom:2px solid ${accent};padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px;">
          <span style="font-size:${fBase + 1}px;font-weight:700;color:${accent};">វិក័យប័ត្រ / INVOICE</span>
          <div style="text-align:right;">
            ${billNoBarcode ? `<div class="invoice-barcode" style="font-size:${barcodeSize}px;margin-bottom:2px;">${billNoBarcode}</div>` : ""}
            <span style="font-size:${fSm}px;color:${muted};">វិក័យប័ត្រលេខ / Invoice N°:</span> <strong style="font-size:${fSm}px;color:${accent};">${billNoShort}</strong>
          </div>
        </div>

        <table style="width:100%;margin-bottom:14px;font-size:${fSm}px;">
          <tr>
            <td style="width:50%;vertical-align:top;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid ${border};">
              <div style="font-weight:600;color:${accent};margin-bottom:6px;">ឈ្មោះអ្នកជំងឺ / Patient Name</div>
              <div style="color:${accent};margin-bottom:4px;">${patient?.name || "-"}</div>
              ${patient?.patientId ? `<div style="color:${muted};margin-bottom:2px;">លេខអ្នកជំងឺ / Patient's ID: <span style="color:${accent};">${patient.patientId}</span></div>` : ""}
              ${bill.referenceDoctor ? `<div style="color:${muted};margin-top:4px;">Reference / គ្រូពេទ្យ: <span style="color:${accent};">${bill.referenceDoctor}</span></div>` : ""}
            </td>
            <td style="width:50%;vertical-align:top;padding:8px 12px;padding-left:14px;">
              ${patient?.gender ? `<div style="margin-bottom:4px;"><span style="color:${muted};">ភេទ / Sex:</span> <span style="color:${accent};font-weight:500;">${patient.gender}</span></div>` : ""}
              ${patient?.age != null ? `<div style="margin-bottom:4px;"><span style="color:${muted};">អាយុ / Age:</span> <span style="color:${accent};">${patient.age} y</span></div>` : ""}
            </td>
          </tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid ${border};border-radius:6px;overflow:hidden;">
          <thead>
            <tr style="background:${accent};color:white;">
              <th style="padding:${pad};text-align:center;font-size:${fSm}px;font-weight:600;width:36px;">ល.រ<br><span style="font-weight:500;opacity:0.95;">No</span></th>
              <th style="padding:${pad};text-align:left;font-size:${fSm}px;font-weight:600;">ប្រភេទសេវាកម្ម / Service Type</th>
              <th style="padding:${pad};text-align:center;font-size:${fSm}px;font-weight:600;width:44px;">បរិមាណ /<br>Qty</th>
              <th style="padding:${pad};text-align:right;font-size:${fSm}px;font-weight:600;width:70px;">តម្លៃ /<br>Price</th>
              <th style="padding:${pad};text-align:right;font-size:${fSm}px;font-weight:600;width:76px;background:rgba(254,249,195,0.35);-webkit-print-color-adjust:exact;print-color-adjust:exact;">សរុប / Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:18px;">
          <table style="width:100%;max-width:280px;font-size:${fSm}px;border:1px solid ${border};border-radius:6px;overflow:hidden;">
            <tr><td style="padding:${padSm};color:${muted};">សរុបរួម / Total</td><td style="padding:${padSm};text-align:right;color:${accent};">${currencyCode} ${subtotalVal}</td></tr>
            <tr><td style="padding:${padSm};color:${muted};">ចុះតំលៃ / Discount</td><td style="padding:${padSm};text-align:right;color:${accent};">${currencyCode} ${discountVal}</td></tr>
            <tr style="background:${totalHighlight};-webkit-print-color-adjust:exact;print-color-adjust:exact;"><td style="padding:${pad};font-weight:700;color:${accent};">សរុបត្រូវបង់ / Total Due</td><td style="padding:${pad};text-align:right;font-weight:700;color:${accent};">${currencyCode} ${totalDue.toFixed(2)}</td></tr>
            <tr><td style="padding:${padSm};color:${muted};">ចំនួនបង់រួច / Amount PAID</td><td style="padding:${padSm};text-align:right;font-weight:600;color:${accent};background:${totalHighlight};-webkit-print-color-adjust:exact;print-color-adjust:exact;">${currencyCode} ${paidAmt.toFixed(2)}</td></tr>
            <tr><td style="padding:${padSm};color:${muted};">ចំនួនជំពាក់ / Amount OWE</td><td style="padding:${padSm};text-align:right;font-weight:600;color:${accent};background:${totalHighlight};-webkit-print-color-adjust:exact;print-color-adjust:exact;">${currencyCode} ${amountOwed.toFixed(2)}</td></tr>
          </table>
        </div>

        <div style="border-top:1px solid ${border};padding-top:14px;margin-top:4px;">
          <table style="width:100%;font-size:${fSm}px;">
            <tr>
              <td style="width:33%;vertical-align:top;padding-right:12px;">
                <div style="font-weight:600;color:${accent};margin-bottom:6px;">អតិថិជន / Customer</div>
                <div style="border-bottom:1px solid ${accent};height:28px;"></div>
              </td>
              <td style="width:34%;text-align:center;vertical-align:top;padding:0 8px;border-left:1px solid ${border};border-right:1px solid ${border};">
                <div style="color:${muted};margin-bottom:4px;">Date</div>
                <div style="font-weight:500;color:${accent};">${formattedDate}</div>
              </td>
              <td style="width:33%;text-align:right;vertical-align:top;padding-left:12px;">
                <div style="font-weight:600;color:${accent};margin-bottom:6px;">អ្នកគិតលុយ | Cashier</div>
                <div style="border-bottom:1px solid ${accent};height:28px;margin-left:auto;"></div>
              </td>
            </tr>
          </table>
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

  const addInjectionItem = (injectionId: string) => {
    const injection = injectionsList.find(inj => inj.id === Number(injectionId));
    if (!injection) return;
    setBillItems(prev => [...prev, {
      name: injection.name,
      type: "injection",
      quantity: 1,
      unitPrice: Number(injection.price),
      total: Number(injection.price),
    }]);
  };

  const addPackageToBill = (packageId: string) => {
    const pkg = packagesList.find(p => p.id === Number(packageId));
    if (!pkg || !Array.isArray(pkg.items)) return;
    const newItems: BillItem[] = pkg.items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const billType = item.type === "custom" ? "service" : item.type as "service" | "medicine" | "injection";
      return {
        name: item.name,
        type: billType,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice,
        ...(billType === "medicine" && item.refId != null ? { medicineId: item.refId } : {}),
        packageId: pkg.id,
        packageName: pkg.name,
      };
    });
    setBillItems(prev => [...prev, ...newItems]);
  };

  /** Selling price per piece (use for bills). Prefer local; fallback to foreigner or legacy sellingPrice. */
  const getSellingPricePerPiece = (med: Medicine) => {
    const local = Number(med.sellingPriceLocal) ?? 0;
    const foreign = Number(med.sellingPriceForeigner) ?? 0;
    const legacy = Number(med.sellingPrice) ?? 0;
    if (local > 0) return Math.round(local * 100) / 100;
    if (foreign > 0) return Math.round(foreign * 100) / 100;
    return Math.round(legacy * 100) / 100;
  };

  const addMedicineFromObject = (med: Medicine) => {
    const unitPrice = getSellingPricePerPiece(med);
    if (unitPrice <= 0) {
      toast({ title: "This medicine has no selling price set (Local or Foreigner)", variant: "destructive" });
      return;
    }
    const addQty = Math.max(1, Math.floor(medicineQty));
    const total = Math.round(unitPrice * addQty * 100) / 100;
    setBillItems(prev => [...prev, { name: med.name, type: "medicine", quantity: addQty, unitPrice, total, medicineId: med.id }]);
  };

  const addMedicineByBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    let med: Medicine | undefined;
    if (/^MED-\d+$/i.test(trimmed)) {
      const id = parseInt(trimmed.replace(/^MED-/i, ""), 10);
      med = medicines.find(m => m.id === id);
    } else {
      med = medicines.find(m => (m.batchNo || "").toLowerCase() === trimmed.toLowerCase() || (m.batchNo || "").toLowerCase().includes(trimmed.toLowerCase()));
      if (!med) med = medicines.find(m => String(m.id) === trimmed);
    }
    if (med) {
      addMedicineFromObject(med);
      setMedicineBarcodeScan("");
      return;
    }
    try {
      const res = await apiRequest("GET", `/api/medicines/lookup?code=${encodeURIComponent(trimmed)}`);
      const fromApi = await res.json() as Medicine;
      addMedicineFromObject(fromApi);
      setMedicineBarcodeScan("");
      queryClient.invalidateQueries({ queryKey: ["/api/medicines"] });
    } catch {
      toast({ title: "Medicine not found", description: `No medicine for barcode: ${trimmed}`, variant: "destructive" });
    }
  };

  const addMedicineItem = (medicineId: string) => {
    const med = medicines.find(m => m.id === Number(medicineId));
    if (!med) return;
    addMedicineFromObject(med);
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
    const prefix = (settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
      const nextNum = (bills?.length ?? 0) + 1;
      const shortBillNo = `${prefix}${String(nextNum).padStart(5, "0")}`;
      createBillMutation.mutate({
      billNo: shortBillNo,
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

  const dateFilteredBills = bills.filter((b: any) => {
    const billDateStr = b.paymentDate || (b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : null);
    return isDateInRange(billDateStr, dateRange);
  });

  const filteredBills = dateFilteredBills.filter((b: any) =>
    b.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = dateFilteredBills.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0);
  const totalPaid = dateFilteredBills.reduce((sum: number, b: any) => sum + (Number(b.paidAmount) || 0), 0);
  const paidCount = dateFilteredBills.filter((b: any) => b.status === "paid").length;
  const pendingCount = dateFilteredBills.filter((b: any) => b.status !== "paid").length;

  const billColumns = [
    { header: t("billing.billNo"), accessor: (row: any) => (
      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{row.billNo}</span>
    )},
    { header: t("billing.patient"), accessor: (row: any) => (
      <span className="font-medium text-sm">{row.patientName}</span>
    )},
    { header: t("common.quantity"), accessor: (row: any) => {
      const items = Array.isArray(row.items) ? row.items : [];
      return <Badge variant="secondary" className="text-[11px]">{items.length} items</Badge>;
    }},
    { header: t("common.total"), accessor: (row: any) => <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{formatDualCurrency(Number(row.total), settings)}</span> },
    { header: t("billing.paid"), accessor: (row: any) => (
      <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatDualCurrency(Number(row.paidAmount), settings)}</span>
    )},
    { header: t("billing.paymentMethod"), accessor: (row: any) => getPaymentBadge(row.paymentMethod) },
    { header: t("dashboard.doctor"), accessor: (row: any) => (
      row.referenceDoctor
        ? <span className="text-xs font-medium">{row.referenceDoctor}</span>
        : <span className="text-xs text-muted-foreground">-</span>
    )},
    { header: t("common.status"), accessor: (row: any) => getStatusBadge(row.status) },
    { header: t("common.date"), accessor: (row: any) => {
      const d = row.paymentDate || (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-");
      return <span className="text-xs text-muted-foreground">{d}</span>;
    }},
    { header: t("common.actions"), accessor: (row: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`} onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewBill(row); }} data-testid={`action-view-${row.id}`} className="gap-2">
            <Eye className="h-4 w-4 text-blue-500 dark:text-blue-400" /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); printReceipt(row); }} data-testid={`action-print-${row.id}`} className="gap-2">
            <Printer className="h-4 w-4 text-violet-500 dark:text-violet-400" /> {t("common.print")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditBill(row); }} data-testid={`action-edit-${row.id}`} className="gap-2">
            <Pencil className="h-4 w-4 text-amber-500 dark:text-amber-400" /> {t("common.edit")}
          </DropdownMenuItem>
          {row.status === "paid" && (row.items || []).some((i: any) => i?.type === "medicine") && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setReturnBill(row); setReturnQuantities({}); }} data-testid={`action-return-${row.id}`} className="gap-2">
              <RotateCcw className="h-4 w-4 text-teal-500 dark:text-teal-400" /> {t("billing.returnMedicine")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteBillConfirm({ open: true, billId: row.id }); }} className="text-red-600 dark:text-red-400 gap-2" data-testid={`action-delete-${row.id}`}>
            <Trash2 className="h-4 w-4" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("billing.title")}
        description={t("billing.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-bill">
                <Plus className="h-4 w-4 mr-1" /> {t("billing.createBill")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
              <DialogHeader className="pb-4 border-b border-border/50">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">{showPreview ? t("billing.invoice") : t("billing.createBill")}</DialogTitle>
                <DialogDescription className="text-muted-foreground">{showPreview ? t("billing.invoice") : t("billing.subtitle")}</DialogDescription>
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
                        <h2 className="text-base font-bold text-blue-700 dark:text-blue-400">{settings?.clinicName || ""}</h2>
                        {settings?.address && <p className="text-[10px] text-muted-foreground">{settings.address}</p>}
                        {settings?.phone && <p className="text-[10px] text-muted-foreground">{settings.phone}</p>}
                        {settings?.email && <p className="text-[10px] text-muted-foreground">{settings.email}</p>}
                      </div>
                      <div className="text-right">
                        <h3 className="text-xl font-extrabold tracking-wide">{t("billing.invoice")}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Invoice N°: <span className="font-semibold text-foreground">{(settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV"}{String((bills?.length || 0) + 1).padStart(5, "0")}</span></p>
                        <p className="text-xs text-muted-foreground">Date: {new Date(paymentDate || new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                        <Badge className="mt-1.5 bg-amber-500 text-white border-amber-600">{t("billing.pending")}</Badge>
                      </div>
                    </div>

                    {/* Patient & Details */}
                    <div className="grid grid-cols-2 gap-0 rounded-md border bg-muted/30 mb-4">
                      <div className="p-3">
                        <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-semibold tracking-wide mb-1">{t("billing.patient")}</p>
                        <p className="text-sm font-semibold">{patients.find(p => p.id === Number(selectedPatient))?.name || "-"}</p>
                        {(() => { const p = patients.find(pt => pt.id === Number(selectedPatient)); return p ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">ID: {p.patientId}</p>
                            {p.gender && <p className="text-[11px] text-muted-foreground">Gender: {p.gender}</p>}
                          </>
                        ) : null; })()}
                      </div>
                      <div className="p-3 border-l">
                        <p className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold tracking-wide mb-1">Details</p>
                        {referenceDoctor && referenceDoctor !== "none" && (
                          <p className="text-[11px]"><span className="text-muted-foreground">Ref Doctor:</span> <span className="font-medium">{referenceDoctor}</span></p>
                        )}
                        <p className="text-[11px]"><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{getPaymentLabel(paymentMethod)}</span></p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-4 rounded-md overflow-hidden border">
                      <div className="grid grid-cols-[36px,1fr,70px,46px,80px] bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[11px] font-semibold">
                        <span className="p-2 text-center">#</span>
                        <span className="p-2">Description</span>
                        <span className="p-2 text-right">Price</span>
                        <span className="p-2 text-center">Qty</span>
                        <span className="p-2 text-right">Total ({settings?.currency || "USD"})</span>
                      </div>
                      {billItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-[36px,1fr,70px,46px,80px] text-sm border-b last:border-b-0">
                          <span className="p-2 text-center text-muted-foreground text-xs">{i + 1}</span>
                          <span className="p-2">{item.name}</span>
                          <span className="p-2 text-right text-muted-foreground">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{item.unitPrice.toFixed(2)}</span>
                          <span className="p-2 text-center">{item.quantity}</span>
                          <span className="p-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-4">
                      <div className="w-64 space-y-1 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("common.subtotal")}</span>
                          <span className="text-right text-emerald-600 dark:text-emerald-400">{formatDualCurrency(subtotal, settings)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{t("billing.discount")}{discountType === "percentage" ? ` (${Number(discount) || 0}%)` : ""}</span>
                          <span className="text-right text-red-500">-{formatDualCurrency(discountAmount, settings)}</span>
                        </div>
                        <Separator />
                        {(() => {
                          const { primaryStr, secondaryStr } = getCurrencyParts(total, settings);
                          return (
                            <>
                              <div className="flex justify-between gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base pt-0.5">
                                <span>{t("billing.grandTotal")}</span>
                                <span className="text-right">{primaryStr}</span>
                              </div>
                              {secondaryStr && (
                                <div className="flex justify-between gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base">
                                  <span>{t("billing.grandTotal")}</span>
                                  <span className="text-right">{secondaryStr}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="rounded-md bg-violet-500/10 border border-violet-500/20 p-3 mb-4">
                      <p className="text-[10px] uppercase text-violet-700 dark:text-violet-400 font-semibold tracking-wide mb-1">{t("billing.paymentMethod")}</p>
                      <p className="text-xs text-muted-foreground">Payment for the above medical services at {settings?.clinicName || ""}.</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{t("common.amount")}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatDualCurrency(total, settings)}</span> via <span className="font-semibold text-foreground">{getPaymentLabel(paymentMethod)}</span></p>
                    </div>

                    {/* Footer */}
                    <Separator className="mb-3" />
                    <div className="text-center space-y-0.5" data-testid="invoice-footer">
                      <p className="text-sm font-semibold">Thank you for choosing {settings?.clinicName || "us"}!</p>
                      <p className="text-xs text-muted-foreground">For questions, contact {settings?.email || "your clinic"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(false)}
                      data-testid="button-back-to-form"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      {t("common.back")}
                    </Button>
                    <Button
                      onClick={() => { setBillAction("print"); handleCreateBill(); }}
                      disabled={createBillMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-600 text-white border-blue-700"
                      data-testid="button-confirm-print"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      {createBillMutation.isPending ? t("common.loading") : t("billing.printInvoice")}
                    </Button>
                  </div>
                </div>
              ) : (

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Invoice</span>
                    <Badge variant="outline" className="font-mono text-xs">{(settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV"}{String((bills?.length || 0) + 1).padStart(5, "0")}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-[160px]"
                      data-testid="input-payment-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-blue-500" />
                      <Label className="text-sm font-semibold">{t("billing.patient")} *</Label>
                    </div>
                    <SearchableSelect
                      value={selectedPatient}
                      onValueChange={setSelectedPatient}
                      placeholder={t("billing.selectPatient")}
                      searchPlaceholder="Search patient name or ID..."
                      emptyText="No patient found."
                      data-testid="select-bill-patient"
                      options={patients.map(p => ({
                        value: String(p.id),
                        label: `${p.name} (${p.patientId})`,
                        searchText: `${p.name} ${p.patientId}`,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-violet-500" />
                      <Label className="text-sm font-semibold">Doctor / Refer Name</Label>
                    </div>
                    <SearchableSelect
                      value={referenceDoctor}
                      onValueChange={setReferenceDoctor}
                      placeholder="Select doctor"
                      searchPlaceholder="Search doctor..."
                      emptyText="No doctor found."
                      data-testid="select-reference-doctor"
                      options={doctorOptions}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold">{t("billing.services")}</span>
                      </div>
                      <SearchableSelect
                        onValueChange={addServiceItem}
                        placeholder={t("billing.selectService")}
                        searchPlaceholder="Search service..."
                        emptyText="No service found."
                        data-testid="select-add-service"
                        resetAfterSelect
                        options={services.filter(s => s.isActive).map(s => ({
                          value: String(s.id),
                          label: `${s.name} - $${s.price}`,
                          searchText: s.name,
                        }))}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Pill className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm font-semibold">Injection</span>
                      </div>
                      <SearchableSelect
                        onValueChange={addInjectionItem}
                        placeholder="Select Injection"
                        searchPlaceholder="Search injection..."
                        emptyText="No injection found."
                        data-testid="select-add-injection"
                        resetAfterSelect
                        options={injectionsList.filter(inj => inj.isActive).map(inj => ({
                          value: String(inj.id),
                          label: `${inj.name} - $${inj.price}`,
                          searchText: inj.name,
                        }))}
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <Package className="h-4 w-4 text-fuchsia-500" />
                        <span className="text-sm font-semibold">Packages</span>
                      </div>
                      <SearchableSelect
                        onValueChange={addPackageToBill}
                        placeholder="Select Package"
                        searchPlaceholder="Search package..."
                        emptyText="No package found."
                        data-testid="select-add-package"
                        resetAfterSelect
                        options={packagesList.filter(p => p.isActive).map(p => {
                          const total = (p.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
                          return {
                            value: String(p.id),
                            label: `${p.name} - $${total.toFixed(2)} (${(p.items || []).length} items)`,
                            searchText: p.name,
                          };
                        })}
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-semibold">{t("billing.medicines")}</span>
                        <span className="text-xs text-muted-foreground">(pieces)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Barcode className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SearchInputWithBarcode
                          placeholder="Scan barcode to add medicine"
                          className="flex-1 h-9 text-sm"
                          value={medicineBarcodeScan}
                          onChange={(e) => setMedicineBarcodeScan(e.target.value)}
                          onSearch={addMedicineByBarcode}
                          data-testid="input-medicine-barcode-scan"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            onValueChange={addMedicineItem}
                            placeholder={t("billing.selectMedicine")}
                            searchPlaceholder="Search medicine..."
                            emptyText="No medicine found."
                            data-testid="select-add-medicine"
                            resetAfterSelect
                            options={medicines.filter(m => m.isActive).map(m => {
                              const unitPrice = getSellingPricePerPiece(m);
                              const stock = m.stockCount ?? 0;
                              const alert = m.stockAlert ?? 10;
                              const status = stock === 0 ? "Out" : stock < alert ? "Low" : "In stock";
                              return {
                                value: String(m.id),
                                label: `${m.name} · $${unitPrice.toFixed(2)}/pc · ${stock} ${status}`,
                                searchText: `${m.name} ${m.category || ""}`,
                              };
                            })}
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor="med-qty-add" className="text-xs text-muted-foreground whitespace-nowrap">Qty</Label>
                          <Input
                            id="med-qty-add"
                            type="number"
                            min={1}
                            className="w-20 h-9 text-center"
                            value={medicineQty}
                            onChange={(e) => setMedicineQty(Math.max(1, Number(e.target.value) || 1))}
                            data-testid="input-medicine-qty-add"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Selling price per piece. Quantity is always in pieces.</p>
                    </CardContent>
                  </Card>
                </div>

                {billItems.length > 0 && (
                  <Card>
                    <CardContent className="p-0 overflow-hidden">
                      <div className="grid grid-cols-[1fr,80px,70px,85px,40px] gap-2 px-4 py-2.5 bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span>Item</span>
                        <span className="text-right">Price</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Total</span>
                        <span></span>
                      </div>
                      {billItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-[1fr,80px,70px,85px,40px] gap-2 px-4 py-2 items-center border-t text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {item.type === "service" ? "SVC" : item.type === "injection" ? "INJ" : "MED"}
                            </Badge>
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="text-right text-muted-foreground text-xs">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{item.unitPrice.toFixed(2)}</span>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(i, Number(e.target.value))}
                            className="h-7 text-center text-xs"
                            data-testid={`input-bill-qty-${i}`}
                          />
                          <span className="text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{item.total.toFixed(2)}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(i)} data-testid={`button-remove-item-${i}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-500" />
                      <Label className="text-sm font-semibold">{t("billing.discount")}</Label>
                    </div>
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-violet-500" />
                      <Label className="text-sm font-semibold">{t("billing.paymentMethod")}</Label>
                    </div>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(pm => (
                          <SelectItem key={pm.value} value={pm.value}>
                            <div className="flex items-center gap-2">
                              <pm.icon className="h-3.5 w-3.5" />
                              <span>{pm.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("common.subtotal")}</span>
                      <span className="font-medium">{formatDualCurrency(subtotal, settings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("billing.discount")}{discountType === "percentage" ? ` (${discountValue}%)` : ""}
                      </span>
                      <span className="text-red-500 font-medium">-{formatDualCurrency(discountAmount, settings)}</span>
                    </div>
                    <Separator />
                    {(() => {
                      const { primaryStr, secondaryStr } = getCurrencyParts(total, settings);
                      return (
                        <>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-base font-bold">{t("billing.grandTotal")}</span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{primaryStr}</span>
                          </div>
                          {secondaryStr && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{t("billing.grandTotal")}</span>
                              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{secondaryStr}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    onClick={() => { setBillAction("create"); handleCreateBill(); }}
                    disabled={createBillMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-700"
                    data-testid="button-submit-bill"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    {createBillMutation.isPending && billAction === "create" ? t("common.creating") : t("billing.createBill")}
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
                    {t("billing.printInvoice")}
                  </Button>
                  <Button
                    onClick={() => { setBillAction("payment"); handleCreateBill(); }}
                    disabled={createBillMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-600 text-white border-amber-700"
                    data-testid="button-make-payment"
                  >
                    <CreditCard className="h-4 w-4 mr-1.5" />
                    {createBillMutation.isPending && billAction === "payment" ? t("common.loading") : t("billing.title")}
                  </Button>
                </div>
              </div>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <div className="rounded-md bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-600 p-4 md:p-5" data-testid="billing-banner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/15 backdrop-blur-sm">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t("billing.title")}</h2>
                <p className="text-blue-100 text-xs">{t("billing.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 rounded-md bg-white/15 backdrop-blur-sm px-3 py-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                <span className="text-sm text-white font-semibold" data-testid="stat-total-revenue">{formatDualCurrency(totalRevenue, settings)}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-white/15 backdrop-blur-sm px-3 py-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-200" />
                <span className="text-sm text-white font-semibold" data-testid="stat-total-bills">{bills.length} {t("billing.totalBills")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="billing-stats">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                <Receipt className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("billing.totalBills")}</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">{bills.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-500 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("billing.paid")}</p>
                <p className="text-xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">{formatDualCurrency(totalPaid, settings)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("billing.paidBills")}</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums" data-testid="stat-paid">{paidCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t("billing.pending")}</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums" data-testid="stat-pending">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter Bar */}
        <DateFilterBar datePeriod={datePeriod} setDatePeriod={setDatePeriod} customFromDate={customFromDate} setCustomFromDate={setCustomFromDate} customToDate={customToDate} setCustomToDate={setCustomToDate} monthYear={monthYear} setMonthYear={setMonthYear} dateRange={dateRange} />

        {/* Bills Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">{t("billing.totalBills")}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{filteredBills.length}</Badge>
            </div>
            <div className="w-64">
              <SearchInputWithBarcode
                placeholder={t("common.search")}
                className="h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={(v) => setSearchTerm(v)}
                data-testid="input-search-bills"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={billColumns} data={filteredBills} isLoading={isLoading} emptyMessage={t("common.noData")} onRowClick={(row) => setViewBill(row)} />
          </CardContent>
        </Card>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewBill} onOpenChange={(open) => { if (!open) setViewBill(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-4xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("billing.invoice")} - {viewBill?.billNo}</DialogTitle>
            <DialogDescription>{t("billing.subtitle")}</DialogDescription>
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
                      <h2 className="text-base font-bold text-blue-700 dark:text-blue-400">{settings?.clinicName || ""}</h2>
                      {settings?.address && <p className="text-[10px] text-muted-foreground">{settings.address}</p>}
                      {settings?.phone && <p className="text-[10px] text-muted-foreground">{settings.phone}</p>}
                      {settings?.email && <p className="text-[10px] text-muted-foreground">{settings.email}</p>}
                    </div>
                    <div className="text-right">
                      <h3 className="text-xl font-extrabold tracking-wide">{t("billing.invoice")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Invoice #: <span className="font-semibold text-foreground">{viewBill.billNo}</span></p>
                      <p className="text-xs text-muted-foreground">{t("common.date")}: {new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                      {(viewBill.billNo || "").replace(/[^A-Za-z0-9\-]/g, "") && (
                        <div className="mt-1.5" style={{ fontFamily: "'Libre Barcode 128', monospace", fontSize: 36, letterSpacing: 2, lineHeight: 1, color: "var(--foreground)" }}>
                          {(viewBill.billNo || "").replace(/[^A-Za-z0-9\-]/g, "")}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide">{viewBill.billNo}</p>
                      <Badge className={`mt-1.5 ${viewBill.status === "paid" ? "bg-emerald-600 border-emerald-700" : "bg-amber-500 border-amber-600"} text-white`}>
                        {viewBill.status === "paid" ? t("billing.paid") : t("billing.pending")}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0 rounded-md border bg-muted/30 mb-4">
                    <div className="p-3">
                      <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-semibold tracking-wide mb-1">{t("billing.patient")}</p>
                      <p className="text-sm font-semibold">{viewBill.patientName || patient?.name || "-"}</p>
                      {patient?.patientId && <p className="text-[11px] text-muted-foreground">ID: {patient.patientId}</p>}
                      {patient?.gender && <p className="text-[11px] text-muted-foreground">Gender: {patient.gender}</p>}
                    </div>
                    <div className="p-3 border-l">
                      <p className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold tracking-wide mb-1">Details</p>
                      {viewBill.referenceDoctor && <p className="text-[11px]"><span className="text-muted-foreground">Ref Doctor:</span> <span className="font-medium">{viewBill.referenceDoctor}</span></p>}
                      <p className="text-[11px]"><span className="text-muted-foreground">Payment:</span> <span className="font-medium">{getPaymentLabel(viewBill.paymentMethod)}</span></p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-md overflow-hidden border">
                    <div className="grid grid-cols-[36px,1fr,70px,46px,80px] bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[11px] font-semibold">
                      <span className="p-2 text-center">#</span>
                      <span className="p-2">{t("common.description")}</span>
                      <span className="p-2 text-right">{t("common.price")}</span>
                      <span className="p-2 text-center">{t("common.quantity")}</span>
                      <span className="p-2 text-right">{t("common.total")}</span>
                    </div>
                    {items.map((item: any, i: number) => (
                      <div key={i} className="grid grid-cols-[36px,1fr,70px,46px,80px] text-sm border-b last:border-b-0">
                        <span className="p-2 text-center text-muted-foreground text-xs">{i + 1}</span>
                        <span className="p-2">{item.name}</span>
                        <span className="p-2 text-right text-muted-foreground">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{Number(item.unitPrice).toFixed(2)}</span>
                        <span className="p-2 text-center">{item.quantity}</span>
                        <span className="p-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{(CURRENCY_SYMBOLS[settings?.currency || "USD"] || "$")}{Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mb-4">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{t("common.subtotal")}</span>
                        <span className="text-right text-emerald-600 dark:text-emerald-400">{formatDualCurrency(vSubtotal, settings)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{t("billing.discount")}</span>
                        <span className="text-right text-red-500">-{formatDualCurrency(vDiscount, settings)}</span>
                      </div>
                      <Separator />
                      {(() => {
                        const { primaryStr, secondaryStr } = getCurrencyParts(vTotal, settings);
                        return (
                          <>
                            <div className="flex justify-between gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base pt-0.5">
                              <span>{t("billing.grandTotal")}</span>
                              <span className="text-right">{primaryStr}</span>
                            </div>
                            {secondaryStr && (
                              <div className="flex justify-between gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base">
                                <span>{t("billing.grandTotal")}</span>
                                <span className="text-right">{secondaryStr}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="rounded-md bg-violet-500/10 border border-violet-500/20 p-3 mb-4">
                    <p className="text-[10px] uppercase text-violet-700 dark:text-violet-400 font-semibold tracking-wide mb-1">{t("billing.paymentMethod")}</p>
                    <p className="text-xs text-muted-foreground">Payment for the above medical services at {settings?.clinicName || ""}.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{t("billing.paid")}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatDualCurrency(Number(viewBill.paidAmount), settings)}</span> via <span className="font-semibold text-foreground">{getPaymentLabel(viewBill.paymentMethod)}</span></p>
                  </div>

                  <Separator className="mb-3" />
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-semibold">Thank you for choosing {settings?.clinicName || "us"}!</p>
                    <p className="text-xs text-muted-foreground">For questions, contact {settings?.email || "your clinic"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => { printReceipt(viewBill, "compact"); }} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white" data-testid="button-view-print-compact">
                    <Printer className="h-4 w-4 mr-1.5" /> Print (Compact)
                  </Button>
                  <Button onClick={() => { printReceipt(viewBill, "full"); }} className="bg-blue-600 hover:bg-blue-600 text-white border-blue-700" data-testid="button-view-print-full">
                    <Printer className="h-4 w-4 mr-1.5" /> Print (Full size)
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Return medicine dialog */}
      <Dialog open={!!returnBill} onOpenChange={(open) => { if (!open) { setReturnBill(null); setReturnQuantities({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("billing.returnMedicineTitle")}</DialogTitle>
            <DialogDescription>{t("billing.returnMedicineDesc")}</DialogDescription>
          </DialogHeader>
          {returnBill && (() => {
            const items: any[] = Array.isArray(returnBill.items) ? returnBill.items : [];
            const medicineRows = items
              .map((item: any, index: number) => ({ item, index }))
              .filter(({ item }: { item: any }) => item?.type === "medicine" && item.medicineId != null);
            const hasAnyReturn = medicineRows.some(({ index }: { index: number }) => (returnQuantities[index] ?? 0) > 0);
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {returnBill.billNo} · {patients.find(p => p.id === Number(returnBill.patientId))?.name ?? "-"}
                </p>
                <div className="space-y-3">
                  {medicineRows.map(({ item, index }: { item: any; index: number }) => {
                    const sold = typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 0;
                    const ret = Math.min(sold, Math.max(0, returnQuantities[index] ?? 0));
                    return (
                      <div key={index} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Sold: {sold} · {formatDualCurrency(Number(item.unitPrice || 0) * ret, settings)} refund</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Label htmlFor={`return-qty-${index}`} className="text-xs whitespace-nowrap">{t("billing.returnQty")}</Label>
                          <Input
                            id={`return-qty-${index}`}
                            type="number"
                            min={0}
                            max={sold}
                            className="w-20 h-9 text-center"
                            value={returnQuantities[index] ?? 0}
                            onChange={(e) => setReturnQuantities(prev => ({ ...prev, [index]: Math.max(0, Math.min(sold, Math.floor(Number(e.target.value) || 0))) }))}
                            data-testid={`input-return-qty-${index}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setReturnBill(null); setReturnQuantities({}); }}>{t("common.cancel")}</Button>
                  <Button
                    disabled={!hasAnyReturn || returnMedicineMutation.isPending}
                    onClick={() => {
                      const returns = medicineRows
                        .filter(({ index }: { index: number }) => (returnQuantities[index] ?? 0) > 0)
                        .map(({ index }: { index: number }) => ({ itemIndex: index, quantity: returnQuantities[index] ?? 0 }));
                      if (returns.length > 0) returnMedicineMutation.mutate({ billId: returnBill.id, returns });
                    }}
                    data-testid="button-process-return"
                  >
                    {returnMedicineMutation.isPending ? t("common.updating") + "..." : t("billing.processReturn")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteBillConfirm.open}
        onOpenChange={(open) => setDeleteBillConfirm((c) => ({ ...c, open }))}
        title={t("common.delete") || "Delete bill"}
        description="Are you sure you want to delete this bill? This cannot be undone."
        confirmLabel={t("common.delete") || "Delete"}
        cancelLabel={t("common.cancel") || "Cancel"}
        variant="destructive"
        onConfirm={() => { if (deleteBillConfirm.billId != null) deleteBillMutation.mutate(deleteBillConfirm.billId); }}
      />

      {/* Edit Bill Dialog */}
      <Dialog open={!!editBill} onOpenChange={(open) => { if (!open) setEditBill(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("common.edit")} - {editBill?.billNo}</DialogTitle>
            <DialogDescription>{t("billing.subtitle")}</DialogDescription>
          </DialogHeader>
          {editBill && (() => {
            const [editStatus, setEditStatus] = [editBill._editStatus || editBill.status, (v: string) => setEditBill({ ...editBill, _editStatus: v })];
            const [editPaid, setEditPaid] = [editBill._editPaid || String(editBill.paidAmount), (v: string) => setEditBill({ ...editBill, _editPaid: v })];
            const [editMethod, setEditMethod] = [editBill._editMethod || editBill.paymentMethod, (v: string) => setEditBill({ ...editBill, _editMethod: v })];
            const [editDoctor, setEditDoctor] = [editBill._editDoctor ?? (editBill.referenceDoctor || ""), (v: string) => setEditBill({ ...editBill, _editDoctor: v })];
            return (
              <div className="space-y-3">
                <div>
                  <Label>{t("common.status")}</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger data-testid="edit-bill-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">{t("billing.paid")}</SelectItem>
                      <SelectItem value="partial">{t("billing.partial")}</SelectItem>
                      <SelectItem value="unpaid">{t("billing.pending")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("billing.paid")} ($)</Label>
                  <Input type="number" step="0.01" value={editPaid} onChange={(e) => setEditPaid(e.target.value)} data-testid="edit-bill-paid" />
                </div>
                <div>
                  <Label>{t("billing.paymentMethod")}</Label>
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
                  <Label>{t("dashboard.doctor")}</Label>
                  <SearchableSelect
                    value={editDoctor || "none"}
                    onValueChange={(v) => setEditDoctor(v === "none" ? "" : v)}
                    placeholder="None"
                    searchPlaceholder="Search doctor..."
                    emptyText="No doctor found."
                    data-testid="edit-bill-doctor"
                    options={doctorOptions}
                  />
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
                  {updateBillMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
