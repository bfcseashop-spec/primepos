/**
 * Print prescription: clinic header, patient, doctor, date, prescription lines, barcode (visitId), footer.
 * Visit.prescription can be JSON string { lines: [...], notes? } or plain text (shown as notes).
 */

export type PrescriptionLine = {
  medicineId?: number;
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
      const parsed = JSON.parse(trimmed) as PrescriptionData;
      return {
        lines: Array.isArray(parsed.lines) ? parsed.lines : [],
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      };
    } catch {
      return { lines: [], notes: trimmed };
    }
  }
  return { lines: [], notes: trimmed };
}

export function printPrescription(
  visit: { visitId: string; doctorName?: string | null; visitDate?: string | Date | null; prescription?: string | null; diagnosis?: string | null; symptoms?: string | null },
  patient: { name?: string; patientId?: string; age?: number | null; gender?: string | null; dateOfBirth?: string | null } | null,
  settings: { clinicName?: string | null; address?: string | null; phone?: string | null; email?: string | null; logo?: string | null; printPageSize?: string | null } | null
) {
  const pageSize = settings?.printPageSize ?? "A4";
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
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: ${accent}; padding: 12px; font-size: 11px; line-height: 1.5; }
      @media print { @page { size: ${pageSize}; margin: 10mm; } body { padding: 0; } }
      table { border-collapse: collapse; width: 100%; }
    </style></head><body>
    <div style="max-width:100%;">
      <div style="text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${border};">
        ${logoHref ? `<img src="${logoHref}" alt="Logo" style="max-height:40px;margin-bottom:4px;" />` : ""}
        <div style="font-size:18px;font-weight:800;color:${teal};text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(clinicName)}</div>
        <div style="font-size:9px;color:${muted};">${escapeHtml(clinicAddress)} ${clinicPhone ? " | " + clinicPhone : ""} ${clinicEmail ? " | " + clinicEmail : ""}</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:${teal};margin-bottom:10px;text-transform:uppercase;">Prescription</div>
      <table style="margin-bottom:10px;font-size:10px;">
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">Patient:</td><td>${escapeHtml(patient?.name || "-")}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">UHID:</td><td>${escapeHtml(patient?.patientId || "-")}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">Age / Gender:</td><td>${patientAge ?? "-"} / ${patientGender}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">Doctor:</td><td>${escapeHtml(visit.doctorName || "-")}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">Date:</td><td>${visitDate}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;font-weight:600;">Visit ID:</td><td>${escapeHtml(visit.visitId)} <span id="rx-barcode" style="display:inline-block;vertical-align:middle;margin-left:8px;"></span></td></tr>
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
      <div style="text-align:center;margin-top:16px;padding-top:8px;border-top:2px solid ${border};font-size:9px;color:${muted};">
        Thank you for choosing ${escapeHtml(clinicName)}. This is a computer-generated prescription.
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
