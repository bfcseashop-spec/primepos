import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { useGlobalBarcodeScanner } from "@/hooks/use-global-barcode-scanner";
import { billNoMatches } from "@/lib/bill-utils";
import { TestTubes, CheckCircle2, Clock, Beaker, Barcode, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";

type SampleCollection = {
  id: number;
  labTestId: number;
  patientId: number;
  billId?: number | null;
  testName: string;
  sampleType: string;
  status: string;
  collectedAt?: string | null;
  collectedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  patientName?: string | null;
  patientIdCode?: string | null;
};

function BarcodePreview({ sample }: { sample: SampleCollection }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const barcodeValue = "SC" + sample.id;
  useEffect(() => {
    if (svgRef.current && sample) {
      try {
        JsBarcode(svgRef.current, barcodeValue, { format: "CODE128", width: 1, height: 25, displayValue: false });
      } catch (e) {
        // ignore
      }
    }
  }, [sample, barcodeValue]);
  return (
    <div className="p-4 bg-white rounded-md border w-full">
      <div className="flex flex-col items-center text-center gap-2">
        <svg ref={svgRef} className="w-full max-w-[200px]" data-testid="img-sample-barcode" />
        <p className="font-mono text-sm font-bold">{barcodeValue}</p>
        <p className="text-xs text-muted-foreground">{sample.testName} • {sample.patientName || "-"}</p>
      </div>
    </div>
  );
}

export default function SampleCollectionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [barcodeSample, setBarcodeSample] = useState<SampleCollection | null>(null);
  const [viewSample, setViewSample] = useState<SampleCollection | null>(null);

  const { data: samples = [], isLoading } = useQuery<SampleCollection[]>({
    queryKey: ["/api/sample-collections"],
  });

  const { data: bills = [] } = useQuery<{ id: number; billNo: string }[]>({
    queryKey: ["/api/bills"],
  });

  const { data: labTests = [] } = useQuery<{ id: number; testCode: string }[]>({
    queryKey: ["/api/lab-tests"],
  });

  const handleBarcodeSearch = async (value: string) => {
    const v = value?.trim() ?? "";
    if (!v) return;
    // Sample barcode: SC5 or plain 5
    const scMatch = v.match(/^SC(\d+)$/i);
    const sampleId = scMatch ? parseInt(scMatch[1], 10) : (/^\d+$/.test(v) ? parseInt(v, 10) : null);
    if (sampleId != null) {
      try {
        const res = await apiRequest("GET", `/api/sample-collections/${sampleId}`);
        const s = await res.json();
        setSearchTerm("");
        setViewSample(s);
        return;
      } catch {
        toast({ title: "Sample not found", variant: "destructive" });
        return;
      }
    }
    // Invoice: filter by bill (IAR-0017 matches IAR00017, etc.)
    const bill = bills.find((b: { billNo: string }) => billNoMatches(v, b.billNo || ""));
    if (bill) {
      const byBill = samples.filter((s: SampleCollection) => s.billId === bill.id);
      setSearchTerm(v);
      if (byBill.length === 1) setViewSample(byBill[0]);
      return;
    }
    // Lab test code: LAB-0008
    const labMatch = v.match(/^LAB-TEST\|([^|]+)\|/);
    const testCode = labMatch ? labMatch[1] : (v.includes("|") ? "" : v);
    if (testCode) {
      const lt = labTests.find((t: { testCode: string }) => (t.testCode || "").toLowerCase() === testCode.toLowerCase());
      if (lt) {
        const byLab = samples.filter((s: SampleCollection) => s.labTestId === lt.id);
        setSearchTerm(testCode);
        if (byLab.length === 1) setViewSample(byLab[0]);
        return;
      }
    }
    setSearchTerm(v);
  };

  useGlobalBarcodeScanner(handleBarcodeSearch);

  const markCollectedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/sample-collections/${id}`, {
        status: "collected",
        collectedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setMarkingId(null);
      toast({ title: "Sample marked as collected" });
    },
    onError: (err: Error) => {
      setMarkingId(null);
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const markCollected = (id: number) => {
    setMarkingId(id);
    markCollectedMutation.mutate(id);
  };

  const printBarcode = (sample: SampleCollection) => {
    const barcodeValue = "SC" + sample.id;
    const testName = (sample.testName || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const patientName = (sample.patientName || "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Sample ${barcodeValue}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
      <style>
        @page { size: 40mm 25mm landscape; margin: 1mm; }
        @media print { html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        body { font-family: Arial, sans-serif; margin: 0; padding: 1mm; display: flex; justify-content: center; align-items: center; min-height: 23mm; }
        .sticker { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; text-align: center; }
        .sticker .barcode-wrap { margin-bottom: 0.5mm; }
        .sticker .barcode-wrap svg { display: block; max-width: 100%; }
        .sticker .id { font-family: monospace; font-size: 5pt; font-weight: bold; margin-bottom: 0.5mm; }
        .sticker .test-name { font-size: 5pt; font-weight: bold; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sticker .patient-name { font-size: 4pt; color: #333; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      </style></head><body>
      <div class="sticker">
        <div class="barcode-wrap"><svg id="barcode"></svg></div>
        <div class="id">${barcodeValue}</div>
        <div class="test-name">${testName}</div>
        <div class="patient-name">${patientName}</div>
      </div>
      <script>
        window.addEventListener('load', function() {
          try {
            JsBarcode("#barcode", "${barcodeValue}", { format: "CODE128", width: 1, height: 25, displayValue: false, margin: 4 });
          } catch (e) { document.getElementById("barcode").innerHTML = "<text>Barcode error</text>"; }
          setTimeout(function() { window.print(); window.close(); }, 150);
        });
      <\/script>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const filtered = samples.filter((s) => {
    const bill = bills.find((b: { billNo: string }) => billNoMatches(searchTerm, b.billNo || ""));
    const lab = labTests.find((t: { testCode: string }) => (t.testCode || "").toLowerCase() === searchTerm.toLowerCase());
    const matchInvoice = !bill || s.billId === bill.id;
    const matchLab = !lab || s.labTestId === lab.id;
    const matchSearch =
      !searchTerm ||
      (s.testName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.patientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.patientIdCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill != null && s.billId === bill.id) ||
      (lab != null && s.labTestId === lab.id);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchInvoice && matchLab && matchSearch && matchStatus;
  });

  const pendingCount = samples.filter((s) => s.status === "pending").length;
  const collectedCount = samples.filter((s) => s.status === "collected").length;

  const columns = [
    {
      header: "Test",
      accessor: (row: SampleCollection) => (
        <span className="font-medium">{row.testName}</span>
      ),
    },
    {
      header: "Sample Type",
      accessor: (row: SampleCollection) => (
        <Badge variant="outline" className="text-xs">
          {row.sampleType}
        </Badge>
      ),
    },
    {
      header: "Patient",
      accessor: (row: SampleCollection) => (
        <span className="text-sm">
          {row.patientName || "-"} {row.patientIdCode && `(${row.patientIdCode})`}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row: SampleCollection) =>
        row.status === "collected" ? (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Collected
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        ),
    },
    {
      header: "Collected At",
      accessor: (row: SampleCollection) =>
        row.collectedAt
          ? new Date(row.collectedAt).toLocaleString()
          : "-",
    },
    {
      header: "Actions",
      accessor: (row: SampleCollection) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); setBarcodeSample(row); }}
            data-testid={`button-barcode-${row.id}`}
          >
            <Barcode className="h-4 w-4 mr-1.5" />
            Print Barcode
          </Button>
          {row.status === "pending" && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => { e.stopPropagation(); markCollected(row.id); }}
              disabled={markingId === row.id}
              data-testid={`button-collect-${row.id}`}
            >
              {markingId === row.id ? (
                "Marking..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Mark Collected
                </>
              )}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4 overflow-auto p-4 md:p-6">
      <PageHeader
        title="Sample Collection"
        description="Manage sample collection for lab tests. Mark samples as collected to allow tests to proceed."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{samples.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-muted-foreground">Collected</span>
            </div>
            <p className="text-2xl font-bold">{collectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <SearchInputWithBarcode
                  placeholder="Search / Scan barcode (SC5, invoice, lab)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={handleBarcodeSearch}
                  data-testid="input-search-samples"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                data-testid="select-status-filter"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="collected">Collected</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyMessage="No sample collections yet. They are created when a bill includes lab tests that require sample collection."
            onRowClick={(row) => setViewSample(row)}
          />
        </CardContent>
      </Card>

      {viewSample && (
        <Dialog open={!!viewSample} onOpenChange={(open) => { if (!open) setViewSample(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md">
            <DialogHeader>
              <DialogTitle>Sample Collection</DialogTitle>
              <DialogDescription>View sample collection details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Test</p>
                <p className="font-semibold">{viewSample.testName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Patient</p>
                <p className="font-medium">{viewSample.patientName || "-"}</p>
                {viewSample.patientIdCode && <p className="text-sm text-muted-foreground">ID: {viewSample.patientIdCode}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Sample Type</p>
                <Badge variant="outline">{viewSample.sampleType}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Status</p>
                {viewSample.status === "collected" ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">Collected</Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">Pending</Badge>
                )}
              </div>
              {viewSample.collectedAt && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Collected At</p>
                  <p className="text-sm">{new Date(viewSample.collectedAt).toLocaleString()}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setBarcodeSample(viewSample); setViewSample(null); }}>
                  <Barcode className="h-4 w-4 mr-2" /> Print Barcode
                </Button>
                {viewSample.status === "pending" && (
                  <Button onClick={() => { markCollected(viewSample.id); setViewSample(null); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Collected
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {barcodeSample && (
        <Dialog open={!!barcodeSample} onOpenChange={(open) => { if (!open) setBarcodeSample(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-purple-500" />
                Print Barcode
              </DialogTitle>
              <DialogDescription className="sr-only">Print barcode label for this sample collection (Code 128, landscape)</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <BarcodePreview sample={barcodeSample} />
              <Button
                className="w-full"
                onClick={() => printBarcode(barcodeSample)}
                data-testid="button-print-barcode"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Barcode Label
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
