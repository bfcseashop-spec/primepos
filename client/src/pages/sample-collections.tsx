import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TestTubes, CheckCircle2, Clock, Search, Beaker, QrCode, Printer } from "lucide-react";

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

export default function SampleCollectionsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [barcodeSample, setBarcodeSample] = useState<SampleCollection | null>(null);

  const { data: samples = [], isLoading } = useQuery<SampleCollection[]>({
    queryKey: ["/api/sample-collections"],
  });

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

  function generateBarcodeSvg(data: string): string {
    let seed = 0;
    for (let i = 0; i < data.length; i++) seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;
    const rects: string[] = [];
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        seed = (seed * 16807 + 0) % 2147483647;
        const isBorder = x === 0 || x === 19 || y === 0 || y === 19;
        const isCorner = (x < 4 && y < 4) || (x > 15 && y < 4) || (x < 4 && y > 15);
        if (isCorner || isBorder || seed % 3 === 0) {
          rects.push(`<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="black"/>`);
        }
      }
    }
    return `<svg viewBox="0 0 200 200" width="120" height="120">${rects.join("")}</svg>`;
  }

  const printBarcode = (sample: SampleCollection) => {
    const data = `SAMPLE|${sample.id}|${sample.labTestId}|${sample.testName}|${sample.patientIdCode || "N/A"}`;
    const svgHtml = generateBarcodeSvg(data);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Sample Barcode - ${sample.testName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
        .label { text-align: center; border: 1px solid #ccc; padding: 16px; }
        .barcode { margin: 12px 0; }
        .test-name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; }
        .id { font-family: monospace; font-size: 11px; margin-top: 4px; }
      </style></head><body>
      <div class="label">
        <div class="test-name">${sample.testName}</div>
        <div class="meta">${sample.sampleType} • ${sample.patientName || "-"}</div>
        <div class="id">${sample.patientIdCode || ""}</div>
        <div class="barcode">${svgHtml}</div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filtered = samples.filter((s) => {
    const matchSearch =
      (s.testName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.patientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.patientIdCode || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBarcodeSample(row)}
            data-testid={`button-barcode-${row.id}`}
          >
            <QrCode className="h-4 w-4 mr-1.5" />
            Print Barcode
          </Button>
          {row.status === "pending" && (
            <Button
              size="sm"
              variant="default"
              onClick={() => markCollected(row.id)}
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
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
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
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by test or patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
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
          />
        </CardContent>
      </Card>

      {barcodeSample && (
        <Dialog open={!!barcodeSample} onOpenChange={(open) => { if (!open) setBarcodeSample(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-500" />
                Print Barcode
              </DialogTitle>
              <DialogDescription className="sr-only">Print barcode label for this sample collection</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-4 bg-white rounded-md border">
                <svg viewBox="0 0 200 200" width="180" height="180" data-testid="img-sample-barcode-qr">
                  {(() => {
                    const data = `SAMPLE|${barcodeSample.id}|${barcodeSample.labTestId}|${barcodeSample.testName}|${barcodeSample.patientIdCode || "N/A"}`;
                    const cells: JSX.Element[] = [];
                    let seed = 0;
                    for (let i = 0; i < data.length; i++) seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;
                    for (let y = 0; y < 20; y++) {
                      for (let x = 0; x < 20; x++) {
                        seed = (seed * 16807 + 0) % 2147483647;
                        const isBorder = x === 0 || x === 19 || y === 0 || y === 19;
                        const isCorner = (x < 4 && y < 4) || (x > 15 && y < 4) || (x < 4 && y > 15);
                        if (isCorner || isBorder || seed % 3 === 0) {
                          cells.push(<rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" fill="black" />);
                        }
                      }
                    }
                    return cells;
                  })()}
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-sm">{barcodeSample.testName}</p>
                <p className="text-xs text-muted-foreground">{barcodeSample.sampleType} • {barcodeSample.patientName || "-"}</p>
                <p className="font-mono text-xs">{barcodeSample.patientIdCode || ""}</p>
              </div>
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
