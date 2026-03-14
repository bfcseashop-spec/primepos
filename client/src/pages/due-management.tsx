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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { useGlobalBarcodeScanner } from "@/hooks/use-global-barcode-scanner";
import { billNoMatches } from "@/lib/bill-utils";
import { Clock, DollarSign, User, Plus, Receipt, X, RefreshCw } from "lucide-react";
import type { Patient } from "@shared/schema";

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
      const res = await fetch(`/api/dues?${params}`, { credentials: "include" });
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
      const res = await fetch(`/api/dues/stats?${params}`, { credentials: "include" });
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

  const { data: labTests = [] } = useQuery<any[]>({ queryKey: ["/api/lab-tests"], retry: false });

  const summaries = summaryData?.summaries ?? [];
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
        if (ps) {
          setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
        } else setSearch(v);
      } catch {
        const lt = labTests.find((t: any) => t.id === sampleOrLabId);
        if (lt?.patientId) {
          const ps = s.find((x) => x.patient.id === lt.patientId);
          if (ps) setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
          else setSearch(v);
        } else setSearch(v);
      }
      return;
    }
    // Lab test code: LAB-TEST|...| or LT-0008
    const labMatch = v.match(/^LAB-TEST\|([^|]+)\|/);
    const testCode = labMatch ? labMatch[1] : (v.includes("|") ? "" : v);
    if (testCode) {
      const lt = labTests.find((t: any) => (t.testCode || "").toLowerCase() === testCode.toLowerCase());
      if (lt?.patientId) {
        const ps = s.find((x) => x.patient.id === lt.patientId);
        if (ps) setSearch(ps.patient.patientId ?? ps.patient.name ?? "");
        else setSearch(v);
      } else setSearch(v);
      return;
    }
    setSearch(v);
  }, [summaryData?.summaries, bills, labTests]);

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

  const patientBills = selectedPatient
    ? bills.filter((b: any) => b.patientId === selectedPatient.patient.id && Number(b.total ?? 0) > Number(b.paidAmount ?? 0))
    : [];

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
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Patients with outstanding balance
            </CardTitle>
            <div className="flex items-center gap-2">
              {(summaryError || statsError) && (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { refetchSummary(); refetchStats(); }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
              )}
              <SearchInputWithBarcode
                placeholder="Search / Scan barcode (patient ID, invoice, lab, sample)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onSearch={handleBarcodeSearch}
                className="h-8 text-sm w-64"
                wrapperClassName="w-64"
              />
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
