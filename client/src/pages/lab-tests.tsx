import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { DateFilterBar, useDateFilter, isDateInRange } from "@/components/date-filter";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, QrCode, FlaskConical, TestTubes, DollarSign, CheckCircle, Upload, Download, FileText, Printer, User, Clock, XCircle, AlertTriangle, Loader2, ChevronDown, ClipboardList } from "lucide-react";
import { SearchInputWithBarcode } from "@/components/search-input-with-barcode";
import type { LabTest, Patient, ClinicSettings } from "@shared/schema";

const LAB_CATEGORIES = [
  "Hematology", "Biochemistry", "Microbiology", "Immunology",
  "Pathology", "Radiology", "Cardiology", "Endocrinology",
  "Urology", "Gastroenterology", "Neurology", "Other"
];

const SAMPLE_TYPES = [
  "Blood", "Urine", "Stool", "Sputum", "Swab",
  "Tissue", "CSF", "Saliva", "Serum", "Plasma", "Other"
];

const STATUS_OPTIONS = [
  { value: "processing", label: "Processing", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "complete", label: "Complete", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  { value: "awaiting_sample", label: "Awaiting Sample", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { value: "sample_missing", label: "Sample Missing", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { value: "cancel", label: "Cancel", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
];

const defaultForm = {
  testName: "", categories: [] as string[], sampleTypes: [] as string[], price: "",
  description: "", turnaroundTime: "", status: "processing",
  patientId: "", referrerName: "",
};

type LabTestWithPatient = LabTest & { patientName?: string | null };

function parseTurnaroundToMs(tat: string | null): number | null {
  if (!tat) return null;
  const lower = tat.toLowerCase().trim();
  let totalMs = 0;
  const dayMatch = lower.match(/(\d+)\s*d(?:ay)?s?/);
  const hourMatch = lower.match(/(\d+)\s*h(?:our|r)?s?/);
  const minMatch = lower.match(/(\d+)\s*m(?:in(?:ute)?)?s?/);
  if (dayMatch) totalMs += parseInt(dayMatch[1]) * 86400000;
  if (hourMatch) totalMs += parseInt(hourMatch[1]) * 3600000;
  if (minMatch) totalMs += parseInt(minMatch[1]) * 60000;
  if (totalMs === 0) {
    const num = parseFloat(lower);
    if (!isNaN(num)) {
      if (lower.includes("hour") || lower.includes("hr") || lower.includes("h")) totalMs = num * 3600000;
      else if (lower.includes("day") || lower.includes("d")) totalMs = num * 86400000;
      else totalMs = num * 3600000;
    }
  }
  return totalMs > 0 ? totalMs : null;
}

function getCountdownTime(createdAt: string | Date | null, turnaroundTime: string | null): { text: string; overdue: boolean } {
  if (!createdAt || !turnaroundTime) return { text: "-", overdue: false };
  const tatMs = parseTurnaroundToMs(turnaroundTime);
  if (!tatMs) return { text: "-", overdue: false };
  const start = new Date(createdAt).getTime();
  const deadline = start + tatMs;
  const remaining = deadline - Date.now();
  const abs = Math.abs(remaining);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  let display = "";
  if (days > 0) display = `${days}d ${hours}h`;
  else if (hours > 0) display = `${hours}h ${minutes}m`;
  else display = `${minutes}m`;
  if (remaining <= 0) return { text: display, overdue: true };
  return { text: display, overdue: false };
}

function LiveTimer({ createdAt, status, turnaroundTime }: { createdAt: string | Date | null; status: string; turnaroundTime: string | null }) {
  const { t } = useTranslation();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "processing") return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "complete") return <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t("labTests.completed")}</span>;
  if (status === "cancel") return <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t("labTests.cancelled")}</span>;
  if (status === "awaiting_sample") return <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t("labTests.awaitingSample")}</span>;
  if (status === "sample_missing") return <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{t("labTests.waiting")}</span>;

  const { text, overdue } = getCountdownTime(createdAt, turnaroundTime);
  if (text === "-") {
    return <span className="text-xs text-muted-foreground">{t("labTests.noTatSet")}</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <Clock className={`h-3 w-3 ${overdue ? "text-red-500" : "text-amber-500"} animate-pulse`} />
      <span className={`text-xs font-medium ${overdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
        {overdue ? `${t("labTests.overdue")} ${text}` : text}
      </span>
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder, testId, triggerRef }: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
  testId: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={triggerRef as React.LegacyRef<HTMLButtonElement>} variant="outline" className="w-full justify-between font-normal h-9 text-sm" data-testid={testId}>
          {selected.length > 0 ? (
            <span className="truncate">{selected.join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover-elevate text-sm">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                data-testid={`checkbox-${testId}-${opt.toLowerCase().replace(/\s/g, '-')}`}
              />
              {opt}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function LabTestsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTest, setEditTest] = useState<LabTestWithPatient | null>(null);
  const [viewTest, setViewTest] = useState<LabTestWithPatient | null>(null);
  const [barcodeTest, setBarcodeTest] = useState<LabTestWithPatient | null>(null);
  const [uploadTest, setUploadTest] = useState<LabTestWithPatient | null>(null);
  const [inputResultsTest, setInputResultsTest] = useState<LabTestWithPatient | null>(null);
  const [inputResultsValues, setInputResultsValues] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const refTestName = useRef<HTMLInputElement>(null);
  const refCategories = useRef<HTMLButtonElement>(null);
  const refSampleTypes = useRef<HTMLButtonElement>(null);
  const refPrice = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadReferrer, setUploadReferrer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false);
  const { datePeriod, setDatePeriod, customFromDate, setCustomFromDate, customToDate, setCustomToDate, monthYear, setMonthYear, dateRange } = useDateFilter();

  const { data: labTests = [], isLoading } = useQuery<LabTestWithPatient[]>({
    queryKey: ["/api/lab-tests"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: inputResultsService } = useQuery<{ reportParameters?: Array<{ parameter: string; unit: string; normalRange: string; resultType?: "manual" | "dropdown"; dropdownItems?: string[] }> }>({
    queryKey: inputResultsTest?.serviceId ? [`/api/services/${inputResultsTest.serviceId}`] : ["__skip"],
    enabled: !!inputResultsTest?.serviceId,
  });

  const { data: settings } = useQuery<ClinicSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: users = [] } = useQuery<{ id: number; fullName: string; roleName?: string }[]>({
    queryKey: ["/api/users"],
  });

  const [inputResultsLabTechnologistId, setInputResultsLabTechnologistId] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const codeRes = await fetch("/api/lab-tests/next-code", { credentials: "include" });
      if (!codeRes.ok) {
        const err = await codeRes.json().catch(() => ({}));
        throw new Error(err.message || `${codeRes.status}: ${codeRes.statusText}`);
      }
      const { code } = await codeRes.json();
      const res = await apiRequest("POST", "/api/lab-tests", { ...data, testCode: code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: t("labTests.createdSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/lab-tests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setEditTest(null);
      setForm(defaultForm);
      setFieldErrors({});
      toast({ title: t("labTests.updatedSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lab-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: t("labTests.deleted") });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("POST", "/api/lab-tests/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setSelectedIds(new Set());
      toast({ title: `${ids.length} lab test(s) deleted` });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async ({ id, reportResults, labTechnologistId }: { id: number; reportResults: Array<{ parameter: string; result: string; unit: string; normalRange: string }>; labTechnologistId?: number | null }) => {
      const res = await apiRequest("PATCH", `/api/lab-tests/${id}`, { reportResults, labTechnologistId: labTechnologistId ?? undefined, status: "complete" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: "Test results saved" });
      setInputResultsTest(null);
      setInputResultsValues({});
      setInputResultsLabTechnologistId(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Failed to save", variant: "destructive" });
    },
  });

  type PrintLayout = "compact" | "full";
  const escapeHtml = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const printLabReport = (row: LabTestWithPatient & { reportResults?: Array<{ parameter: string; result: string; unit: string; normalRange: string }>; labTechnologist?: { fullName: string; qualification?: string; roleName?: string; signatureUrl?: string } | null }, layout: PrintLayout = "compact") => {
    const printWindow = window.open("", "_blank", layout === "compact" ? "width=400,height=600" : "width=800,height=900");
    if (!printWindow) return;
    const clinicName = settings?.clinicName || "";
    const clinicNameDisplay = clinicName || "Clinic";
    const clinicEmail = settings?.email || "";
    const clinicPhone = settings?.phone || "";
    const clinicAddress = settings?.address || "";
    const categories = row.category.split(",").map((c: string) => c.trim()).filter(Boolean).join(", ");
    const sampleTypes = row.sampleType.split(",").map((s: string) => s.trim()).filter(Boolean).join(", ");
    const statusLabels: Record<string, string> = { processing: "Processing", complete: "Complete", awaiting_sample: "Awaiting Sample", sample_missing: "Sample Missing", cancel: "Cancelled" };
    const reportResults = row.reportResults || [];
    const formattedDate = row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

    const teal = "#0d9488";
    const accent = "#0f172a";
    const muted = "#475569";
    const border = "#e2e8f0";
    const statusColor = row.status === "complete" ? "#059669" : row.status === "processing" ? "#2563eb" : row.status === "cancel" ? "#dc2626" : "#d97706";

    const isCompact = layout === "compact";
    const bodyPad = isCompact ? "6px 8px" : "10px 14px";
    const maxW = isCompact ? "340px" : "720px";
    const fBase = isCompact ? 9 : 10;
    const fSm = isCompact ? 8 : 9;
    const fPatient = isCompact ? 10 : 11;
    const fResult = isCompact ? 10 : 11;
    const pad = isCompact ? "3px 4px" : "5px 6px";
    const padSm = isCompact ? "2px 4px" : "4px 6px";

    const testCodeBarcode = (row.testCode || "").replace(/[^A-Za-z0-9\-]/g, "") || row.testCode || "";
    const barcodeSize = isCompact ? 32 : 40;

    const logoHref = settings?.logo
      ? (settings.logo.startsWith("http") ? settings.logo : `${typeof window !== "undefined" ? window.location.origin : ""}${settings.logo.startsWith("/") ? settings.logo : "/" + settings.logo}`)
      : "";

    printWindow.document.write(`
      <html><head><title>Lab Test Report - ${row.testCode}</title>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: ${accent}; padding: 0; width: 100%; max-width: ${maxW}; margin: 0 auto; font-size: ${fBase}px; line-height: 1.35; text-align: justify; }
        .lab-barcode { font-family: 'Libre Barcode 128', monospace; letter-spacing: 1px; line-height: 1; color: ${accent}; }
        table { border-collapse: collapse; width: 100%; }
        @media print { @page { size: ${settings?.printPageSize || "A5"}; margin: 8mm; } html, body { min-height: 100%; margin: 0; padding: 0; } body { padding: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        .lab-print-page { min-height: 100vh; display: flex; flex-direction: column; width: 100%; }
        .lab-print-body { flex: 1; width: 100%; }
        .lab-print-footer { margin-top: auto; width: 100%; }
      </style></head><body>

        <div class="lab-print-page" style="padding:${bodyPad};">

          <div class="lab-print-body">
          <!-- HEADER (compact) -->
          <div style="text-align:center;margin-bottom:${isCompact ? "4px" : "6px"};padding-bottom:${isCompact ? "4px" : "5px"};border-bottom:1px solid ${border};width:100%;">
            ${logoHref ? `<img src="${logoHref}" alt="Logo" style="max-height:${isCompact ? "24px" : "32px"};margin:0 auto 2px;display:block;" />` : ""}
            <div style="font-size:${isCompact ? "10px" : "12px"};font-weight:800;color:${teal};text-transform:uppercase;letter-spacing:0.04em;">${clinicNameDisplay}</div>
            <div style="font-size:${isCompact ? "7px" : "8px"};color:${muted};">${[clinicAddress, clinicPhone, clinicEmail].filter(Boolean).slice(0, 2).join(" · ")}</div>
          </div>

          <!-- TITLE + META + BARCODE -->
          <div style="margin-bottom:${isCompact ? "4px" : "6px"};text-align:justify;width:100%;">
            <div style="font-size:${isCompact ? "9px" : "11px"};font-weight:700;color:${teal};text-transform:uppercase;margin-bottom:2px;">Lab Test Report</div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px;width:100%;">
              <div style="font-size:${fSm}px;line-height:1.3;">Test ID: <strong>${row.testCode}</strong> | Date: ${formattedDate}</div>
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="background:${statusColor}15;color:${statusColor};padding:1px 4px;border-radius:4px;font-weight:600;font-size:${fSm}px;">${statusLabels[row.status] || row.status}</span>
                ${testCodeBarcode ? `<div style="text-align:right;"><div class="lab-barcode" style="font-size:${isCompact ? 24 : 28}px;">${testCodeBarcode}</div></div>` : ""}
              </div>
            </div>
          </div>

          <!-- PATIENT + TEST INFO (two rows, larger font) -->
          <div style="margin-bottom:${isCompact ? "6px" : "8px"};font-size:${fPatient}px;line-height:1.45;text-align:justify;width:100%;">
            <div style="font-weight:700;color:${accent};margin-bottom:2px;"><strong>Patient:</strong> ${escapeHtml(row.patientName || "-")}${(row as { patientPatientId?: string }).patientPatientId ? ` (${escapeHtml((row as { patientPatientId: string }).patientPatientId)})` : ""}${(row as { patientAge?: number }).patientAge != null ? ` · Age: ${(row as { patientAge: number }).patientAge}` : ""}${(row as { patientGender?: string }).patientGender ? ` · ${escapeHtml((row as { patientGender: string }).patientGender)}` : ""}</div>
            <div style="color:${muted};"><strong>Test:</strong> ${row.testName} · ${categories || "-"} · ${sampleTypes || "-"}${row.referrerName ? ` · Ref: ${row.referrerName}` : ""} · <strong style="color:${accent};">$${row.price}</strong></div>
          </div>

          ${reportResults.length > 0 ? `
          <!-- RESULTS TABLE -->
          <table style="width:100%;margin-bottom:${isCompact ? "4px" : "8px"};">
            <thead>
              <tr style="background:${teal};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
                <th style="padding:${pad};text-align:justify;font-size:${isCompact ? "8px" : "10px"};text-transform:uppercase;letter-spacing:0.08em;color:#fff;font-weight:700;border-radius:6px 0 0 0;">Parameter</th>
                <th style="padding:${pad};text-align:justify;font-size:${isCompact ? "8px" : "10px"};text-transform:uppercase;letter-spacing:0.08em;color:#fff;font-weight:700;">Result</th>
                <th style="padding:${pad};text-align:justify;font-size:${isCompact ? "8px" : "10px"};text-transform:uppercase;letter-spacing:0.08em;color:#fff;font-weight:700;">Unit</th>
                <th style="padding:${pad};text-align:justify;font-size:${isCompact ? "8px" : "10px"};text-transform:uppercase;letter-spacing:0.08em;color:#fff;font-weight:700;border-radius:0 6px 0 0;">Normal Range</th>
              </tr>
            </thead>
            <tbody>
              ${reportResults.map((r: { parameter: string; result: string; unit: string; normalRange: string }) => `
                <tr style="border-bottom:1px solid ${border};">
                  <td style="padding:${padSm};font-size:${fSm}px;font-weight:600;color:${accent};text-align:justify;">${r.parameter}</td>
                  <td style="padding:${padSm};font-size:${fResult}px;font-weight:700;color:#059669;text-align:justify;">${r.result || "-"}</td>
                  <td style="padding:${padSm};font-size:${fSm}px;color:${muted};text-align:justify;">${r.unit || "-"}</td>
                  <td style="padding:${padSm};font-size:${fSm}px;color:${muted};text-align:justify;">${r.normalRange || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ` : ""}

          </div>

          <div class="lab-print-footer">
          <div style="width:100%;">
          ${row.labTechnologist && row.labTechnologist.fullName ? (() => {
            const tech = row.labTechnologist;
            const sigHref = tech.signatureUrl ? (tech.signatureUrl.startsWith("http") ? tech.signatureUrl : `${typeof window !== "undefined" ? window.location.origin : ""}${tech.signatureUrl.startsWith("/") ? tech.signatureUrl : "/" + tech.signatureUrl}`) : "";
            const name = escapeHtml(tech.fullName);
            const qual = tech.qualification ? escapeHtml(tech.qualification) : "";
            const role = tech.roleName ? escapeHtml(tech.roleName) : "";
            const clinic = escapeHtml(clinicNameDisplay);
            return `
          <!-- LAB TECHNOLOGIST -->
          <div style="margin-top:${isCompact ? "4px" : "6px"};padding-top:${isCompact ? "4px" : "6px"};border-top:1px solid ${border};">
            <div style="font-size:${fSm}px;font-weight:700;color:${teal};text-transform:uppercase;margin-bottom:2px;">Lab Technologist</div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:${isCompact ? "6px" : "10px"};">
              <div style="text-align:right;line-height:1.25;">
                <div style="font-weight:700;font-size:${isCompact ? "9px" : "10px"};color:${accent};">${name}</div>
                ${qual ? `<div style="font-size:${fSm}px;color:${muted};">${qual}</div>` : ""}
                ${role ? `<div style="font-size:${fSm}px;color:${teal};font-weight:600;">${role}</div>` : ""}
                <div style="font-size:${fSm}px;color:${muted};">${clinic}</div>
              </div>
              ${sigHref ? `<img src="${sigHref}" alt="Signature" style="max-height:${isCompact ? "24px" : "32px"};max-width:70px;object-contain;" onerror="this.style.display='none'" />` : ""}
            </div>
          </div>
            `;
          })() : ""}

          <!-- FOOTER -->
          <div style="text-align:center;margin-top:${isCompact ? "4px" : "6px"};padding-top:${isCompact ? "4px" : "5px"};border-top:1px solid ${border};width:100%;">
            <div style="font-size:${isCompact ? "7px" : "8px"};font-weight:700;color:${teal};text-transform:uppercase;">Thank you for choosing ${clinicNameDisplay}!</div>
            ${clinicEmail ? `<div style="font-size:${fSm}px;color:${muted};margin-top:1px;">Contact: ${clinicEmail}</div>` : ""}
          </div>
          </div>

          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteBulkConfirm(true);
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.testName?.trim()) errors.testName = t("common.required");
    if (form.categories.length === 0) errors.categories = t("common.required");
    if (form.sampleTypes.length === 0) errors.sampleTypes = t("common.required");
    if (!form.price || Number(form.price) <= 0) errors.price = t("common.required");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: t("common.fillRequired"), variant: "destructive" });
      const order = ["testName", "categories", "sampleTypes", "price"] as const;
      const firstKey = order.find(k => errors[k]);
      const refMap = { testName: refTestName, categories: refCategories, sampleTypes: refSampleTypes, price: refPrice } as const;
      if (firstKey) (refMap[firstKey].current as HTMLElement | null)?.focus();
      return;
    }
    const payload: any = {
      testName: form.testName,
      category: form.categories.join(", "),
      sampleType: form.sampleTypes.join(", "),
      price: form.price,
      description: form.description || null,
      turnaroundTime: form.turnaroundTime || null,
      status: form.status,
      patientId: form.patientId ? Number(form.patientId) : null,
      referrerName: form.referrerName || null,
    };
    if (editTest) {
      updateMutation.mutate({ id: editTest.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (test: LabTestWithPatient) => {
    setFieldErrors({});
    setForm({
      testName: test.testName,
      categories: test.category.split(",").map(s => s.trim()).filter(Boolean),
      sampleTypes: test.sampleType.split(",").map(s => s.trim()).filter(Boolean),
      price: test.price,
      description: test.description || "",
      turnaroundTime: test.turnaroundTime || "",
      status: test.status,
      patientId: test.patientId ? String(test.patientId) : "",
      referrerName: test.referrerName || "",
    });
    setEditTest(test);
  };

  const handleFileUpload = async () => {
    if (!uploadTest || !fileInputRef.current?.files?.[0]) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('report', fileInputRef.current.files[0]);
      if (uploadReferrer) formData.append('referrerName', uploadReferrer);
      const res = await fetch(`/api/lab-tests/${uploadTest.id}/upload-report`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: t("labTests.reportUploaded") });
      setUploadTest(null);
      setUploadReferrer("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast({ title: t("labTests.uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleBarcodeSearch = async (value: string) => {
    const v = value?.trim() ?? "";
    if (!v) return;
    // Sample collection barcode: SC5 or plain 5 (from small sticker)
    let sampleId: number | null = null;
    const scMatch = v.match(/^SC(\d+)$/i);
    if (scMatch) {
      sampleId = parseInt(scMatch[1], 10);
    } else if (/^\d+$/.test(v)) {
      sampleId = parseInt(v, 10);
    }
    if (sampleId != null) {
      try {
        const scRes = await apiRequest("GET", `/api/sample-collections/${sampleId}`);
        const sc = await scRes.json();
        const labTestId = sc?.labTestId;
        if (!labTestId) {
          toast({ title: t("labTests.test") + " not linked", variant: "destructive" });
          return;
        }
        const res = await apiRequest("GET", `/api/lab-tests/${labTestId}`);
        const test = await res.json();
        setSearchTerm("");
        setViewTest(test);
        return;
      } catch {
        toast({ title: t("labTests.test") + " not found", variant: "destructive" });
        return;
      }
    }
    // LAB-TEST|testCode|testName|category|price
    const labMatch = v.match(/^LAB-TEST\|([^|]+)\|/);
    const testCode = labMatch ? labMatch[1] : (v.includes("|") ? "" : v);
    if (testCode) {
      const found = labTests.find(t => (t.testCode || "").toLowerCase() === testCode.toLowerCase());
      if (found) {
        setSearchTerm("");
        setViewTest(found);
        return;
      }
      toast({ title: t("labTests.test") + " not found: " + testCode, variant: "destructive" });
      return;
    }
    setSearchTerm(v);
  };

  const filtered = labTests.filter(t => {
    const matchSearch = searchTerm === "" ||
      t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sampleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.testCode && t.testCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.patientName && t.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.referrerName && t.referrerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = categoryFilter === "all" || t.category.includes(categoryFilter);
    const matchDate = isDateInRange(t.createdAt?.toString().slice(0, 10), dateRange);
    return matchSearch && matchCategory && matchDate;
  });

  const processingCount = filtered.filter(t => t.status === "processing").length;
  const completeCount = filtered.filter(t => t.status === "complete").length;
  const uniqueCategories = Array.from(new Set(filtered.flatMap(t => t.category.split(",").map(s => s.trim()))));
  const withReports = filtered.filter(t => t.reportFileUrl).length;

  const statusBadgeConfig: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    processing: { dot: "bg-amber-500", bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
    complete: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-400/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20" },
    awaiting_sample: { dot: "bg-amber-500", bg: "bg-amber-500/10 dark:bg-amber-400/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
    sample_missing: { dot: "bg-red-500", bg: "bg-red-500/10 dark:bg-red-400/10", text: "text-red-700 dark:text-red-300", border: "border-red-500/20" },
    cancel: { dot: "bg-slate-500", bg: "bg-slate-500/10 dark:bg-slate-400/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20" },
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return <Badge variant="secondary">{status}</Badge>;
    const style = statusBadgeConfig[status] || statusBadgeConfig.processing;
    return (
      <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${style.bg} ${style.text} ${style.border}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${style.dot}`} />
        {opt.label}
      </Badge>
    );
  };

  const columns = [
    { header: t("labTests.testId"), accessor: (row: LabTestWithPatient) => (
      <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-test-code-${row.id}`}>{row.testCode}</span>
    )},
    { header: t("labTests.testName"), accessor: (row: LabTestWithPatient) => (
      <span className="font-medium" data-testid={`text-test-name-${row.id}`}>{row.testName}</span>
    )},
    { header: t("billing.patient"), accessor: (row: LabTestWithPatient) => (
      <span className="text-sm" data-testid={`text-patient-${row.id}`}>
        {row.patientName || <span className="text-muted-foreground">-</span>}
      </span>
    )},
    { header: t("common.category"), accessor: (row: LabTestWithPatient) => (
      <div className="flex flex-wrap gap-1" data-testid={`badge-category-${row.id}`}>
        {row.category.split(",").map(c => c.trim()).filter(Boolean).map(c => (
          <Badge key={c} variant="outline" className="text-xs text-violet-600 dark:text-violet-400">{c}</Badge>
        ))}
      </div>
    )},
    { header: t("labTests.sampleType"), accessor: (row: LabTestWithPatient) => (
      <div className="flex flex-wrap gap-1" data-testid={`badge-sample-${row.id}`}>
        {row.sampleType.split(",").map(s => s.trim()).filter(Boolean).map(s => (
          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
        ))}
      </div>
    )},
    { header: t("common.price"), accessor: (row: LabTestWithPatient) => (
      <span className="font-medium" data-testid={`text-price-${row.id}`}>${row.price}</span>
    )},
    { header: t("labTests.processing"), accessor: (row: LabTestWithPatient) => (
      <LiveTimer createdAt={row.createdAt} status={row.status} turnaroundTime={row.turnaroundTime} />
    )},
    { header: t("common.status"), accessor: (row: LabTestWithPatient) => (
      <Select
        value={row.status}
        onValueChange={(val) => {
          updateMutation.mutate({ id: row.id, data: { status: val } });
        }}
      >
        <SelectTrigger className="h-8 w-[140px] text-xs" data-testid={`select-status-${row.id}`}>
          <SelectValue>{getStatusBadge(row.status)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="processing">
            <div className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 text-blue-500" /> {t("labTests.processing")}</div>
          </SelectItem>
          <SelectItem value="complete">
            <div className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> {t("labTests.completed")}</div>
          </SelectItem>
          <SelectItem value="awaiting_sample">
            <div className="flex items-center gap-1.5"><TestTubes className="h-3 w-3 text-amber-500" /> {t("labTests.awaitingSample")}</div>
          </SelectItem>
          <SelectItem value="sample_missing">
            <div className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500" /> {t("labTests.sampleMissing")}</div>
          </SelectItem>
          <SelectItem value="cancel">
            <div className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-red-500" /> {t("billing.cancelled")}</div>
          </SelectItem>
        </SelectContent>
      </Select>
    )},
    { header: t("labTests.referName"), accessor: (row: LabTestWithPatient) => (
      <span className="text-sm" data-testid={`text-referrer-${row.id}`}>
        {row.referrerName || <span className="text-muted-foreground">-</span>}
      </span>
    )},
    { header: t("common.actions"), accessor: (row: LabTestWithPatient) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewTest(row); }} className="gap-2" data-testid={`action-view-${row.id}`}>
            <Eye className="h-4 w-4 text-blue-500" /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2" data-testid={`action-edit-${row.id}`}>
            <Pencil className="h-4 w-4 text-amber-500" /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (row.status === "awaiting_sample") return;
              setUploadTest(row);
              setUploadReferrer(row.referrerName || "");
            }}
            disabled={row.status === "awaiting_sample"}
            className={`gap-2 ${row.status === "awaiting_sample" ? "opacity-60 cursor-not-allowed" : ""}`}
            data-testid={`action-upload-${row.id}`}
            title={row.status === "awaiting_sample" ? t("labTests.awaitingSampleTooltip") : undefined}
          >
            <Upload className="h-4 w-4 text-green-500" /> {row.status === "awaiting_sample" ? t("labTests.awaitingSample") : t("labTests.uploadReport")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (row.status === "awaiting_sample") return;
              setInputResultsTest(row);
              setInputResultsLabTechnologistId((row as { labTechnologistId?: number }).labTechnologistId ?? null);
              const existing = (row as LabTestWithPatient & { reportResults?: Array<{ parameter: string; result: string }> }).reportResults;
              const init: Record<string, string> = {};
              if (Array.isArray(existing)) {
                for (const r of existing) init[r.parameter] = r.result;
              }
              setInputResultsValues(init);
            }}
            disabled={row.status === "awaiting_sample"}
            className={`gap-2 ${row.status === "awaiting_sample" ? "opacity-60 cursor-not-allowed" : ""}`}
            data-testid={`action-input-results-${row.id}`}
            title={row.status === "awaiting_sample" ? t("labTests.awaitingSampleTooltip") : undefined}
          >
            <ClipboardList className="h-4 w-4 text-teal-500" /> Input Test Results
          </DropdownMenuItem>
          {row.reportFileUrl && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(row.reportFileUrl!, '_blank'); }} className="gap-2" data-testid={`action-download-${row.id}`}>
              <Download className="h-4 w-4 text-emerald-500" /> {t("labTests.downloadReport")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBarcodeTest(row); }} className="gap-2" data-testid={`action-barcode-${row.id}`}>
            <QrCode className="h-4 w-4 text-purple-500" /> {t("labTests.barcode")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); printLabReport(row, "compact"); }} className="gap-2" data-testid={`action-print-compact-${row.id}`}>
            <Printer className="h-4 w-4 text-violet-500" /> Print (Compact)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); printLabReport(row, "full"); }} className="gap-2" data-testid={`action-print-full-${row.id}`}>
            <Printer className="h-4 w-4 text-violet-500" /> Print (Full size)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, id: row.id }); }}
            className="text-red-600 gap-2"
            data-testid={`action-delete-${row.id}`}
          >
            <Trash2 className="h-4 w-4" /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <Label htmlFor="test-name">{t("labTests.testName")} *</Label>
          <Input ref={refTestName} id="test-name" value={form.testName} onChange={e => { setForm(f => ({ ...f, testName: e.target.value })); setFieldErrors(prev => ({ ...prev, testName: "" })); }} data-testid="input-test-name" className={fieldErrors.testName ? "border-destructive" : ""} />
          {fieldErrors.testName && <p className="text-xs text-destructive mt-1">{fieldErrors.testName}</p>}
        </div>
        <div>
          <Label>{t("billing.patient")}</Label>
          <SearchableSelect
            value={form.patientId || "none"}
            onValueChange={v => setForm(f => ({ ...f, patientId: v === "none" ? "" : v }))}
            placeholder={t("billing.selectPatient")}
            searchPlaceholder="Search patient name or ID..."
            emptyText="No patient found."
            data-testid="select-patient"
            options={[
              { value: "none", label: t("common.noPatient") || "No patient" },
              ...patients.map(p => ({
                value: String(p.id),
                label: `${p.name} (${p.patientId})`,
                searchText: `${p.name} ${p.patientId}`,
              })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.category")} *</Label>
            <MultiSelect
              options={LAB_CATEGORIES}
              selected={form.categories}
              onChange={v => { setForm(f => ({ ...f, categories: v })); setFieldErrors(prev => ({ ...prev, categories: "" })); }}
              placeholder={t("labTests.selectCategories")}
              testId="select-test-category"
              triggerRef={refCategories}
            />
            {fieldErrors.categories && <p className="text-xs text-destructive mt-1">{fieldErrors.categories}</p>}
          </div>
          <div>
            <Label>{t("labTests.sampleType")} *</Label>
            <MultiSelect
              options={SAMPLE_TYPES}
              selected={form.sampleTypes}
              onChange={v => { setForm(f => ({ ...f, sampleTypes: v })); setFieldErrors(prev => ({ ...prev, sampleTypes: "" })); }}
              placeholder={t("labTests.selectSampleTypes")}
              testId="select-sample-type"
              triggerRef={refSampleTypes}
            />
            {fieldErrors.sampleTypes && <p className="text-xs text-destructive mt-1">{fieldErrors.sampleTypes}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="test-price">{t("common.price")} ($) *</Label>
            <Input ref={refPrice} id="test-price" type="number" step="0.01" value={form.price} onChange={e => { setForm(f => ({ ...f, price: e.target.value })); setFieldErrors(prev => ({ ...prev, price: "" })); }} data-testid="input-test-price" className={fieldErrors.price ? "border-destructive" : ""} />
            {fieldErrors.price && <p className="text-xs text-destructive mt-1">{fieldErrors.price}</p>}
          </div>
          <div>
            <Label htmlFor="test-tat">{t("labTests.turnaroundTime")}</Label>
            <Input id="test-tat" placeholder={t("labTests.tatPlaceholder")} value={form.turnaroundTime} onChange={e => setForm(f => ({ ...f, turnaroundTime: e.target.value }))} data-testid="input-test-tat" />
          </div>
        </div>
        <div>
          <Label htmlFor="test-referrer">{t("labTests.referName")}</Label>
          <Input id="test-referrer" placeholder={t("labTests.referrerPlaceholder")} value={form.referrerName} onChange={e => setForm(f => ({ ...f, referrerName: e.target.value }))} data-testid="input-referrer-name" />
        </div>
        <div>
          <Label htmlFor="test-desc">{t("common.description")}</Label>
          <Textarea id="test-desc" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-test-description" />
        </div>
        <div>
          <Label>{t("common.status")}</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger data-testid="select-test-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("labTests.title")}
        description={t("labTests.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(defaultForm); setFieldErrors({}); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lab-test">
                <Plus className="h-4 w-4 mr-1" /> {t("labTests.addTest")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("labTests.addTest")}</DialogTitle>
                <DialogDescription className="sr-only">Enter details for a new lab test</DialogDescription>
              </DialogHeader>
              {formContent}
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-lab-test">
                {createMutation.isPending ? t("common.creating") : t("labTests.addTest")}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {viewTest && (
        <Dialog open={!!viewTest} onOpenChange={(open) => { if (!open) setViewTest(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                {t("labTests.title")}
              </DialogTitle>
              <DialogDescription className="sr-only">View lab test details and results</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.testId")}</p>
                  <p className="font-mono font-semibold" data-testid="text-view-test-code">{viewTest.testCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.testName")}</p>
                  <p className="font-semibold" data-testid="text-view-test-name">{viewTest.testName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("billing.patient")}</p>
                  <p className="text-sm">{viewTest.patientName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.category")}</p>
                  <div className="flex flex-wrap gap-1">
                    {viewTest.category.split(",").map(c => c.trim()).filter(Boolean).map(c => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.sampleType")}</p>
                  <div className="flex flex-wrap gap-1">
                    {viewTest.sampleType.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.price")}</p>
                  <p className="font-bold text-green-600 dark:text-green-400">${viewTest.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.processing")}</p>
                  <LiveTimer createdAt={viewTest.createdAt} status={viewTest.status} turnaroundTime={viewTest.turnaroundTime} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("common.status")}</p>
                  {getStatusBadge(viewTest.status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.turnaroundTime")}</p>
                  <p className="text-sm">{viewTest.turnaroundTime || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.referName")}</p>
                  <p className="text-sm">{viewTest.referrerName || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("labTests.report")}</p>
                  {viewTest.reportFileUrl ? (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-green-500" />
                      <a href={viewTest.reportFileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 underline" data-testid="link-view-report">
                        {viewTest.reportFileName || t("common.download")}
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("labTests.noReport")}</span>
                  )}
                </div>
                {(viewTest as LabTestWithPatient & { reportResults?: Array<{ parameter: string; result: string; unit: string; normalRange: string }> }).reportResults?.length ? (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Test Results</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="p-2 text-left font-medium">Parameter</th>
                            <th className="p-2 text-left font-medium">Result</th>
                            <th className="p-2 text-left font-medium">Unit</th>
                            <th className="p-2 text-left font-medium">Normal Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(viewTest as LabTestWithPatient & { reportResults: Array<{ parameter: string; result: string; unit: string; normalRange: string }> }).reportResults.map((r, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{r.parameter}</td>
                              <td className="p-2 font-medium text-emerald-600 dark:text-emerald-400">{r.result}</td>
                              <td className="p-2 text-muted-foreground">{r.unit || "—"}</td>
                              <td className="p-2 text-muted-foreground">{r.normalRange || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">{t("common.description")}</p>
                  <p className="text-sm">{viewTest.description || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => printLabReport(viewTest, "compact")} data-testid="button-view-print-compact">
                  <Printer className="h-4 w-4 mr-1.5" /> Print (Compact)
                </Button>
                <Button onClick={() => printLabReport(viewTest, "full")} data-testid="button-view-print-full">
                  <Printer className="h-4 w-4 mr-1.5" /> Print (Full size)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editTest && (
        <Dialog open={!!editTest} onOpenChange={(open) => { if (!open) { setEditTest(null); setForm(defaultForm); } }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("common.edit")} ({editTest.testCode})</DialogTitle>
              <DialogDescription className="sr-only">Modify lab test information</DialogDescription>
            </DialogHeader>
            {formContent}
            <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-lab-test">
              {updateMutation.isPending ? t("common.updating") : t("common.update")}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {uploadTest && (
        <Dialog open={!!uploadTest} onOpenChange={(open) => { if (!open) { setUploadTest(null); setUploadReferrer(""); } }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                {t("labTests.uploadReport")}
              </DialogTitle>
              <DialogDescription className="sr-only">Upload a lab test report file</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("labTests.test")}: {uploadTest.testCode} - {uploadTest.testName}</p>
                {uploadTest.reportFileName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <FileText className="h-3 w-3" />
                    {t("labTests.current")}: {uploadTest.reportFileName}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="report-file">{t("labTests.reportFile")} *</Label>
                <Input
                  id="report-file"
                  type="file"
                  accept=".pdf,.xls,.xlsx,.csv"
                  ref={fileInputRef}
                  data-testid="input-report-file"
                />
              </div>
              <div>
                <Label htmlFor="upload-referrer">{t("labTests.referName")}</Label>
                <Input
                  id="upload-referrer"
                  placeholder={t("labTests.uploadReferrerPlaceholder")}
                  value={uploadReferrer}
                  onChange={e => setUploadReferrer(e.target.value)}
                  data-testid="input-upload-referrer"
                />
              </div>
              <Button className="w-full" onClick={handleFileUpload} disabled={uploading} data-testid="button-upload-report">
                {uploading ? t("common.loading") : t("labTests.uploadReport")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {inputResultsTest && (
        <Dialog open={!!inputResultsTest} onOpenChange={(open) => { if (!open) { setInputResultsTest(null); setInputResultsValues({}); setInputResultsLabTechnologistId(null); } }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-teal-500" />
                Input Test Results
              </DialogTitle>
              <DialogDescription>Enter results for {inputResultsTest.testCode} — {inputResultsTest.testName}</DialogDescription>
            </DialogHeader>
            {!inputResultsTest.serviceId ? (
              <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                This lab test is not linked to a service. Configure report parameters in the linked service (Services → Edit Lab Test service) to use this feature.
              </div>
            ) : !inputResultsService ? (
              <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading parameters...</div>
            ) : !inputResultsService.reportParameters?.length ? (
              <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                No report parameters configured for this service. Edit the service (Services page) and add parameters under &quot;Report Parameters&quot; for Lab Test services.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Lab Technologist</Label>
                  <SearchableSelect
                    value={inputResultsLabTechnologistId ? String(inputResultsLabTechnologistId) : "none"}
                    onValueChange={v => setInputResultsLabTechnologistId(v === "none" ? null : Number(v))}
                    placeholder="Select lab technologist..."
                    searchPlaceholder="Search by name..."
                    emptyText="No users found."
                    options={[
                      { value: "none", label: "— Not selected —", searchText: "" },
                      ...users.filter((u: any) => u.isActive !== false).map((u: any) => ({
                        value: String(u.id),
                        label: `${u.fullName}${u.roleName ? ` (${u.roleName})` : ""}`,
                        searchText: `${u.fullName} ${u.roleName || ""}`,
                      })),
                    ]}
                  />
                </div>
                <div className="rounded-xl border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-4 py-3 text-left font-medium">Parameter</th>
                          <th className="px-4 py-3 text-left font-medium w-56">Result</th>
                          <th className="px-4 py-3 text-left font-medium w-24">Unit</th>
                          <th className="px-4 py-3 text-left font-medium">Normal Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inputResultsService.reportParameters!.map((p, i) => {
                          const existing = (inputResultsTest as LabTestWithPatient & { reportResults?: Array<{ parameter: string; result: string; unit: string; normalRange: string }> }).reportResults?.find(r => r.parameter === p.parameter);
                          const value = inputResultsValues[p.parameter] ?? existing?.result ?? "";
                          const isDropdown = p.resultType === "dropdown" || (p as { unitType?: string }).unitType === "select";
                          const items = [...new Set([...(p.dropdownItems || []).filter(Boolean), ...(value && !(p.dropdownItems || []).includes(value) ? [value] : [])])];
                          return (
                            <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-medium">{p.parameter}</td>
                              <td className="px-4 py-3">
                                {isDropdown && items.length > 0 ? (
                                  <Select value={value || "__empty__"} onValueChange={v => setInputResultsValues(prev => ({ ...prev, [p.parameter]: v === "__empty__" ? "" : v }))}>
                                    <SelectTrigger className="h-9 w-full min-w-[140px]"><SelectValue placeholder="Select result" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__empty__">— Select —</SelectItem>
                                      {items.map((opt, j) => (
                                        <SelectItem key={j} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input value={value} onChange={e => setInputResultsValues(prev => ({ ...prev, [p.parameter]: e.target.value }))} placeholder="Enter result" className="h-9 min-w-[140px]" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{p.unit || "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.normalRange || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button
                  className="w-full h-10"
                  disabled={saveResultsMutation.isPending}
                  onClick={() => {
                    const params = inputResultsService.reportParameters!;
                    const reportResults = params.map(p => ({
                      parameter: p.parameter,
                      result: inputResultsValues[p.parameter] ?? "",
                      unit: p.unit || "",
                      normalRange: p.normalRange || "",
                    }));
                    saveResultsMutation.mutate({ id: inputResultsTest.id, reportResults, labTechnologistId: inputResultsLabTechnologistId });
                  }}
                >
                  {saveResultsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Results"
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {barcodeTest && (
        <Dialog open={!!barcodeTest} onOpenChange={(open) => { if (!open) setBarcodeTest(null); }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-500" />
                {t("labTests.barcode")}
              </DialogTitle>
              <DialogDescription className="sr-only">View barcode for this lab test</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-4 bg-white rounded-md border">
                <svg viewBox="0 0 200 200" width="180" height="180" data-testid="img-barcode-qr">
                  {(() => {
                    const data = `LAB-TEST|${barcodeTest.testCode}|${barcodeTest.testName}|${barcodeTest.category}|$${barcodeTest.price}`;
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
                <p className="font-mono text-sm font-bold">{barcodeTest.testCode}</p>
                <p className="font-semibold text-sm">{barcodeTest.testName}</p>
                <p className="text-xs text-muted-foreground">{barcodeTest.category} | {barcodeTest.sampleType}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <DateFilterBar datePeriod={datePeriod} setDatePeriod={setDatePeriod} customFromDate={customFromDate} setCustomFromDate={setCustomFromDate} customToDate={customToDate} setCustomToDate={setCustomToDate} monthYear={monthYear} setMonthYear={setMonthYear} dateRange={dateRange} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { key: "total", label: t("labTests.totalTests"), gradient: "from-blue-500 to-blue-600", value: filtered.length, icon: FlaskConical, testId: "text-total-tests" },
            { key: "processing", label: t("labTests.processing"), gradient: "from-amber-500 to-amber-600", value: processingCount, icon: Loader2, testId: "text-processing-tests" },
            { key: "complete", label: t("labTests.completed"), gradient: "from-emerald-500 to-emerald-600", value: completeCount, icon: CheckCircle, testId: "text-complete-tests" },
            { key: "reports", label: t("labTests.downloadReport"), gradient: "from-violet-500 to-violet-600", value: withReports, icon: FileText, testId: "text-with-reports" },
            { key: "categories", label: t("common.category"), gradient: "from-cyan-500 to-cyan-600", value: uniqueCategories.length, icon: TestTubes, testId: "text-categories-count" },
          ].map((s) => (
            <Card key={s.key} data-testid={`stat-${s.key}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${s.gradient} shrink-0`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold" data-testid={s.testId}>{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">{t("labTests.allLabTests")}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-filter-category">
                  <SelectValue placeholder={t("common.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-64">
                <SearchInputWithBarcode
                  placeholder={t("labTests.searchTests") + " / " + (t("labTests.barcode") || "Scan barcode")}
                  className="h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={handleBarcodeSearch}
                  data-testid="input-search-lab-tests"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary/5 border-b">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} data-testid="button-bulk-delete-lab-tests">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                </Button>
              </div>
            )}
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage={t("labTests.noLabTests")} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((c) => ({ ...c, open }))}
        title={t("common.delete") || "Delete lab test"}
        description="Delete this lab test? This cannot be undone."
        confirmLabel={t("common.delete") || "Delete"}
        cancelLabel={t("common.cancel") || "Cancel"}
        variant="destructive"
        onConfirm={() => { if (deleteConfirm.id != null) deleteMutation.mutate(deleteConfirm.id); }}
      />
      <ConfirmDialog
        open={deleteBulkConfirm}
        onOpenChange={setDeleteBulkConfirm}
        title={t("common.delete") || "Delete lab tests"}
        description={`Delete ${selectedIds.size} selected lab test(s)? This cannot be undone.`}
        confirmLabel={t("common.delete") || "Delete"}
        cancelLabel={t("common.cancel") || "Cancel"}
        variant="destructive"
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
      />
    </div>
  );
}
