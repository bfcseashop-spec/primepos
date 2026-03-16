/**
 * Print patient details: A5 page, clinic header, patient info + barcode (bill-print style).
 */

export type PatientPrintSettings = {
  clinicName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
};

export type PatientForPrint = {
  id?: number;
  patientId: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  bloodGroup?: string | null;
  dateOfBirth?: string | null;
  patientType?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
};

function escapeHtml(s: string): string {
  if (typeof s !== "string") return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || dob.length < 10) return null;
  const birth = new Date(dob + "T12:00:00");
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  if (birth > today) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export function printPatientDetails(
  patient: PatientForPrint,
  settings: PatientPrintSettings | null
): void {
  const pageSize = "A5";
  const clinicName = settings?.clinicName ?? "Clinic";
  const clinicAddress = settings?.address ?? "";
  const clinicPhone = settings?.phone ?? "";
  const clinicEmail = settings?.email ?? "";
  const logoHref = settings?.logo
    ? (settings.logo.startsWith("http") ? settings.logo : `${typeof window !== "undefined" ? window.location.origin : ""}${settings.logo.startsWith("/") ? settings.logo : "/" + settings.logo}`)
    : "";
  const teal = "#0d9488";
  const accent = "#0f172a";
  const muted = "#475569";
  const border = "#e2e8f0";
  const barcodeVal = (patient.patientId || "").replace(/\s/g, "").replace(/[^A-Za-z0-9\-]/g, "") || "P";
  const patientAge = patient.age ?? ageFromDob(patient.dateOfBirth);
  const displayName = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "-";

  const printWindow = window.open("", "_blank", "width=596,height=842");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>Patient ${escapeHtml(patient.patientId)}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: ${accent}; padding: 0; width: 100%; margin: 0 auto; font-size: 10px; line-height: 1.5; }
      table { border-collapse: collapse; width: 100%; }
      @media print { @page { size: ${pageSize}; margin: 8mm; } html, body { min-height: 100%; margin: 0; padding: 0; width: 100% !important; } }
      .print-page { min-height: 100vh; display: flex; flex-direction: column; width: 100%; padding: 10px 14px; }
      .print-body { flex: 1; width: 100%; }
      .print-footer { margin-top: auto; }
    </style></head><body>
    <div class="print-page">
      <div class="print-body">
        <div style="text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid ${border};">
          ${logoHref ? `<img src="${logoHref}" alt="Logo" style="max-height:36px;margin:0 auto 4px;display:block;" />` : ""}
          <div style="font-size:16px;font-weight:900;color:${teal};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">${escapeHtml(clinicName)}</div>
          <div style="font-size:9px;color:${muted};line-height:1.5;">
            ${clinicAddress ? `<div>${escapeHtml(clinicAddress)}</div>` : ""}
            <div>${[clinicPhone, clinicEmail].filter(Boolean).map((x) => escapeHtml(x)).join(" | ")}</div>
          </div>
        </div>

        <div style="font-size:14px;font-weight:700;color:${teal};margin-bottom:8px;text-transform:uppercase;border-bottom:1px solid ${border};padding-bottom:4px;">Patient Details</div>

        <table style="width:100%;margin-bottom:10px;font-size:11px;">
          <tr>
            <td style="width:50%;vertical-align:top;padding:6px 12px 6px 0;">
              <div style="margin-bottom:4px;"><strong>Patient Name:</strong> ${escapeHtml(displayName)}</div>
              <div style="margin-bottom:4px;"><strong>UHID:</strong> ${escapeHtml(patient.patientId || "-")}</div>
              <div style="margin-bottom:4px;"><strong>Age / Gender:</strong> ${patientAge != null ? patientAge : "-"} / ${patient.gender ? escapeHtml(patient.gender) : "-"}</div>
              ${patient.patientType ? `<div style="margin-bottom:4px;"><strong>Type:</strong> ${escapeHtml(patient.patientType)}</div>` : ""}
              <div><strong>Date of Birth:</strong> ${patient.dateOfBirth ? escapeHtml(patient.dateOfBirth) : "-"}</div>
            </td>
            <td style="width:50%;vertical-align:top;padding:6px 0 6px 12px;border-left:1px solid ${border};">
              <div id="patient-barcode" style="margin-bottom:4px;min-height:28px;"></div>
              <div style="font-size:8px;color:${muted};">ID: ${escapeHtml(patient.patientId || "-")}</div>
            </td>
          </tr>
        </table>

        <table style="width:100%;font-size:10px;border:1px solid ${border};">
          <tr style="background:${teal};color:#fff;"><th style="padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;">Field</th><th style="padding:8px 10px;text-align:left;font-size:9px;text-transform:uppercase;">Value</th></tr>
          ${patient.phone ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};">Phone</td><td style="padding:6px 10px;">${escapeHtml(patient.phone)}</td></tr>` : ""}
          ${patient.email ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};">Email</td><td style="padding:6px 10px;">${escapeHtml(patient.email)}</td></tr>` : ""}
          ${patient.bloodGroup ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};">Blood Group</td><td style="padding:6px 10px;">${escapeHtml(patient.bloodGroup)}</td></tr>` : ""}
          ${(patient.address || patient.city) ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};">Address</td><td style="padding:6px 10px;">${escapeHtml([patient.address, patient.city].filter(Boolean).join(", "))}</td></tr>` : ""}
          ${(patient.emergencyContactName || patient.emergencyContactPhone) ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};">Emergency Contact</td><td style="padding:6px 10px;">${escapeHtml([patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(" – "))}</td></tr>` : ""}
          ${patient.medicalHistory ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};vertical-align:top;">Medical History</td><td style="padding:6px 10px;">${escapeHtml(patient.medicalHistory)}</td></tr>` : ""}
          ${patient.allergies ? `<tr style="border-bottom:1px solid ${border};"><td style="padding:6px 10px;font-weight:600;color:${muted};vertical-align:top;">Allergies</td><td style="padding:6px 10px;">${escapeHtml(patient.allergies)}</td></tr>` : ""}
        </table>

      </div>
      <div class="print-footer" style="width:100%;padding-top:12px;border-top:2px solid ${border};margin-top:12px;">
        <div style="text-align:center;font-size:10px;font-weight:800;color:${teal};text-transform:uppercase;">Thank you for choosing ${escapeHtml(clinicName)}</div>
        ${clinicEmail ? `<div style="text-align:center;font-size:8px;color:${muted};margin-top:4px;">${escapeHtml(clinicEmail)}</div>` : ""}
      </div>
    </div>
    <script>
    (function() {
      var barcodeVal = ${JSON.stringify(barcodeVal)};
      window.onload = function() {
        try {
          var el = document.getElementById("patient-barcode");
          if (el && barcodeVal && typeof JsBarcode !== "undefined") {
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            el.appendChild(svg);
            JsBarcode(svg, barcodeVal, { format: "CODE128", width: 1.2, height: 24, displayValue: false, margin: 2, lineColor: "#000000", background: "#ffffff" });
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
