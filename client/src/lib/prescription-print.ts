/**
 * Print prescription: clinic header, patient, doctor, date, prescription lines, barcode (visitId), footer.
 * Visit.prescription can be JSON string { lines: [...], notes? } or plain text (shown as notes).
 */

export type PrescriptionLine = {
  medicineId?: number;
  serviceId?: number;
  injectionId?: number;
  packageId?: number;
  /** Item type when added from search: service | medicine | injection | package */
  type?: string;
  name: string;
  dosage?: string;
  duration?: string;
  frequency?: string;
  instructions?: string;
  barcode?: string;
};

export type PrescriptionData = {
  lines?: PrescriptionLine[];
  notes?: string;
};

function parsePrescription(prescription: string | null | undefined): PrescriptionData {
  if (!prescription || !prescription.trim()) return { lines: [], notes: "" };
  const trimmed = prescription.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { lines?: Array<Record<string, unknown>>; notes?: string };
      const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
      const lines: PrescriptionLine[] = rawLines.map((line) => {
        const name = [line.name, line.medicineName, line.itemName].find((v) => typeof v === "string" && String(v).trim()) as string | undefined;
        return {
          medicineId: line.medicineId != null ? Number(line.medicineId) : undefined,
          serviceId: line.serviceId != null ? Number(line.serviceId) : undefined,
          injectionId: line.injectionId != null ? Number(line.injectionId) : undefined,
          packageId: line.packageId != null ? Number(line.packageId) : undefined,
          type: typeof line.type === "string" ? line.type : undefined,
          name: (name && name.trim()) || "",
          dosage: typeof line.dosage === "string" ? line.dosage : "",
          duration: typeof line.duration === "string" ? line.duration : "",
          frequency: typeof line.frequency === "string" ? line.frequency : "",
          instructions: typeof line.instructions === "string" ? line.instructions : "",
        };
      });
      return {
        lines,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      };
    } catch {
      return { lines: [], notes: trimmed };
    }
  }
  return { lines: [], notes: trimmed };
}

export type PrescriptionPrintDoctor = {
  fullName: string;
  qualification?: string | null;
  signatureUrl?: string | null;
};

export function printPrescription(
  visit: { visitId: string; doctorName?: string | null; visitDate?: string | Date | null; prescription?: string | null; diagnosis?: string | null; symptoms?: string | null },
  patient: { name?: string; patientId?: string; age?: number | null; gender?: string | null; dateOfBirth?: string | null } | null,
  settings: { clinicName?: string | null; address?: string | null; phone?: string | null; email?: string | null; logo?: string | null; printPageSize?: string | null } | null,
  options?: { doctor?: PrescriptionPrintDoctor | null; printedBy?: string; printedAt?: string }
) {
  const pageSize = "A4";
  const clinicName = settings?.clinicName ?? "Clinic";
  const clinicAddress = settings?.address ?? "";
  const clinicPhone = settings?.phone ?? "";
  const clinicEmail = settings?.email ?? "";
  const logoHref = settings?.logo
    ? (settings.logo.startsWith("http") ? settings.logo : `${typeof window !== "undefined" ? window.location.origin : ""}${settings.logo.startsWith("/") ? settings.logo : "/" + settings.logo}`)
    : "";
  const visitDate = visit.visitDate ? new Date(visit.visitDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const ageFromDob = (dob: string | null | undefined): number | null => {
    if (!dob || dob.length < 10) return null;
    const birth = new Date(dob + "T12:00:00");
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };
  const patientAge = patient?.age ?? (patient?.dateOfBirth ? ageFromDob(patient.dateOfBirth) : null);
  const patientGender = patient?.gender || "-";
  const { lines: prescriptionLines, notes } = parsePrescription(visit.prescription);
  const lines = prescriptionLines ?? [];
  const barcodeVal = (visit.visitId || "").replace(/\s/g, "").replace(/[^A-Za-z0-9\-]/g, "") || "RX";
  const teal = "#0d9488";
  const border = "#e2e8f0";
  const muted = "#475569";
  const accent = "#0f172a";
  const doctor = options?.doctor ?? (visit.doctorName ? { fullName: visit.doctorName, qualification: null, signatureUrl: null } : null);
  const printedBy = options?.printedBy ?? "—";
  const printedAtStr = options?.printedAt ?? new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fSm = 10;

  const printWindow = window.open("", "_blank", "width=794,height=1123");
  if (!printWindow) return;

  const linesRows = lines.length > 0
    ? lines.map((line, idx) => `
        <tr style="border-bottom:1px solid ${border};">
          <td style="padding:6px 8px;text-align:center;font-size:10px;font-weight:600;color:${accent};width:28px;">${idx + 1}</td>
          <td style="padding:6px 8px;font-size:11px;color:${accent};font-weight:600;">${escapeHtml(line.name)}</td>
          <td style="padding:6px 8px;font-size:10px;color:${muted};">${escapeHtml(line.dosage || "-")}</td>
          <td style="padding:6px 8px;font-size:10px;color:${muted};">${escapeHtml(line.duration || "-")}</td>
          <td style="padding:6px 8px;font-size:10px;color:${muted};">${escapeHtml(line.frequency || "-")}</td>
          <td style="padding:6px 8px;font-size:10px;color:${muted};">${escapeHtml(line.instructions || "-")}</td>
        </tr>`).join("")
    : "";

  function escapeHtml(s: string): string {
    if (typeof s !== "string") return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Prescription ${visit.visitId}</title>
    <meta charset="UTF-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: ${accent}; font-size: 11px; line-height: 1.5; width: 100%; min-height: 100vh; display: flex; flex-direction: column; }
      .rx-print-page { flex: 1; display: flex; flex-direction: column; width: 100%; min-height: 100%; }
      .rx-print-body { flex: 1; width: 100%; }
      .rx-print-footer { margin-top: auto; width: 100%; }
      @media print { @page { size: ${pageSize}; margin: 10mm; } html, body { min-height: 100vh; margin: 0; padding: 0; width: 100% !important; } .rx-print-page { min-height: 100vh; } }
      table { border-collapse: collapse; width: 100%; }
    </style></head><body>
    <div class="rx-print-page" style="width:100%;padding:0 12px;">
      <!-- Full A4 top header -->
      <div style="width:100%;text-align:center;padding:12px 0 14px;margin-bottom:10px;">
        ${logoHref ? `<img src="${logoHref}" alt="Logo" style="max-height:44px;margin-bottom:6px;display:block;margin-left:auto;margin-right:auto;" />` : ""}
        <div style="font-size:20px;font-weight:800;color:${teal};text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(clinicName)}</div>
        <div style="font-size:10px;color:${muted};margin-top:6px;line-height:1.5;">${escapeHtml(clinicAddress)}</div>
        <div style="font-size:10px;color:${muted};margin-top:2px;">${clinicPhone ? "UHD: " + escapeHtml(clinicPhone) : ""}${clinicPhone && clinicEmail ? " | " : ""}${clinicEmail ? "CLINIC: " + escapeHtml(clinicEmail) : ""}</div>
      </div>
      <div class="rx-print-body">
      <div style="font-size:14px;font-weight:700;color:${teal};margin-bottom:10px;text-transform:uppercase;border-bottom:1px solid ${border};padding-bottom:4px;">Prescription</div>
      <!-- Two-column like lab report: Patient info (left) | Visit ID + barcode (right), separated -->
      <table style="width:100%;margin-bottom:10px;font-size:10px;border-collapse:collapse;">
        <tr>
          <td style="width:50%;vertical-align:top;padding:4px 10px 4px 0;">
            <div style="margin-bottom:3px;"><strong>Patient Name:</strong> ${escapeHtml(patient?.name || "-")}</div>
            <div style="margin-bottom:3px;"><strong>UHID:</strong> ${escapeHtml(patient?.patientId || "-")}</div>
            <div style="margin-bottom:3px;"><strong>Age / Gender:</strong> ${patientAge ?? "-"} / ${patientGender}</div>
            <div style="margin-bottom:3px;"><strong>Doctor:</strong> ${escapeHtml(visit.doctorName || "-")}</div>
            <div><strong>Date:</strong> ${visitDate}</div>
          </td>
          <td style="width:50%;vertical-align:top;padding:4px 0 4px 10px;border-left:1px solid ${border};">
            <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:3px;">
              <div><strong>Visit ID:</strong> ${escapeHtml(visit.visitId)}</div>
              <div id="rx-barcode" style="flex-shrink:0;"></div>
            </div>
          </td>
        </tr>
      </table>
      ${visit.diagnosis ? `<div style="margin-bottom:8px;"><strong>Diagnosis:</strong> ${escapeHtml(visit.diagnosis)}</div>` : ""}
      ${visit.symptoms ? `<div style="margin-bottom:8px;"><strong>Symptoms:</strong> ${escapeHtml(visit.symptoms)}</div>` : ""}
      <table style="margin-bottom:10px;">
        <thead>
          <tr style="background:${teal};color:#fff;">
            <th style="padding:8px;text-align:center;font-size:9px;width:28px;">#</th>
            <th style="padding:8px;text-align:left;font-size:9px;">Medicine</th>
            <th style="padding:8px;text-align:left;font-size:9px;">Dosage</th>
            <th style="padding:8px;text-align:left;font-size:9px;">Duration</th>
            <th style="padding:8px;text-align:left;font-size:9px;">Frequency</th>
            <th style="padding:8px;text-align:left;font-size:9px;">Instructions</th>
          </tr>
        </thead>
        <tbody>${linesRows}</tbody>
      </table>
      ${notes ? `<div style="margin-top:8px;padding:8px;background:#f8fafc;border-radius:6px;"><strong>Notes:</strong> ${escapeHtml(notes)}</div>` : ""}
      </div>
      <!-- Lab-report style footer: End Of Prescription, Doctor signature only (no Prescribed/Printed By block) -->
      <div class="rx-print-footer" style="width:100%;margin-top:auto;padding-top:14px;padding-bottom:12px;">
        <div style="text-align:center;margin:8px 0;font-size:11px;font-weight:700;color:${teal};">*** End Of Prescription ***</div>
        <div style="display:flex;justify-content:flex-end;align-items:flex-start;flex-wrap:wrap;gap:8px;padding-top:6px;border-top:1px solid ${border};">
          ${doctor?.fullName ? (() => {
            const sigHref = doctor.signatureUrl ? (doctor.signatureUrl.startsWith("http") ? doctor.signatureUrl : (typeof window !== "undefined" ? window.location.origin : "") + (doctor.signatureUrl.startsWith("/") ? doctor.signatureUrl : "/" + doctor.signatureUrl)) : "";
            const name = escapeHtml(doctor.fullName);
            const qualRaw = doctor.qualification || "";
            const qual = qualRaw ? qualRaw.split(/,\s*,/).map((s: string) => escapeHtml(s.trim())).filter(Boolean).join("<br/>") : "";
            return `
          <div style="text-align:center;font-size:${fSm}px;line-height:1.3;">
            ${sigHref ? `<img src="${sigHref}" alt="Signature" style="max-height:36px;max-width:120px;object-contain;display:block;margin:0 auto 2px;" onerror="this.style.display='none'" />` : ""}
            <div style="font-weight:700;color:${accent};">${name}</div>
            ${qual ? `<div style="color:${muted};">${qual}</div>` : ""}
            <div style="font-size:9px;color:${muted};margin-top:1px;">Prescribing Doctor</div>
          </div>`;
          })() : ""}
        </div>
        <div style="text-align:center;margin-top:6px;padding-top:6px;border-top:1px solid ${border};font-size:11px;font-weight:600;color:${teal};">
          Thank you for trusting ${escapeHtml(clinicName)}. Your well-being is our greatest priority.
        </div>
        ${clinicEmail ? `<div style="text-align:center;font-size:9px;color:${muted};margin-top:4px;">${escapeHtml(clinicEmail)}</div>` : ""}
      </div>
    </div>
    <script>
    (function() {
      var barcodeVal = ${JSON.stringify(barcodeVal)};
      window.onload = function() {
        try {
          var el = document.getElementById("rx-barcode");
          if (el && barcodeVal && typeof JsBarcode !== "undefined") {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            el.appendChild(svg);
            JsBarcode(svg, barcodeVal, { format: "CODE128", width: 1.2, height: 24, displayValue: false, margin: 2, lineColor: "#000", background: "#fff" });
          }
        } catch (e) {}
        setTimeout(function() { window.print(); }, 200);
      };
    })();
    <\/script>
    </body></html>
  `);
  printWindow.document.close();
}
