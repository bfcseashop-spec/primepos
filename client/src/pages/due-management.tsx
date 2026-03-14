import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getApiUrl } from "@/lib/queryClient";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { useGlobalBarcodeScanner } from "@/hooks/use-global-barcode-scanner";
import { billNoMatches } from "@/lib/bill-utils";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, DollarSign, User, Plus, Receipt, X, RefreshCw, Download, FileSpreadsheet, FileText, Upload, Edit2, Trash2 } from "lucide-react";
import type { Patient } from "@shared/schema";

interface DuePayment {
  id: number;
  patientId: number;
  paymentDate: string;
  amount: string;
  paymentMethod: string;
  note?: string | null;
  createdAt?: string;
}

async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (typeof json?.message === "string") return json.message;
  } catch {
    // not JSON
  }
  return text || res.statusText || "Request failed";
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "aba", label: "ABA" },
  { value: "acleda", label: "Acleda" },
  { value: "other_bank", label: "Other Bank" },
  { value: "card", label: "Card" },
];

interface PatientDueSummary {
  patient: Patient;
  totalDue: number;
  totalPaid: number;
  balance: number;
  credit: number;
  billsCount: number;
}

export default function DueManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientDueSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  const [exporting, setExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"patients" | "payments">("patients");
  const [editPayment, setEditPayment] = useState<DuePayment | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const paymentsPageSize = 10;

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const { data: summaryData, isLoading, isError: summaryError, error: summaryErr, refetch: refetchSummary } = useQuery<{ summaries: PatientDueSummary[]; total: number }>({
    queryKey: ["/api/dues", debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter && statusFilter !== "all") params.set("statusFilter", statusFilter);
      const res = await fetch(getApiUrl(`/api/dues?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
  });

  const { data: stats, isError: statsError, error: statsErr, refetch: refetchStats } = useQuery<{ totalBalance: number; totalPatients: number }>({
    queryKey: ["/api/dues/stats", debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter && statusFilter !== "all") params.set("statusFilter", statusFilter);
      const res = await fetch(getApiUrl(`/api/dues/stats?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
  });

  useEffect(() => {
    if (summaryError && summaryErr) toast({ title: "Error", description: summaryErr.message || "Failed to load patients with dues", variant: "destructive" });
  }, [summaryError, summaryErr, toast]);

  useEffect(() => {
    if (statsError && statsErr) toast({ title: "Error", description: statsErr.message || "Failed to load due statistics", variant: "destructive" });
  }, [statsError, statsErr, toast]);

  const { data: bills = [] } = useQuery<any[]>({
    queryKey: ["/api/bills"],
  });

  const { data: patientsList = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: activeTab === "payments",
  });

  const { data: paymentsData, refetch: refetchPayments } = useQuery<{ payments: DuePayment[]; total: number }>({
    queryKey: ["/api/due/payments", paymentsPage, paymentsPageSize],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(paymentsPageSize), offset: String((paymentsPage - 1) * paymentsPageSize) });
      const res = await fetch(getApiUrl(`/api/due/payments?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    enabled: activeTab === "payments",
  });

  const { data: patientPaymentsData, refetch: refetchPatientPayments } = useQuery<{ payments: DuePayment[] }>({
    queryKey: ["/api/due/payments", selectedPatient?.patient.id],
    queryFn: async () => {
      if (!selectedPatient) return { payments: [] };
      const res = await fetch(getApiUrl(`/api/due/payments?patientId=${selectedPatient.patient.id}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      return res.json();
    },
    enabled: !!selectedPatient && paymentDialogOpen,
  });

  const summaries = summaryData?.summaries ?? [];
  const allPayments = paymentsData?.payments ?? [];
  const paymentsTotal = paymentsData?.total ?? 0;
  const patientPayments = patientPaymentsData?.payments ?? [];
  const totalBalance = stats?.totalBalance ?? 0;
  const totalPatients = stats?.totalPatients ?? 0;

  const handleBarcodeSearch = useCallback(async (value: string) => {
    const v = value?.trim() ?? "";
    if (!v) return;
    const s = summaryData?.summaries ?? [];
    const b = bills;
    // Patient ID (e.g. PAT-001)
    const pat = s.find((x) => (x.patient.patientId ?? "").toLowerCase() === v.toLowerCase());
    if (pat) {
      setSearch(v);
      return;
    }
    // Bill / invoice number
    const bill = b.find((x: any) => billNoMatches(v, x.billNo || ""));
    if (bill) {
      const patientSummary = s.find((x) => x.patient.id === bill.patientId);
      if (patientSummary) {
        setSearch(patientSummary.patient.patientId ?? patientSummary.patient.name ?? "");
      } else {
        setSearch(v);
      }
      return;
    }
    // Sample ID: SC5 or plain 5
    const scMatch = v.match(/^SC(\d+)$/i);
    const sampleOrLabId = scMatch ? parseInt(scMatch[1], 10) : (/^\d+$/.test(v) ? parseInt(v, 10) : null);
    if (sampleOrLabId != null) {
      try {
        const res = await apiRequest("GET", `/api/sample-collections/${sampleOrLabId}`);
        const sample = await res.json() as { patientId: number };
        const ps = s.find((x) => x.patient.id === sample.patientId);
        if (ps) setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
        else setSearch(v);
      } catch {
        try {
          const labRes = await apiRequest("GET", `/api/lab-tests/${sampleOrLabId}`);
          const lt = await labRes.json() as { patientId?: number };
          if (lt?.patientId) {
            const ps = s.find((x) => x.patient.id === lt.patientId);
            if (ps) setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
            else setSearch(v);
          } else setSearch(v);
        } catch {
          setSearch(v);
        }
      }
      return;
    }
    // Lab test code: LAB-TEST|...| or LT-0008
    const labMatch = v.match(/^LAB-TEST\|([^|]+)\|/);
    const testCode = labMatch ? labMatch[1] : (v.includes("|") ? "" : v);
    if (testCode) {
      try {
        const labList = await queryClient.fetchQuery<any[]>({ queryKey: ["/api/lab-tests"], retry: false });
        const lt = labList?.find((t: any) => (t.testCode || "").toLowerCase() === testCode.toLowerCase());
        if (lt?.patientId) {
          const ps = s.find((x) => x.patient.id === lt.patientId);
          if (ps) setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
          else setSearch(v);
        } else setSearch(v);
      } catch {
        setSearch(v);
      }
      return;
    }
    setSearch(v);
  }, [summaryData?.summaries, bills, queryClient]);

  useGlobalBarcodeScanner(handleBarcodeSearch);

  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: { patientId: number; amount: number; paymentMethod: string; note?: string; allocations: { billId: number; amount: number }[] }) => {
      const res = await apiRequest("POST", "/api/due/payments", {
        patientId: payload.patientId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        note: payload.note || null,
        allocations: payload.allocations,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dues/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setPaymentDialogOpen(false);
      setSelectedPatient(null);
      setPaymentAmount("");
      setAllocations({});
      toast({ title: "Payment recorded" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { id: number; paymentMethod: string; paymentDate: string }) => {
      const res = await apiRequest("PATCH", `/api/due/payments/${data.id}`, {
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dues/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/payments"] });
      setEditPayment(null);
      refetchPatientPayments?.();
      refetchPayments?.();
      toast({ title: "Payment updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/due/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dues/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/due/payments"] });
      setDeletePaymentId(null);
      refetchPatientPayments?.();
      refetchPayments?.();
      toast({ title: "Payment deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const patientBills = selectedPatient
    ? bills.filter((b: any) => b.patientId === selectedPatient.patient.id && Number(b.total ?? 0) > Number(b.paidAmount ?? 0))
    : [];

  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (statusFilter && statusFilter !== "all") params.set("statusFilter", statusFilter);
    return params;
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = buildExportParams();
      const res = await fetch(getApiUrl(`/api/due/export?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = await res.json();
      const rows = (data.summaries ?? []).map((r: any) => ({
        "Patient ID": r.patientId,
        "Patient Name": r.patientName,
        "Phone": r.phone,
        "Total Due": r.totalDue,
        "Total Paid": r.totalPaid,
        "Balance": r.balance,
        "Bills Count": r.billsCount,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Due Summary");
      XLSX.writeFile(wb, `due-management-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Export complete" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = buildExportParams();
      const res = await fetch(getApiUrl(`/api/due/export?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = await res.json();
      const rows = (data.summaries ?? []).map((r: any) => ({
        "Patient ID": r.patientId,
        "Patient Name": r.patientName,
        "Phone": r.phone,
        "Total Due": r.totalDue,
        "Total Paid": r.totalPaid,
        "Balance": r.balance,
        "Bills Count": r.billsCount,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `due-management-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Export complete" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const buf = await importFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      let success = 0;
      let errors = 0;
      for (const row of rows) {
        const patientId = String(row["Patient ID"] ?? row["patientId"] ?? "").trim();
        const amount = parseFloat(row["Amount"] ?? row["amount"] ?? "0");
        const dateStr = row["Date"] ?? row["date"] ?? row["Payment Date"] ?? "";
        if (!patientId || isNaN(amount) || amount <= 0) {
          errors++;
          continue;
        }
        const patient = summaries.find((s) => (s.patient.patientId ?? "").toLowerCase() === patientId.toLowerCase());
        if (!patient) {
          errors++;
          continue;
        }
        const patientBillsList = bills.filter((b: any) => b.patientId === patient.patient.id && Number(b.total ?? 0) > Number(b.paidAmount ?? 0));
        if (patientBillsList.length === 0) {
          errors++;
          continue;
        }
        let remaining = amount;
        const allocs: { billId: number; amount: number }[] = [];
        for (const b of patientBillsList.sort((a: any, b: any) => (a.createdAt || "").localeCompare(b.createdAt || ""))) {
          if (remaining <= 0) break;
          const total = Number(b.total ?? 0);
          const paid = Number(b.paidAmount ?? 0);
          const due = total - paid;
          const allocAmt = Math.min(remaining, due);
          if (allocAmt > 0) {
            allocs.push({ billId: b.id, amount: allocAmt });
            remaining -= allocAmt;
          }
        }
        if (allocs.length === 0) continue;
        const paymentDate = dateStr ? new Date(dateStr) : new Date();
        await apiRequest("POST", "/api/due/payments", {
          patientId: patient.patient.id,
          amount: allocs.reduce((s, a) => s + a.amount, 0),
          paymentMethod: String(row["Payment Method"] ?? row["paymentMethod"] ?? "cash").trim() || "cash",
          paymentDate: paymentDate.toISOString(),
          allocations: allocs,
        });
        success++;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/dues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dues/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      setShowImportDialog(false);
      setImportFile(null);
      toast({ title: "Import complete", description: `Imported ${success} payment(s). ${errors > 0 ? `${errors} row(s) skipped.` : ""}` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const openRecordPayment = (row: PatientDueSummary) => {
    setSelectedPatient(row);
    setPaymentAmount("");
    setAllocations({});
    setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = () => {
    if (!selectedPatient) return;
    if (patientBills.length === 0) {
      toast({ title: "No bills with balance", description: "This patient has no bills to allocate payment to.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid amount greater than 0.", variant: "destructive" });
      return;
    }
    const allocationList: { billId: number; amount: number }[] = [];
    let allocatedTotal = 0;
    const billRemainingMap = new Map(patientBills.map((b: any) => {
      const total = Number(b.total ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      return [b.id, total - paid];
    }));
    for (const [billIdStr, val] of Object.entries(allocations)) {
      const amt = parseFloat(val);
      if (amt > 0) {
        const billId = Number(billIdStr);
        const remaining = billRemainingMap.get(billId) ?? 0;
        if (amt > remaining + 0.01) {
          toast({ title: "Allocation exceeds balance", description: `Amount for bill exceeds remaining balance ($${remaining.toFixed(2)}).`, variant: "destructive" });
          return;
        }
        allocationList.push({ billId, amount: amt });
        allocatedTotal += amt;
      }
    }
    if (allocationList.length === 0) {
      toast({ title: "Allocate amount", description: "Allocate amount to at least one bill.", variant: "destructive" });
      return;
    }
    if (Math.abs(allocatedTotal - amount) > 0.01) {
      toast({ title: "Allocation mismatch", description: `Allocated total ($${allocatedTotal.toFixed(2)}) must equal payment amount ($${amount.toFixed(2)}).`, variant: "destructive" });
      return;
    }
    recordPaymentMutation.mutate({
      patientId: selectedPatient.patient.id,
      amount,
      paymentMethod,
      note: paymentNote.trim() || undefined,
      allocations: allocationList,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Due Management"
        description="View patients with outstanding dues and record payments against bills."
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10 shrink-0">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Patients with dues</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{totalPatients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-500/10 shrink-0">
                  <DollarSign className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Total balance</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">${totalBalance.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "patients" | "payments")} className="w-full">
              <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <TabsList className="h-9">
                  <TabsTrigger value="patients" className="gap-1.5">
                    <User className="h-3.5 w-3.5" /> Patients
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> Payments
                  </TabsTrigger>
                </TabsList>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 sr-only">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {activeTab === "patients" ? "Patients with outstanding balance" : "Payment history"}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {(summaryError || statsError) && (
                    <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { refetchSummary(); refetchStats(); }}>
                      <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1" disabled={exporting}>
                        <Download className="h-3.5 w-3.5" />
                        {exporting ? "Exporting…" : "Export"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export to Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <FileText className="h-3.5 w-3.5 mr-2" /> Export to CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-3.5 w-3.5" /> Import
                  </Button>
                  <SearchInputWithBarcode
                    placeholder="Search / Scan barcode (patient ID, invoice, lab, sample)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onSearch={handleBarcodeSearch}
                    className="h-8 text-sm w-64"
                    wrapperClassName="w-64"
                  />
                  {activeTab === "patients" && (
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="with_balance">With balance</SelectItem>
                        <SelectItem value="with_credit">With credit</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activeTab === "patients" ? (isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
            ) : summaries.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No patients with outstanding dues.</div>
            ) : (
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Patient</th>
                      <th className="text-left p-3 font-medium">UHID</th>
                      <th className="text-right p-3 font-medium">Total due</th>
                      <th className="text-right p-3 font-medium">Paid</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                      <th className="text-center p-3 font-medium">Bills</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => (
                      <tr key={s.patient.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{s.patient.name ?? "-"}</td>
                        <td className="p-3 text-muted-foreground">{s.patient.patientId ?? "-"}</td>
                        <td className="p-3 text-right">${s.totalDue.toFixed(2)}</td>
                        <td className="p-3 text-right text-green-600 dark:text-green-400">${s.totalPaid.toFixed(2)}</td>
                        <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400">${s.balance.toFixed(2)}</td>
                        <td className="p-3 text-center">{s.billsCount}</td>
                        <td className="p-3 text-right">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => openRecordPayment(s)}>
                            <Plus className="h-3.5 w-3.5" /> Record payment
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )) : activeTab === "payments" ? (
              <div className="space-y-4">
                {allPayments.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No payments recorded yet.</div>
                ) : (
                  <>
                    <div className="overflow-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-left p-3 font-medium">Patient ID</th>
                            <th className="text-right p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Method</th>
                            <th className="text-right p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allPayments.map((p) => {
                            const patient = (patientsList as Patient[]).find((x) => x.id === p.patientId) ?? summaries.find((s) => s.patient.id === p.patientId)?.patient;
                            return (
                              <tr key={p.id} className="border-b hover:bg-muted/30">
                                <td className="p-3">{format(new Date(p.paymentDate), "MMM d, yyyy")}</td>
                                <td className="p-3">{patient?.patientId ?? patient?.name ?? `#${p.patientId}`}</td>
                                <td className="p-3 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                                <td className="p-3">{PAYMENT_METHODS.find((pm) => pm.value === p.paymentMethod)?.label ?? p.paymentMethod}</td>
                                <td className="p-3 text-right">
                                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => { setEditPayment(p); setEditPaymentMethod(p.paymentMethod); setEditPaymentDate(format(new Date(p.paymentDate), "yyyy-MM-dd")); }}>
                                    <Edit2 className="h-3.5 w-3.5" /> Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {paymentsTotal > paymentsPageSize && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Showing {(paymentsPage - 1) * paymentsPageSize + 1}–{Math.min(paymentsPage * paymentsPageSize, paymentsTotal)} of {paymentsTotal}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={paymentsPage <= 1} onClick={() => setPaymentsPage((p) => p - 1)}>Previous</Button>
                          <Button variant="outline" size="sm" disabled={paymentsPage * paymentsPageSize >= paymentsTotal} onClick={() => setPaymentsPage((p) => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Import dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImportDialog(false)}>
          <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Import payments</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowImportDialog(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload Excel or CSV with columns: <strong>Patient ID</strong>, <strong>Amount</strong>, <strong>Date</strong> (optional), <strong>Payment Method</strong> (optional). Payments will be auto-allocated to bills.
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              {importFile && <p className="text-xs text-muted-foreground">Selected: {importFile.name}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); }}>Cancel</Button>
                <Button onClick={handleImport} disabled={!importFile || importing}>{importing ? "Importing…" : "Import"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record payment dialog */}
      {paymentDialogOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPaymentDialogOpen(false)}>
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Record payment — {selectedPatient.patient.name}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setPaymentDialogOpen(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Note" />
              </div>
              {patientPayments.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Payment history</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto rounded border p-2 space-y-1.5">
                    {patientPayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50">
                        <span>{format(new Date(p.paymentDate), "MMM d, yyyy")} — ${Number(p.amount).toFixed(2)} ({PAYMENT_METHODS.find((pm) => pm.value === p.paymentMethod)?.label ?? p.paymentMethod})</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => { setEditPayment(p); setEditPaymentMethod(p.paymentMethod); setEditPaymentDate(format(new Date(p.paymentDate), "yyyy-MM-dd")); setPaymentDialogOpen(false); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive hover:text-destructive" onClick={() => setDeletePaymentId(p.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Allocate to bills</Label>
                <p className="text-xs text-muted-foreground mb-2">Enter amount to apply to each bill. Total must equal payment amount.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                  {patientBills.map((bill: any) => {
                    const total = Number(bill.total ?? 0);
                    const paid = Number(bill.paidAmount ?? 0);
                    const remaining = total - paid;
                    if (remaining <= 0) return null;
                    return (
                      <div key={bill.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{bill.billNo ?? `Bill #${bill.id}`} — ${remaining.toFixed(2)} due</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={remaining}
                          className="w-24 h-8"
                          placeholder="0"
                          value={allocations[bill.id] ?? ""}
                          onChange={(e) => setAllocations((prev) => ({ ...prev, [bill.id]: e.target.value }))}
                        />
                      </div>
                    );
                  })}
                  {patientBills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No bills with balance for this patient.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitPayment} disabled={recordPaymentMutation.isPending || patientBills.length === 0}>
                  {recordPaymentMutation.isPending ? "Saving..." : "Record payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit payment dialog */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditPayment(null)}>
          <Card className="w-full max-w-sm m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Edit payment</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditPayment(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">${Number(editPayment.amount).toFixed(2)} — {format(new Date(editPayment.paymentDate), "MMM d, yyyy")}</p>
              <div>
                <Label>Payment method</Label>
                <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editPaymentDate} onChange={(e) => setEditPaymentDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
                <Button onClick={() => updatePaymentMutation.mutate({ id: editPayment.id, paymentMethod: editPaymentMethod, paymentDate: new Date(editPaymentDate).toISOString() })} disabled={updatePaymentMutation.isPending}>
                  {updatePaymentMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete payment confirmation */}
      {deletePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeletePaymentId(null)}>
          <Card className="w-full max-w-sm m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Delete payment</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setDeletePaymentId(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">This will reverse the payment and restore the bill balances. Are you sure?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletePaymentId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => deletePaymentMutation.mutate(deletePaymentId)} disabled={deletePaymentMutation.isPending}>
                  {deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
