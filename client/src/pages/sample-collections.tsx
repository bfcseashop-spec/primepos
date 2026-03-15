import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getApiUrl, normalizePaginatedResponse } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import { TablePagination } from "@/components/table-pagination";
import { useGlobalBarcodeScanner } from "@/hooks/use-global-barcode-scanner";
import { TestTubes, CheckCircle2, Clock, Beaker, Barcode, Printer, Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";
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
  const [editSample, setEditSample] = useState<SampleCollection | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; notes: string; collectedBy: string }>({ status: "pending", notes: "", collectedBy: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; sample: SampleCollection | null }>({ open: false, sample: null });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const { data: samplesData, isLoading } = useQuery<{ items: SampleCollection[]; total: number; pendingCount?: number; collectedCount?: number }>({
    queryKey: ["/api/sample-collections-paginated", page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(Math.max(1, pageSize)));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter !== "all") params.set("statusFilter", statusFilter);
      const res = await fetch(getApiUrl(`/api/sample-collections-paginated?${params}`), { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const raw = await res.json();
      return normalizePaginatedResponse(raw) as typeof raw;
    },
  });
  const samples = samplesData?.items ?? [];
  const samplesTotal = samplesData?.total ?? 0;
  const pendingCount = samplesData?.pendingCount ?? 0;
  const collectedCount = samplesData?.collectedCount ?? 0;

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
    // Invoice: lookup bill by billNo, then fetch samples for that bill
    try {
      const billRes = await fetch(getApiUrl(`/api/bills/by-billno?billNo=${encodeURIComponent(v)}`), { credentials: "include" });
      if (billRes.ok) {
        const bill = await billRes.json();
        setSearchTerm(v);
        const samplesRes = await fetch(getApiUrl(`/api/sample-collections-paginated?page=1&limit=10&billId=${bill.id}`), { credentials: "include" });
        if (samplesRes.ok) {
          const data = await samplesRes.json();
          const byBill = data.items || [];
          if (byBill.length === 1) setViewSample(byBill[0]);
        }
        return;
      }
    } catch { /* fall through */ }
    // Lab test code: lookup by testCode, then fetch samples for that lab test
    const labMatch = v.match(/^LAB-TEST\|([^|]+)\|/);
    const testCode = labMatch ? labMatch[1] : (v.includes("|") ? "" : v);
    if (testCode) {
      try {
        const ltRes = await fetch(getApiUrl(`/api/lab-tests/by-code?testCode=${encodeURIComponent(testCode)}`), { credentials: "include" });
        if (ltRes.ok) {
          const lt = await ltRes.json();
          setSearchTerm(testCode);
          const samplesRes = await fetch(getApiUrl(`/api/sample-collections-paginated?page=1&limit=10&labTestId=${lt.id}`), { credentials: "include" });
          if (samplesRes.ok) {
            const data = await samplesRes.json();
            const byLab = data.items || [];
            if (byLab.length === 1) setViewSample(byLab[0]);
          }
          return;
        }
      } catch { /* fall through */ }
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
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections-paginated"] });
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

  const updateSampleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status?: string; notes?: string; collectedBy?: string } }) => {
      const payload: Record<string, unknown> = {};
      if (data.status !== undefined) payload.status = data.status;
      if (data.notes !== undefined) payload.notes = data.notes || null;
      if (data.collectedBy !== undefined) payload.collectedBy = data.collectedBy || null;
      if (data.status === "collected") payload.collectedAt = new Date().toISOString();
      const res = await apiRequest("PATCH", `/api/sample-collections/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setEditSample(null);
      toast({ title: "Sample collection updated" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteSampleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sample-collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setDeleteConfirm({ open: false, sample: null });
      toast({ title: "Sample collection deleted" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/sample-collections/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sample-collections-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setSelectedIds(new Set());
      setDeleteBulkConfirm(false);
      toast({ title: `${ids.length} sample collection(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const openEdit = (row: SampleCollection) => {
    setEditSample(row);
    setEditForm({
      status: row.status,
      notes: row.notes ?? "",
      collectedBy: row.collectedBy ?? "",
    });
  };

  const printBarcode = (sample: SampleCollection) => {
    const barcodeValue = "SC" + sample.id;
    const testName = (sample.testName || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const patientName = (sample.patientName || "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Generate scannable CODE128 barcode in main window so it is present in print HTML (no CDN/timing in popup)
    let barcodeSvgHtml = "";
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, barcodeValue, {
        format: "CODE128",
        width: 1.2,
        height: 32,
        displayValue: false,
        margin: 3,
        lineColor: "#000000",
        background: "#ffffff",
      });
      barcodeSvgHtml = svg.outerHTML;
    } catch (e) {
      barcodeSvgHtml = `<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="12" fill="#000" font-size="8">${barcodeValue}</text></svg>`;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Sample ${barcodeValue}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 1.5in 1in; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 1.5in !important; height: 1in !important; max-height: 1in !important; overflow: hidden !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-wrap { width: 1.5in !important; height: 1in !important; max-height: 1in !important; min-height: 0 !important; margin: 0 !important; padding: 0.03in !important; page-break-after: avoid !important; page-break-inside: avoid !important; overflow: hidden !important; }
        }
        html, body { margin: 0; padding: 0; width: 1.5in; height: 1in; max-height: 1in; overflow: hidden; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-wrap { display: flex; align-items: center; justify-content: center; width: 1.5in; height: 1in; max-height: 1in; padding: 0.03in; overflow: hidden; }
        .sticker { border: 1px dashed #888; width: 100%; height: 100%; max-height: 100%; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0.02in; box-sizing: border-box; overflow: hidden; flex: 1 1 0; }
        .sticker .barcode-wrap { margin-bottom: 0.03in; }
        .sticker .barcode-wrap svg { display: block; max-width: 100%; max-height: 0.58in; }
        .sticker .barcode-wrap svg path, .sticker .barcode-wrap svg line { stroke: #000 !important; fill: #000 !important; }
        .sticker .id { font-family: monospace; font-size: 8pt; font-weight: bold; color: #000; margin-bottom: 0.02in; }
        .sticker .test-name { font-size: 8pt; font-weight: bold; line-height: 1.15; color: #000; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sticker .patient-name { font-size: 8pt; font-weight: bold; color: #000; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      </style></head><body>
      <div class="page-wrap">
        <div class="sticker">
          <div class="barcode-wrap">${barcodeSvgHtml}</div>
          <div class="id">${barcodeValue}</div>
          <div class="test-name">${testName}</div>
          <div class="patient-name">${patientName}</div>
        </div>
      </div>
      <script>setTimeout(function(){ window.print(); window.close(); }, 100);<\/script>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };


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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`} onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewSample(row); }} className="gap-2" data-testid={`action-view-${row.id}`}>
              <Eye className="h-4 w-4 text-blue-500" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2" data-testid={`action-edit-${row.id}`}>
              <Pencil className="h-4 w-4 text-amber-500" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBarcodeSample(row); }} className="gap-2" data-testid={`action-barcode-${row.id}`}>
              <Barcode className="h-4 w-4 text-purple-500" /> Print Barcode
            </DropdownMenuItem>
            {row.status === "pending" && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); markCollected(row.id); }}
                disabled={markingId === row.id}
                className="gap-2"
                data-testid={`action-collect-${row.id}`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {markingId === row.id ? "Marking..." : "Mark Collected"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, sample: row }); }}
              className="text-red-600 gap-2"
              data-testid={`action-delete-${row.id}`}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    setDeleteBulkConfirm(true);
  };

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
            <p className="text-2xl font-bold">{samplesTotal}</p>
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

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border-b rounded-md mb-3">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete-sample-collections"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
              </Button>
            </div>
          )}

          <DataTable
            columns={columns}
            data={samples}
            isLoading={isLoading}
            emptyMessage="No sample collections yet. They are created when a bill includes lab tests that require sample collection."
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => setViewSample(row)}
          />
          <TablePagination page={page} pageSize={pageSize} total={samplesTotal} onPageChange={setPage} onPageSizeChange={(v) => { setPageSize(v); setPage(1); }} />
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
                <Button variant="outline" onClick={() => { openEdit(viewSample); setViewSample(null); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
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

      {editSample && (
        <Dialog open={!!editSample} onOpenChange={(open) => { if (!open) setEditSample(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Sample Collection</DialogTitle>
              <DialogDescription>Update status, notes, or collected by for this sample.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="collected">Collected</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-collectedBy">Collected By</Label>
                <Input
                  id="edit-collectedBy"
                  value={editForm.collectedBy}
                  onChange={(e) => setEditForm((f) => ({ ...f, collectedBy: e.target.value }))}
                  placeholder="Name of collector"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="mt-1.5 min-h-[80px]"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    updateSampleMutation.mutate({
                      id: editSample.id,
                      data: {
                        status: editForm.status,
                        notes: editForm.notes || undefined,
                        collectedBy: editForm.collectedBy || undefined,
                      },
                    });
                  }}
                  disabled={updateSampleMutation.isPending}
                >
                  {updateSampleMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditSample(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((c) => ({ ...c, open }))}
        title="Delete sample collection"
        description={deleteConfirm.sample ? `Delete sample collection for "${deleteConfirm.sample.testName}"? This cannot be undone.` : "Delete this sample collection?"}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => { if (deleteConfirm.sample) deleteSampleMutation.mutate(deleteConfirm.sample.id); }}
      />

      <ConfirmDialog
        open={deleteBulkConfirm}
        onOpenChange={setDeleteBulkConfirm}
        title="Delete sample collections"
        description={`Delete ${selectedIds.size} selected sample collection(s)? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
      />

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
