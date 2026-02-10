import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPatientSchema, insertOpdVisitSchema, insertBillSchema,
  insertServiceSchema, insertMedicineSchema, insertExpenseSchema,
  insertBankTransactionSchema, insertInvestmentSchema,
  insertUserSchema, insertRoleSchema, insertIntegrationSchema,
  insertClinicSettingsSchema, insertLabTestSchema, insertAppointmentSchema,
  insertDoctorSchema, insertSalarySchema,
  insertSalaryProfileSchema, insertSalaryLoanSchema, insertLoanInstallmentSchema,
  insertPayrollRunSchema, insertPayslipSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const uploadsDir = path.join(process.cwd(), "uploads", "lab-reports");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const patientPhotosDir = path.join(process.cwd(), "uploads", "patient-photos");
if (!fs.existsSync(patientPhotosDir)) {
  fs.mkdirSync(patientPhotosDir, { recursive: true });
}

const doctorPhotosDir = path.join(process.cwd(), "uploads", "doctor-photos");
if (!fs.existsSync(doctorPhotosDir)) {
  fs.mkdirSync(doctorPhotosDir, { recursive: true });
}

const salaryUploadsDir = path.join(process.cwd(), "uploads", "salary");
if (!fs.existsSync(salaryUploadsDir)) {
  fs.mkdirSync(salaryUploadsDir, { recursive: true });
}

const doctorPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, doctorPhotosDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, GIF image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, patientPhotosDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, GIF image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Excel, and CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Error(fromError(result.error).message);
  }
  return result.data;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Dashboard
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/recent-visits", async (_req, res) => {
    try {
      const visits = await storage.getRecentVisits();
      res.json(visits.slice(0, 5));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/revenue-chart", async (_req, res) => {
    try {
      const data = await storage.getRevenueChart();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/service-breakdown", async (_req, res) => {
    try {
      const data = await storage.getServiceBreakdown();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Patients
  app.get("/api/patients", async (_req, res) => {
    try {
      const result = await storage.getPatients();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const data = validateBody(insertPatientSchema, req.body);
      const patient = await storage.createPatient(data);
      res.status(201).json(patient);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/patients/:id", async (req, res) => {
    try {
      const updated = await storage.updatePatient(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await storage.deletePatient(Number(req.params.id));
      res.json({ message: "Patient deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/patients/upload-photo", photoUpload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }
      const photoUrl = `/uploads/patient-photos/${req.file.filename}`;
      res.json({ photoUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.use("/uploads/patient-photos", express.static(patientPhotosDir));
  app.use("/uploads/doctor-photos", express.static(doctorPhotosDir));

  app.post("/api/doctors/upload-photo", doctorPhotoUpload.single('photo'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const photoUrl = `/uploads/doctor-photos/${req.file.filename}`;
      res.json({ photoUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // OPD Visits
  app.get("/api/opd-visits", async (_req, res) => {
    try {
      const result = await storage.getOpdVisits();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/opd-visits", async (req, res) => {
    try {
      const data = validateBody(insertOpdVisitSchema, req.body);
      const visit = await storage.createOpdVisit(data);
      res.status(201).json(visit);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/opd-visits/:id", async (req, res) => {
    try {
      const updateSchema = z.object({ status: z.string().optional(), diagnosis: z.string().optional(), prescription: z.string().optional(), notes: z.string().optional() });
      const data = validateBody(updateSchema, req.body);
      const visit = await storage.updateOpdVisit(Number(req.params.id), data);
      if (!visit) return res.status(404).json({ message: "Visit not found" });
      res.json(visit);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Bills
  app.get("/api/bills", async (_req, res) => {
    try {
      const result = await storage.getBills();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      const data = validateBody(insertBillSchema, req.body);
      const bill = await storage.createBill(data);
      res.status(201).json(bill);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/bills/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const bill = await storage.updateBill(id, req.body);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      res.json(bill);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/bills/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteBill(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Services
  app.get("/api/services", async (_req, res) => {
    try {
      const result = await storage.getServices();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const data = validateBody(insertServiceSchema, req.body);
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        isActive: z.boolean().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        price: z.string().optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
      });
      const data = validateBody(updateSchema, req.body);
      const service = await storage.updateService(Number(req.params.id), data);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      await storage.deleteService(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Medicines
  app.get("/api/medicines/export/:format", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const medicines = await storage.getMedicines();
      const rows = medicines.map(m => ({
        Name: m.name,
        "Generic Name": m.genericName || "",
        Category: m.category || "",
        Manufacturer: m.manufacturer || "",
        "Batch No": m.batchNo || "",
        "Expiry Date": m.expiryDate || "",
        Unit: m.unit,
        "Unit Count": m.unitCount,
        "Box Price": m.boxPrice,
        "Qty Per Box": m.qtyPerBox,
        "Per Med Price": m.perMedPrice,
        "Total Purchase Price": m.totalPurchasePrice,
        "Selling Price (Local)": m.sellingPriceLocal,
        "Selling Price (Foreigner)": m.sellingPriceForeigner,
        "Stock Count": m.stockCount,
        "Stock Alert": m.stockAlert,
        Active: m.isActive ? "Yes" : "No",
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Medicines");
      const format = req.params.format;
      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=medicines.csv");
        res.send(csv);
      } else {
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=medicines.xlsx");
        res.send(buf);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/medicines/sample-template", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const sampleRows = [
        {
          Name: "Paracetamol 500mg", "Generic Name": "Acetaminophen", Category: "Tablet",
          Manufacturer: "PharmaCo", "Batch No": "B-2026-001", "Expiry Date": "2027-12-31",
          Unit: "Box", "Unit Count": 10, "Box Price": "5.00", "Qty Per Box": 10,
          "Selling Price (Local)": "0.80", "Selling Price (Foreigner)": "1.00", "Stock Alert": 20,
        },
        {
          Name: "Amoxicillin 250mg", "Generic Name": "Amoxicillin", Category: "Capsule",
          Manufacturer: "MedLab", "Batch No": "B-2026-002", "Expiry Date": "2027-06-30",
          Unit: "Box", "Unit Count": 5, "Box Price": "8.00", "Qty Per Box": 10,
          "Selling Price (Local)": "1.20", "Selling Price (Foreigner)": "1.50", "Stock Alert": 15,
        },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, "Medicine Template");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=medicine_import_template.xlsx");
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const medicineImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/medicines/import", medicineImportUpload.single("file"), async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row["Name"] || row["name"];
        if (!name) { skipped++; errors.push(`Row ${i + 2}: Missing medicine name`); continue; }
        try {
          const boxPrice = parseFloat(row["Box Price"] || row["boxPrice"] || "0") || 0;
          const qtyPerBox = parseInt(row["Qty Per Box"] || row["qtyPerBox"] || "1") || 1;
          const perMedPrice = qtyPerBox > 0 ? boxPrice / qtyPerBox : 0;
          const unitCount = parseInt(row["Unit Count"] || row["unitCount"] || "1") || 1;
          await storage.createMedicine({
            name,
            genericName: row["Generic Name"] || row["genericName"] || null,
            category: row["Category"] || row["category"] || null,
            manufacturer: row["Manufacturer"] || row["manufacturer"] || null,
            batchNo: row["Batch No"] || row["batchNo"] || null,
            expiryDate: row["Expiry Date"] || row["expiryDate"] || null,
            unit: row["Unit"] || row["unit"] || "Box",
            unitCount,
            boxPrice: boxPrice.toString(),
            qtyPerBox,
            perMedPrice: perMedPrice.toFixed(4),
            totalPurchasePrice: (unitCount * boxPrice).toFixed(2),
            sellingPriceLocal: (parseFloat(row["Selling Price (Local)"] || row["sellingPriceLocal"] || "0") || 0).toString(),
            sellingPriceForeigner: (parseFloat(row["Selling Price (Foreigner)"] || row["sellingPriceForeigner"] || "0") || 0).toString(),
            stockCount: parseInt(row["Stock Count"] || row["stockCount"] || "0") || 0,
            stockAlert: parseInt(row["Stock Alert"] || row["stockAlert"] || "10") || 10,
            quantity: 0, unitPrice: "0", sellingPrice: "0", isActive: true,
          });
          imported++;
        } catch (err: any) { skipped++; errors.push(`Row ${i + 2}: ${err.message}`); }
      }
      res.json({ imported, skipped, total: rows.length, errors: errors.slice(0, 10) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/medicines", async (_req, res) => {
    try {
      const result = await storage.getMedicines();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/medicines", async (req, res) => {
    try {
      const data = validateBody(insertMedicineSchema, req.body);
      const medicine = await storage.createMedicine(data);
      res.status(201).json(medicine);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  const medicineUpdateSchema = z.object({
    name: z.string().optional(),
    genericName: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    manufacturer: z.string().nullable().optional(),
    batchNo: z.string().nullable().optional(),
    expiryDate: z.string().nullable().optional(),
    unit: z.string().optional(),
    unitCount: z.number().optional(),
    boxPrice: z.string().optional(),
    qtyPerBox: z.number().optional(),
    perMedPrice: z.string().optional(),
    totalPurchasePrice: z.string().optional(),
    sellingPriceLocal: z.string().optional(),
    sellingPriceForeigner: z.string().optional(),
    stockCount: z.number().optional(),
    stockAlert: z.number().optional(),
    quantity: z.number().optional(),
    unitPrice: z.string().optional(),
    sellingPrice: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  app.put("/api/medicines/:id", async (req, res) => {
    try {
      const data = validateBody(medicineUpdateSchema, req.body);
      const medicine = await storage.updateMedicine(Number(req.params.id), data);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      res.json(medicine);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/medicines/:id", async (req, res) => {
    try {
      const data = validateBody(medicineUpdateSchema, req.body);
      const medicine = await storage.updateMedicine(Number(req.params.id), data);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      res.json(medicine);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/medicines/:id", async (req, res) => {
    try {
      await storage.deleteMedicine(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Expenses
  app.get("/api/expenses/export/:format", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const expenses = await storage.getExpenses();
      const rows = expenses.map(e => ({
        Date: e.date,
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        "Payment Method": e.paymentMethod || "cash",
        Status: e.status || "pending",
        Notes: e.notes || "",
        "Approved By": e.approvedBy || "",
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      const format = req.params.format;
      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
        res.send(csv);
      } else if (format === "pdf") {
        const PDFDocument = (await import("pdfkit")).default;
        const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => {
          const pdfBuf = Buffer.concat(chunks);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=expenses.pdf");
          res.send(pdfBuf);
        });
        doc.fontSize(18).text("Expense Report", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("#666").text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
        doc.moveDown(1);
        const headers = ["Date", "Category", "Description", "Amount", "Method", "Status"];
        const colWidths = [75, 90, 200, 70, 70, 70];
        let y = doc.y;
        doc.fontSize(8).fillColor("#fff");
        let x = 40;
        headers.forEach((h, i) => {
          doc.rect(x, y, colWidths[i], 18).fill("#2d7d46");
          doc.fillColor("#fff").text(h, x + 4, y + 5, { width: colWidths[i] - 8 });
          x += colWidths[i];
        });
        y += 18;
        doc.fillColor("#333");
        expenses.forEach((e, idx) => {
          if (y > 520) { doc.addPage(); y = 40; }
          const bgColor = idx % 2 === 0 ? "#f9f9f9" : "#ffffff";
          x = 40;
          const vals = [e.date, e.category, e.description, `$${Number(e.amount).toFixed(2)}`, e.paymentMethod || "cash", e.status || "pending"];
          vals.forEach((v, i) => {
            doc.rect(x, y, colWidths[i], 16).fill(bgColor);
            doc.fillColor("#333").text(v, x + 4, y + 4, { width: colWidths[i] - 8 });
            x += colWidths[i];
          });
          y += 16;
        });
        doc.moveDown(1);
        const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
        doc.fontSize(10).fillColor("#333").text(`Total Expenses: $${total.toFixed(2)}`, 40, y + 10);
        doc.end();
        return;
      } else {
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");
        res.send(buf);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/expenses/sample-template", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const sampleRows = [
        {
          Date: "2026-02-10", Category: "Medical Supplies", Description: "Surgical gloves (100 boxes)",
          Amount: "250.00", "Payment Method": "cash", Notes: "Monthly supply order",
        },
        {
          Date: "2026-02-09", Category: "Utilities", Description: "Electricity bill - January",
          Amount: "180.50", "Payment Method": "aba", Notes: "Monthly utility",
        },
        {
          Date: "2026-02-08", Category: "Equipment", Description: "Blood pressure monitor",
          Amount: "120.00", "Payment Method": "card", Notes: "Replacement unit",
        },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, "Expense Template");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=expense_import_template.xlsx");
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const expenseImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/expenses/import", expenseImportUpload.single("file"), async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const description = row["Description"] || row["description"];
        const category = row["Category"] || row["category"];
        const amount = row["Amount"] || row["amount"];
        const date = row["Date"] || row["date"];
        if (!description || !category || !amount || !date) {
          skipped++;
          errors.push(`Row ${i + 2}: Missing required fields (Description, Category, Amount, Date)`);
          continue;
        }
        try {
          await storage.createExpense({
            description,
            category,
            amount: parseFloat(amount).toFixed(2),
            date,
            paymentMethod: row["Payment Method"] || row["paymentMethod"] || "cash",
            notes: row["Notes"] || row["notes"] || null,
            status: "pending",
          });
          imported++;
        } catch (err: any) {
          skipped++;
          errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }
      res.json({ imported, skipped, total: rows.length, errors: errors.slice(0, 10) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/expenses", async (_req, res) => {
    try {
      const result = await storage.getExpenses();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const data = validateBody(insertExpenseSchema, req.body);
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpense(Number(req.params.id), req.body);
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      res.json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      await storage.deleteExpense(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Bank Transactions
  app.get("/api/bank-transactions", async (_req, res) => {
    try {
      const result = await storage.getBankTransactions();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bank-transactions", async (req, res) => {
    try {
      const data = validateBody(insertBankTransactionSchema, req.body);
      const tx = await storage.createBankTransaction(data);
      res.status(201).json(tx);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Investments
  app.get("/api/investments", async (_req, res) => {
    try {
      const result = await storage.getInvestments();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const data = validateBody(insertInvestmentSchema, req.body);
      const inv = await storage.createInvestment(data);
      res.status(201).json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Users / Staff
  app.get("/api/users", async (_req, res) => {
    try {
      const result = await storage.getUsers();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = validateBody(insertUserSchema, req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updateSchema = z.object({ isActive: z.boolean().optional(), roleId: z.number().optional(), fullName: z.string().optional() });
      const data = validateBody(updateSchema, req.body);
      const user = await storage.updateUser(Number(req.params.id), data);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Roles
  app.get("/api/roles", async (_req, res) => {
    try {
      const result = await storage.getRoles();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/roles", async (req, res) => {
    try {
      const data = validateBody(insertRoleSchema, req.body);
      const role = await storage.createRole(data);
      res.status(201).json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Integrations
  app.get("/api/integrations", async (_req, res) => {
    try {
      const result = await storage.getIntegrations();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/integrations", async (req, res) => {
    try {
      const data = validateBody(insertIntegrationSchema, req.body);
      const int = await storage.createIntegration(data);
      res.status(201).json(int);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/integrations/:id", async (req, res) => {
    try {
      const updateSchema = z.object({ status: z.string().optional(), port: z.string().optional(), ipAddress: z.string().optional() });
      const data = validateBody(updateSchema, req.body);
      const int = await storage.updateIntegration(Number(req.params.id), data);
      if (!int) return res.status(404).json({ message: "Integration not found" });
      res.json(int);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        const created = await storage.upsertSettings({
          clinicName: "My Clinic",
          currency: "USD",
          taxRate: "0",
          invoicePrefix: "INV",
          visitPrefix: "VIS",
          patientPrefix: "PAT",
        });
        return res.json(created);
      }
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const data = validateBody(insertClinicSettingsSchema, req.body);
      const settings = await storage.upsertSettings(data);
      res.json(settings);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Reports
  app.get("/api/reports/summary", async (_req, res) => {
    try {
      const summary = await storage.getReportSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/monthly-revenue", async (_req, res) => {
    try {
      const data = await storage.getMonthlyRevenue();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/expenses-by-category", async (_req, res) => {
    try {
      const data = await storage.getExpensesByCategory();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/top-services", async (_req, res) => {
    try {
      const data = await storage.getTopServices();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Lab Tests
  app.get("/api/lab-tests", async (_req, res) => {
    try {
      const result = await storage.getLabTests();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/lab-tests/next-code", async (_req, res) => {
    try {
      const code = await storage.getNextLabTestCode();
      res.json({ code });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/lab-tests", async (req, res) => {
    try {
      const data = validateBody(insertLabTestSchema, req.body);
      const test = await storage.createLabTest(data);
      res.status(201).json(test);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/lab-tests/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        testName: z.string().optional(),
        category: z.string().optional(),
        sampleType: z.string().optional(),
        price: z.string().optional(),
        description: z.string().nullable().optional(),
        turnaroundTime: z.string().nullable().optional(),
        patientId: z.number().nullable().optional(),
        referrerName: z.string().nullable().optional(),
        reportFileUrl: z.string().nullable().optional(),
        reportFileName: z.string().nullable().optional(),
        status: z.string().optional(),
      });
      const data = validateBody(updateSchema, req.body);
      const test = await storage.updateLabTest(Number(req.params.id), data);
      if (!test) return res.status(404).json({ message: "Lab test not found" });
      res.json(test);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/lab-tests/:id/upload-report", reportUpload.single('report'), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const referrerName = req.body.referrerName || null;
      const updateData: any = {
        reportFileUrl: `/api/lab-tests/reports/${file.filename}`,
        reportFileName: file.originalname,
      };
      if (referrerName) updateData.referrerName = referrerName;
      const test = await storage.updateLabTest(id, updateData);
      if (!test) return res.status(404).json({ message: "Lab test not found" });
      res.json(test);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/lab-tests/reports/:filename", (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.download(filePath);
  });

  app.delete("/api/lab-tests/:id", async (req, res) => {
    try {
      const test = await storage.getLabTest(Number(req.params.id));
      if (test?.reportFileUrl) {
        const filename = test.reportFileUrl.split('/').pop();
        if (filename) {
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
      await storage.deleteLabTest(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Appointments
  app.get("/api/appointments", async (_req, res) => {
    try {
      const result = await storage.getAppointments();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const data = validateBody(insertAppointmentSchema, req.body);
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const updated = await storage.updateAppointment(Number(req.params.id), req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await storage.deleteAppointment(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Doctors
  app.get("/api/doctors", async (_req, res) => {
    try {
      const result = await storage.getDoctors();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/doctors/next-id", async (_req, res) => {
    try {
      const id = await storage.getNextDoctorId();
      res.json({ id });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/doctors", async (req, res) => {
    try {
      const data = validateBody(insertDoctorSchema, req.body);
      const doctor = await storage.createDoctor(data);
      res.status(201).json(doctor);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/doctors/:id", async (req, res) => {
    try {
      const doctorUpdateSchema = z.object({
        name: z.string().optional(), specialization: z.string().optional(),
        department: z.string().nullable().optional(), experience: z.string().nullable().optional(),
        qualification: z.string().nullable().optional(), phone: z.string().nullable().optional(),
        email: z.string().nullable().optional(), address: z.string().nullable().optional(),
        consultationFee: z.string().nullable().optional(), schedule: z.string().nullable().optional(),
        status: z.string().optional(), joiningDate: z.string().nullable().optional(),
        photoUrl: z.string().nullable().optional(), notes: z.string().nullable().optional(),
      });
      const data = validateBody(doctorUpdateSchema, req.body);
      const doctor = await storage.updateDoctor(Number(req.params.id), data);
      if (!doctor) return res.status(404).json({ message: "Doctor not found" });
      res.json(doctor);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/doctors/:id", async (req, res) => {
    try {
      await storage.deleteDoctor(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Salaries
  app.get("/api/salaries", async (_req, res) => {
    try {
      const result = await storage.getSalaries();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/salaries", async (req, res) => {
    try {
      const data = validateBody(insertSalarySchema, req.body);
      const salary = await storage.createSalary(data);
      res.status(201).json(salary);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/salaries/:id", async (req, res) => {
    try {
      const salaryUpdateSchema = z.object({
        staffName: z.string().optional(), role: z.string().nullable().optional(),
        department: z.string().nullable().optional(),
        baseSalary: z.string().optional(), allowances: z.string().nullable().optional(),
        deductions: z.string().nullable().optional(), netSalary: z.string().optional(),
        paymentMethod: z.string().nullable().optional(), paymentDate: z.string().optional(),
        month: z.string().optional(), year: z.string().optional(),
        status: z.string().optional(), notes: z.string().nullable().optional(),
      });
      const data = validateBody(salaryUpdateSchema, req.body);
      const salary = await storage.updateSalary(Number(req.params.id), data);
      if (!salary) return res.status(404).json({ message: "Salary not found" });
      res.json(salary);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/salaries/:id", async (req, res) => {
    try {
      await storage.deleteSalary(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Salary Profiles
  app.get("/api/salary-profiles", async (_req, res) => {
    try {
      const result = await storage.getSalaryProfiles();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/salary-profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getSalaryProfile(Number(req.params.id));
      if (!profile) return res.status(404).json({ message: "Salary profile not found" });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/salary-profiles", async (req, res) => {
    try {
      const data = validateBody(insertSalaryProfileSchema, req.body);
      const profile = await storage.createSalaryProfile(data);
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/salary-profiles/:id", async (req, res) => {
    try {
      const profile = await storage.updateSalaryProfile(Number(req.params.id), req.body);
      if (!profile) return res.status(404).json({ message: "Salary profile not found" });
      res.json(profile);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/salary-profiles/:id", async (req, res) => {
    try {
      await storage.deleteSalaryProfile(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const salaryFileUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, salaryUploadsDir),
      filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPG, PNG, GIF, WebP, and PDF files are allowed"));
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/salary-profiles/:id/upload-image", salaryFileUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const filePath = `/uploads/salary/${req.file.filename}`;
      const profile = await storage.updateSalaryProfile(Number(req.params.id), { profileImage: filePath });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/salary-profiles/:id/upload-payment-slip", salaryFileUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const filePath = `/uploads/salary/${req.file.filename}`;
      const profile = await storage.updateSalaryProfile(Number(req.params.id), { paymentSlip: filePath });
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.use("/uploads/salary", express.static(salaryUploadsDir));

  // Salary Loans
  app.get("/api/salary-loans", async (_req, res) => {
    try {
      const result = await storage.getSalaryLoans();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/salary-loans/:id", async (req, res) => {
    try {
      const loan = await storage.getSalaryLoan(Number(req.params.id));
      if (!loan) return res.status(404).json({ message: "Salary loan not found" });
      res.json(loan);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/salary-loans", async (req, res) => {
    try {
      const data = validateBody(insertSalaryLoanSchema, req.body);
      const loan = await storage.createSalaryLoan(data);
      res.status(201).json(loan);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/salary-loans/:id", async (req, res) => {
    try {
      const loan = await storage.updateSalaryLoan(Number(req.params.id), req.body);
      if (!loan) return res.status(404).json({ message: "Salary loan not found" });
      res.json(loan);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/salary-loans/:id", async (req, res) => {
    try {
      await storage.deleteSalaryLoan(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Loan Installments
  app.get("/api/loan-installments/:loanId", async (req, res) => {
    try {
      const result = await storage.getLoanInstallments(Number(req.params.loanId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/loan-installments", async (req, res) => {
    try {
      const data = validateBody(insertLoanInstallmentSchema, req.body);
      const installment = await storage.createLoanInstallment(data);
      res.status(201).json(installment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Payroll Runs
  app.get("/api/payroll-runs", async (_req, res) => {
    try {
      const result = await storage.getPayrollRuns();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/payroll-runs/:id", async (req, res) => {
    try {
      const run = await storage.getPayrollRun(Number(req.params.id));
      if (!run) return res.status(404).json({ message: "Payroll run not found" });
      res.json(run);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payroll-runs", async (req, res) => {
    try {
      const data = validateBody(insertPayrollRunSchema, req.body);
      const run = await storage.createPayrollRun(data);
      res.status(201).json(run);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/payroll-runs/:id", async (req, res) => {
    try {
      const run = await storage.updatePayrollRun(Number(req.params.id), req.body);
      if (!run) return res.status(404).json({ message: "Payroll run not found" });
      res.json(run);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/payroll-runs/:id", async (req, res) => {
    try {
      await storage.deletePayrollRun(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payroll-runs/:id/generate", async (req, res) => {
    try {
      const payrollRunId = Number(req.params.id);
      const run = await storage.getPayrollRun(payrollRunId);
      if (!run) return res.status(404).json({ message: "Payroll run not found" });

      const profiles = await storage.getSalaryProfiles();
      const activeProfiles = profiles.filter(p => p.status === "active");
      const allLoans = await storage.getSalaryLoans();

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      const generatedPayslips = [];
      const today = new Date().toISOString().split("T")[0];

      for (const profile of activeProfiles) {
        const baseSalary = Number(profile.baseSalary) || 0;
        const housing = Number(profile.housingAllowance) || 0;
        const transport = Number(profile.transportAllowance) || 0;
        const meal = Number(profile.mealAllowance) || 0;
        const other = Number(profile.otherAllowance) || 0;
        const allowances = housing + transport + meal + other;
        const grossPay = baseSalary + allowances;

        const activeLoans = allLoans.filter(l => l.profileId === profile.id && l.status === "active");
        let loanDeductions = 0;
        for (const loan of activeLoans) {
          const installment = Number(loan.installmentAmount) || 0;
          const outstanding = Number(loan.outstanding) || 0;
          const deduction = Math.min(installment, outstanding);
          loanDeductions += deduction;

          const newTotalPaid = Number(loan.totalPaid || 0) + deduction;
          const newOutstanding = Math.max(0, outstanding - deduction);
          const newStatus = newOutstanding <= 0 ? "closed" : "active";
          await storage.updateSalaryLoan(loan.id, {
            totalPaid: newTotalPaid.toString(),
            outstanding: newOutstanding.toString(),
            status: newStatus,
          });

          await storage.createLoanInstallment({
            loanId: loan.id,
            dueDate: today,
            amount: deduction.toString(),
            paidAmount: deduction.toString(),
            status: "paid",
            paidDate: today,
          });
        }

        const netPay = grossPay - loanDeductions;

        const payslip = await storage.createPayslip({
          payrollRunId,
          profileId: profile.id,
          staffName: profile.staffName,
          department: profile.department,
          baseSalary: baseSalary.toString(),
          allowances: allowances.toString(),
          loanDeductions: loanDeductions.toString(),
          otherDeductions: "0",
          grossPay: grossPay.toString(),
          netPay: netPay.toString(),
          paymentMethod: "bank_transfer",
          status: "pending",
        });

        generatedPayslips.push(payslip);
        totalGross += grossPay;
        totalDeductions += loanDeductions;
        totalNet += netPay;
      }

      await storage.updatePayrollRun(payrollRunId, {
        totalGross: totalGross.toString(),
        totalDeductions: totalDeductions.toString(),
        totalNet: totalNet.toString(),
        employeeCount: activeProfiles.length,
        status: "generated",
      });

      res.status(201).json({ payslips: generatedPayslips, employeeCount: activeProfiles.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Payslips
  app.get("/api/payslips/:payrollRunId", async (req, res) => {
    try {
      const result = await storage.getPayslips(Number(req.params.payrollRunId));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/payslips", async (req, res) => {
    try {
      const data = validateBody(insertPayslipSchema, req.body);
      const payslip = await storage.createPayslip(data);
      res.status(201).json(payslip);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/payslips/:id", async (req, res) => {
    try {
      const payslip = await storage.updatePayslip(Number(req.params.id), req.body);
      if (!payslip) return res.status(404).json({ message: "Payslip not found" });
      res.json(payslip);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const isHashed = user.password.startsWith("$2");
      const isMatch = isHashed ? await bcrypt.compare(password, user.password) : user.password === password;
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }
      if (!isHashed) {
        const hashed = await bcrypt.hash(password, 10);
        await storage.changePassword(user.id, hashed);
      }
      res.json({ id: user.id, username: user.username, fullName: user.fullName, email: user.email, roleId: user.roleId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const user = await storage.getUser(Number(userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      const isHashed = user.password.startsWith("$2");
      const isMatch = isHashed ? await bcrypt.compare(currentPassword, user.password) : user.password === currentPassword;
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashedNew = await bcrypt.hash(newPassword, 10);
      await storage.changePassword(Number(userId), hashedNew);
      res.json({ message: "Password changed successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
