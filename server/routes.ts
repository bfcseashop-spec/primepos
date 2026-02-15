import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPatientSchema, insertOpdVisitSchema, insertBillSchema,
  insertServiceSchema, insertInjectionSchema, insertMedicineSchema, insertExpenseSchema,
  insertBankTransactionSchema, insertInvestorSchema, insertInvestmentSchema, insertContributionSchema,
  insertPackageSchema,
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

const logoUploadsDir = path.join(process.cwd(), "uploads", "logos");
if (!fs.existsSync(logoUploadsDir)) {
  fs.mkdirSync(logoUploadsDir, { recursive: true });
}

const paymentSlipDir = path.join(process.cwd(), "uploads", "payment-slips");
if (!fs.existsSync(paymentSlipDir)) {
  fs.mkdirSync(paymentSlipDir, { recursive: true });
}

const paymentSlipUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentSlipDir),
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
      cb(new Error("Only JPG, PNG, GIF, WebP image files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoUploadsDir),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, GIF, WebP, SVG image files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Authentication routes (no auth required)
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
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.fullName || "";
      req.session.email = user.email || "";
      req.session.roleId = user.roleId;
      let roleName = "User";
      if (user.roleId) {
        const role = await storage.getRole(user.roleId);
        if (role) roleName = role.name;
      }
      req.session.save((err) => {
        if (err) {
          console.error("Session save error on login:", err);
          return res.status(500).json({
            message: process.env.NODE_ENV === "production"
              ? "Session error. Check server logs (pm2 logs primepos) and database connectivity."
              : err?.message || "Session error",
          });
        }
        res.json({ id: user.id, username: user.username, fullName: user.fullName, email: user.email, roleId: user.roleId, role: roleName });
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      const isProduction = process.env.NODE_ENV === "production";
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    let roleName = "User";
    if (req.session.roleId) {
      const role = await storage.getRole(req.session.roleId);
      if (role) roleName = role.name;
    }
    res.json({
      id: req.session.userId,
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email,
      roleId: req.session.roleId,
      role: roleName,
    });
  });

  // Public settings for login page (no auth)
  app.get("/api/public/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        return res.json({
          appName: "ClinicPOS",
          appTagline: "Clinic Management System",
          appVersion: "1.0.0",
          logo: null,
          clinicName: "My Clinic",
          address: null,
          phone: null,
          email: null,
        });
      }
      res.json({
        appName: settings.appName ?? "ClinicPOS",
        appTagline: settings.appTagline ?? null,
        appVersion: settings.appVersion ?? "1.0.0",
        logo: settings.logo ?? null,
        clinicName: settings.clinicName ?? "My Clinic",
        address: settings.address ?? null,
        phone: settings.phone ?? null,
        email: settings.email ?? null,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
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

  // Public download endpoints (no auth) so window.open(..., "_blank") works with file download
  app.get("/api/services/sample-template", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const sampleRows = [
        { "Service Name": "General Consultation", Category: "Consultation", Price: "25.00" },
        { "Service Name": "Blood Test - CBC", Category: "Laboratory", Price: "15.00" },
        { "Service Name": "Chest X-Ray", Category: "Radiology", Price: "35.00" },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, "Services");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=service_import_template.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
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
      XLSX.utils.book_append_sheet(wb, ws, "Medicines");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=medicine_import_template.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
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
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=expense_import_template.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Protect all other API routes
  app.use("/api", requireAuth);

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
      const data = validateBody(insertBillSchema, req.body) as Record<string, unknown>;
      const bill = await storage.createBill(data as Parameters<typeof storage.createBill>[0]);
      const items = Array.isArray(data.items) ? data.items : [];
      for (const item of items) {
        if (item?.type === "medicine" && item.medicineId != null && typeof item.quantity === "number" && item.quantity > 0) {
          const med = await storage.getMedicine(Number(item.medicineId));
          if (med) {
            const prev = Number(med.stockCount ?? 0);
            const newStock = Math.max(0, prev - item.quantity);
            await storage.updateMedicine(med.id, { stockCount: newStock, quantity: newStock });
            await storage.createStockAdjustment({
              medicineId: med.id,
              previousStock: prev,
              newStock,
              adjustmentType: "subtract",
              reason: `Bill ${bill.billNo} – sold ${item.quantity} pc`,
            });
          }
        }
      }
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

  app.post("/api/bills/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteBills(ids);
      res.json({ success: true, deleted: ids.length });
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

  app.get("/api/services/export/:format", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const allServices = await storage.getServices();
      const rows = allServices.map(s => ({
        "Service Name": s.name,
        Category: s.category || "",
        Price: s.price,
        Description: s.description || "",
        Status: s.isActive ? "Active" : "Inactive",
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Services");
      const format = req.params.format;
      if (format === "pdf") {
        const PDFDocument = (await import("pdfkit")).default;
        const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => {
          const pdfBuf = Buffer.concat(chunks);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=services.pdf");
          res.send(pdfBuf);
        });
        doc.fontSize(18).text("Service List Report", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor("#666").text(`Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
        doc.moveDown(1);
        const headers = ["Service Name", "Category", "Price", "Description", "Status"];
        const colWidths = [150, 100, 80, 250, 80];
        let y = doc.y;
        doc.fontSize(8).fillColor("#fff");
        let x = 40;
        headers.forEach((h, i) => {
          doc.rect(x, y, colWidths[i], 18).fill("#3b82f6");
          doc.fillColor("#fff").text(h, x + 4, y + 5, { width: colWidths[i] - 8 });
          x += colWidths[i];
        });
        y += 18;
        doc.fillColor("#333");
        allServices.forEach((s, idx) => {
          if (y > 520) { doc.addPage(); y = 40; }
          const bgColor = idx % 2 === 0 ? "#f9f9f9" : "#ffffff";
          x = 40;
          const vals = [s.name, s.category || "", `$${Number(s.price).toFixed(2)}`, (s.description || "").substring(0, 60), s.isActive ? "Active" : "Inactive"];
          vals.forEach((v, i) => {
            doc.rect(x, y, colWidths[i], 16).fill(bgColor);
            doc.fillColor("#333").text(v, x + 4, y + 4, { width: colWidths[i] - 8 });
            x += colWidths[i];
          });
          y += 16;
        });
        doc.moveDown(1);
        doc.fontSize(10).fillColor("#333").text(`Total Services: ${allServices.length}`, 40, y + 10);
        doc.end();
        return;
      } else {
        const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const buf = Buffer.from(raw);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=services.xlsx");
        res.setHeader("Content-Length", String(buf.length));
        res.send(buf);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const serviceImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/services/import", serviceImportUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const fileName = req.file.originalname.toLowerCase();
      const isPdf = fileName.endsWith(".pdf") || req.file.mimetype === "application/pdf";
      let rows: any[] = [];

      if (isPdf) {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const pdfData = await pdfParse(req.file.buffer);
        const lines = pdfData.text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        let headerIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const lower = lines[i].toLowerCase();
          if ((lower.includes("service name") || lower.includes("name")) && lower.includes("price")) {
            headerIdx = i;
            break;
          }
        }
        const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines;
        for (const line of dataLines) {
          const parts = line.split(/\t|  +|\|/).map((p: string) => p.trim()).filter((p: string) => p);
          if (parts.length >= 2) {
            const priceCandidate = parts[parts.length - 1].replace(/[$,]/g, "");
            const price = parseFloat(priceCandidate);
            if (!isNaN(price)) {
              const name = parts[0];
              const category = parts.length >= 3 ? parts[1] : "General";
              rows.push({ "Service Name": name, Category: category, Price: price.toString() });
            }
          }
        }
        if (rows.length === 0) {
          return res.status(400).json({ message: "Could not parse service data from PDF. Please ensure the file has columns: Service Name, Category, Price" });
        }
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      }

      if (rows.length === 0) return res.status(400).json({ message: "File is empty or has no data rows" });
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row["Service Name"] || row["service name"] || row["Name"] || row["name"];
        const price = row["Price"] || row["price"];
        if (!name) { skipped++; errors.push(`Row ${i + 2}: Missing service name`); continue; }
        try {
          await storage.createService({
            name,
            category: row["Category"] || row["category"] || "General",
            price: (parseFloat(price) || 0).toString(),
            description: row["Description"] || row["description"] || null,
            imageUrl: null,
            isActive: true,
          });
          imported++;
        } catch (err: any) { skipped++; errors.push(`Row ${i + 2}: ${err.message}`); }
      }
      res.json({ imported, skipped, total: rows.length, errors: errors.slice(0, 10) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/services/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteServices(ids);
      res.json({ success: true, deleted: ids.length });
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
        const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const buf = Buffer.from(raw);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=medicines.xlsx");
        res.setHeader("Content-Length", String(buf.length));
        res.send(buf);
      }
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

  app.get("/api/injections", async (_req, res) => {
    try {
      const result = await storage.getInjections();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/injections", async (req, res) => {
    try {
      const data = validateBody(insertInjectionSchema, req.body);
      const injection = await storage.createInjection(data);
      res.status(201).json(injection);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/injections/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        isActive: z.boolean().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional().nullable(),
      });
      const data = validateBody(updateSchema, req.body);
      const updated = await storage.updateInjection(Number(req.params.id), data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/injections/:id", async (req, res) => {
    try {
      await storage.deleteInjection(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Packages
  const packageItemSchema = z.object({
    type: z.enum(["service", "medicine", "injection", "custom"]),
    refId: z.coerce.number().optional(),
    name: z.string(),
    quantity: z.coerce.number().min(1),
    unitPrice: z.coerce.number().min(0),
  });
  app.get("/api/packages", async (_req, res) => {
    try {
      const result = await storage.getPackages();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.get("/api/packages/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid package id" });
      const pkg = await storage.getPackage(id);
      if (!pkg) return res.status(404).json({ message: "Package not found" });
      res.json(pkg);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
  app.post("/api/packages", async (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        items: z.array(packageItemSchema).min(1),
        isActive: z.boolean().optional(),
      });
      const data = validateBody(body, req.body);
      const pkg = await storage.createPackage({
        name: data.name.trim(),
        description: data.description ?? null,
        items: data.items,
        isActive: data.isActive ?? true,
      });
      res.status(201).json(pkg);
    } catch (err: any) {
      const isValidation = err?.name === "ZodError" || (typeof err?.message === "string" && err.message.includes("Invalid"));
      res.status(isValidation ? 400 : 500).json({ message: err?.message ?? "Server error" });
    }
  });
  app.put("/api/packages/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid package id" });
      const body = z.object({
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        items: z.array(packageItemSchema).optional(),
        isActive: z.boolean().optional(),
      });
      const data = validateBody(body, req.body);
      const pkg = await storage.updatePackage(id, data);
      if (!pkg) return res.status(404).json({ message: "Package not found" });
      res.json(pkg);
    } catch (err: any) {
      const isValidation = err?.name === "ZodError" || (typeof err?.message === "string" && err.message.includes("Invalid"));
      res.status(isValidation ? 400 : 500).json({ message: err?.message ?? "Server error" });
    }
  });
  app.delete("/api/packages/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid package id" });
      await storage.deletePackage(id);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Server error" });
    }
  });

  app.get("/api/injections/sample-template", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const sampleRows = [
        { Name: "Paracetamol 1000mg/100ml", Price: "8.00" },
        { Name: "Dexamethasone 4mg/ml", Price: "5.00" },
        { Name: "Vitamin B12 1000mcg", Price: "12.00" },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, "Injections");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=injection_import_template.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/injections/export/:format", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const allInjections = await storage.getInjections();
      const rows = allInjections.map(inj => ({
        Name: inj.name,
        Price: inj.price,
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Injections");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=injections.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const injectionImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/injections/import", injectionImportUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const XLSX = await import("xlsx");
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
        const price = row["Price"] || row["price"];
        if (!name) { skipped++; errors.push(`Row ${i + 2}: Missing name`); continue; }
        try {
          await storage.createInjection({
            name,
            category: "General",
            price: (parseFloat(price) || 0).toString(),
            description: null,
            isActive: true,
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

  app.get("/api/medicines/lookup", async (req, res) => {
    try {
      const code = (req.query.code as string)?.trim();
      if (!code) return res.status(400).json({ message: "Query parameter 'code' is required" });
      const medicine = await storage.getMedicineByCode(code);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      res.json(medicine);
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
    imageUrl: z.string().nullable().optional(),
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

  const medicinePatchSchema = medicineUpdateSchema.extend({
    reason: z.string().nullable().optional(),
    adjustmentType: z.enum(["set", "add", "subtract"]).optional(),
  });

  app.patch("/api/medicines/:id", async (req, res) => {
    try {
      const data = validateBody(medicinePatchSchema, req.body);
      const id = Number(req.params.id);
      const existing = await storage.getMedicine(id);
      if (!existing) return res.status(404).json({ message: "Medicine not found" });
      const { reason, adjustmentType, ...updateData } = data;
      if (data.stockCount !== undefined && typeof data.stockCount === "number") {
        updateData.quantity = data.stockCount;
        await storage.createStockAdjustment({
          medicineId: id,
          previousStock: existing.stockCount ?? 0,
          newStock: data.stockCount,
          adjustmentType: adjustmentType ?? "set",
          reason: reason ?? null,
        });
      }
      const medicine = await storage.updateMedicine(id, updateData);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      res.json(medicine);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/medicines/:id/stock-history", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const medicine = await storage.getMedicine(id);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      const history = await storage.getStockAdjustmentsByMedicineId(id);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

  app.post("/api/medicines/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteMedicines(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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
        const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const buf = Buffer.from(raw);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");
        res.setHeader("Content-Length", String(buf.length));
        res.send(buf);
      }
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

  app.post("/api/expenses/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteExpenses(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

  app.delete("/api/bank-transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBankTransaction(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bank-transactions/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteBankTransactions(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Investors (management)
  app.get("/api/investors", async (_req, res) => {
    try {
      const result = await storage.getInvestors();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/investors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const inv = await storage.getInvestor(id);
      if (!inv) return res.status(404).json({ message: "Investor not found" });
      res.json(inv);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investors", async (req, res) => {
    try {
      const data = validateBody(insertInvestorSchema, req.body);
      const inv = await storage.createInvestor(data);
      res.status(201).json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/investors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = validateBody(z.object({ name: z.string().optional(), email: z.string().nullable().optional(), phone: z.string().nullable().optional(), notes: z.string().nullable().optional(), sharePercentage: z.string().nullable().optional() }), req.body);
      const inv = await storage.updateInvestor(id, data);
      if (!inv) return res.status(404).json({ message: "Investor not found" });
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/investors/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteInvestor(id);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

  app.get("/api/investments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const inv = await storage.getInvestment(id);
      if (!inv) return res.status(404).json({ message: "Investment not found" });
      res.json(inv);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const investmentInvestorSchema = z.object({
    investorId: z.number().optional(),
    name: z.string().min(1, "Investor name is required"),
    sharePercentage: z.number().min(0).max(100),
    amount: z.string(),
  });

  const createInvestmentBodySchema = insertInvestmentSchema.extend({
    investors: z.array(investmentInvestorSchema).optional(),
  });

  function normalizeInvestmentInvestors(
    totalAmount: number,
    investors: { name: string; sharePercentage: number; amount: string }[]
  ): { name: string; sharePercentage: number; amount: string }[] {
    if (investors.length === 0) return [];
    const sum = investors.reduce((s, i) => s + i.sharePercentage, 0);
    const scale = sum > 0 ? 100 / sum : 0;
    return investors.map((i) => {
      const pct = Math.round(i.sharePercentage * scale * 100) / 100;
      const amt = ((totalAmount * pct) / 100).toFixed(2);
      return { name: i.name.trim(), sharePercentage: pct, amount: amt };
    });
  }

  type CreateInvestmentBody = { title: string; category: string; amount: string; returnAmount?: string | null; investorName?: string | null; paymentMethod?: string | null; status?: string; startDate: string; endDate?: string | null; notes?: string | null; investors?: { name: string; sharePercentage: number; amount: string }[] };
  app.post("/api/investments", async (req, res) => {
    try {
      const raw = validateBody(createInvestmentBodySchema, req.body) as CreateInvestmentBody;
      const total = Number(raw.amount) || 0;
      const investorsList = Array.isArray(raw.investors) && raw.investors.length > 0
        ? normalizeInvestmentInvestors(total, raw.investors)
        : [];
      const investorName = investorsList.length === 0
        ? (raw.investorName ?? null)
        : investorsList.map((i) => i.name).join(", ");
      const data = {
        ...raw,
        investorName: (investorName || raw.investorName) ?? null,
        investors: investorsList,
      };
      const inv = await storage.createInvestment(data);
      res.status(201).json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  const investmentUpdateSchema = z.object({
    title: z.string().optional(),
    category: z.string().optional(),
    amount: z.string().optional(),
    returnAmount: z.string().nullable().optional(),
    investorName: z.string().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    investors: z.array(investmentInvestorSchema).optional(),
    status: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

  app.put("/api/investments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const raw = validateBody(investmentUpdateSchema, req.body);
      const total = raw.amount != null ? Number(raw.amount) : undefined;
      const data = { ...raw };
      if (raw.investors && Array.isArray(raw.investors) && raw.investors.length > 0 && total != null) {
        const normalized = normalizeInvestmentInvestors(total, raw.investors);
        data.investors = normalized;
        data.investorName = normalized.map((i) => i.name).join(", ");
      }
      const inv = await storage.updateInvestment(id, data);
      if (!inv) return res.status(404).json({ message: "Investment not found" });
      res.json(inv);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteInvestment(id);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/investments/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteInvestments(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Contributions
  app.get("/api/contributions", async (req, res) => {
    try {
      const investmentId = req.query.investmentId ? Number(req.query.investmentId) : undefined;
      const result = await storage.getContributions(investmentId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/contributions", async (req, res) => {
    try {
      const data = validateBody(insertContributionSchema, req.body);
      const contribution = await storage.createContribution(data);
      res.status(201).json(contribution);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/contributions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updateSchema = z.object({
        investorName: z.string().optional(),
        amount: z.string().optional(),
        date: z.string().optional(),
        category: z.string().nullable().optional(),
        paymentSlip: z.string().nullable().optional(),
        images: z.array(z.string()).nullable().optional(),
        note: z.string().nullable().optional(),
      });
      const data = validateBody(updateSchema, req.body);
      const contribution = await storage.updateContribution(id, data);
      if (!contribution) return res.status(404).json({ message: "Contribution not found" });
      res.json(contribution);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/contributions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updateSchema = z.object({
        investorName: z.string().optional(),
        amount: z.string().optional(),
        date: z.string().optional(),
        category: z.string().nullable().optional(),
        paymentSlip: z.string().nullable().optional(),
        images: z.array(z.string()).nullable().optional(),
        note: z.string().nullable().optional(),
      });
      const data = validateBody(updateSchema, req.body);
      const contribution = await storage.updateContribution(id, data);
      if (!contribution) return res.status(404).json({ message: "Contribution not found" });
      res.json(contribution);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/contributions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteContribution(id);
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/contributions/upload-slip", paymentSlipUpload.single('slip'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const slipUrl = `/uploads/payment-slips/${req.file.filename}`;
    res.json({ url: slipUrl });
  });

  app.use("/uploads/payment-slips", express.static(paymentSlipDir));

  app.get("/api/contributions/export/xlsx", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const allContributions = await storage.getContributions();
      const allInvestments = await storage.getInvestments();
      const rows = allContributions.map(c => {
        const inv = allInvestments.find(i => i.id === c.investmentId);
        return {
          Date: c.date,
          Investment: inv?.title || `#${c.investmentId}`,
          Investor: c.investorName,
          Category: c.category || "",
          Amount: c.amount,
          Note: c.note || "",
        };
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Contributions");
      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=contributions.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/contributions/sample-template", async (_req, res) => {
    try {
      const XLSX = await import("xlsx");
      const allInvestments = await storage.getInvestments();
      const allInvestorNames = new Set<string>();
      allInvestments.forEach(inv => {
        if (inv.investors && Array.isArray(inv.investors)) {
          (inv.investors as any[]).forEach(i => { if (i.name) allInvestorNames.add(i.name); });
        }
      });

      const wb = XLSX.utils.book_new();

      const sampleRows = [
        { Date: "2026-02-14", Investment: allInvestments[0]?.title || "Investment Name", Investor: Array.from(allInvestorNames)[0] || "Investor Name", Category: "Advance Deposit", Amount: "5000.00", Note: "Monthly contribution" },
        { Date: "2026-02-13", Investment: allInvestments[0]?.title || "Investment Name", Investor: Array.from(allInvestorNames)[1] || "Investor 2", Category: "Equipment", Amount: "3000.00", Note: "Equipment purchase" },
        { Date: "2026-02-12", Investment: allInvestments[0]?.title || "Investment Name", Investor: Array.from(allInvestorNames)[0] || "Investor Name", Category: "Other", Amount: "1500.00", Note: "" },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleRows);
      XLSX.utils.book_append_sheet(wb, ws, "Import Template");

      Array.from(allInvestorNames).forEach(name => {
        const investorContributions = sampleRows.filter(r => r.Investor === name);
        if (investorContributions.length > 0) {
          const iws = XLSX.utils.json_to_sheet(investorContributions);
          const sheetName = name.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, iws, sheetName);
        }
      });

      const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const buf = Buffer.from(raw);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=contribution_import_template.xlsx");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/contributions/import", excelUpload.single('file'), async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const wb = XLSX.read(req.file.buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const allInvestments = await storage.getInvestments();
      let imported = 0;
      for (const row of rows) {
        const invTitle = row["Investment"] || row["investment"];
        const inv = allInvestments.find(i => i.title?.toLowerCase() === invTitle?.toLowerCase());
        if (!inv) continue;
        await storage.createContribution({
          investmentId: inv.id,
          investorName: row["Investor"] || row["investor"] || "",
          amount: String(row["Amount"] || row["amount"] || "0"),
          date: row["Date"] || row["date"] || new Date().toISOString().split("T")[0],
          category: row["Category"] || row["category"] || null,
          paymentSlip: null,
          images: null,
          note: row["Note"] || row["note"] || null,
        });
        imported++;
      }
      res.json({ message: `Successfully imported ${imported} contributions`, count: imported });
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
      await storage.createActivityLog({ action: "create", module: "users", description: `User "${user.fullName}" created`, userName: "System" });
      res.status(201).json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updateSchema = z.object({ isActive: z.boolean().optional(), roleId: z.number().nullable().optional(), fullName: z.string().optional(), email: z.string().nullable().optional(), phone: z.string().nullable().optional() });
      const data = validateBody(updateSchema, req.body);
      const user = await storage.updateUser(Number(req.params.id), data);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.createActivityLog({ action: "update", module: "users", description: `User "${user.fullName}" updated`, userName: "System" });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      await storage.deleteUser(Number(req.params.id));
      await storage.createActivityLog({ action: "delete", module: "users", description: `User "${user?.fullName || req.params.id}" deleted`, userName: "System" });
      res.json({ success: true });
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
      await storage.createActivityLog({ action: "create", module: "roles", description: `Role "${role.name}" created`, userName: "System" });
      res.status(201).json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.updateRole(Number(req.params.id), req.body);
      if (!role) return res.status(404).json({ message: "Role not found" });
      await storage.createActivityLog({ action: "update", module: "roles", description: `Role "${role.name}" updated`, userName: "System" });
      res.json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/roles/:id", async (req, res) => {
    try {
      const role = await storage.getRole(Number(req.params.id));
      await storage.deleteRole(Number(req.params.id));
      await storage.createActivityLog({ action: "delete", module: "roles", description: `Role "${role?.name || req.params.id}" deleted`, userName: "System" });
      res.json({ success: true });
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

  app.use("/uploads/logos", express.static(logoUploadsDir));

  app.post("/api/settings/upload-logo", logoUpload.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const current = await storage.getSettings();
      if (current?.logo) {
        const oldPath = path.join(logoUploadsDir, path.basename(current.logo));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const settings = await storage.upsertSettings({ ...current, logo: logoUrl });
      await storage.createActivityLog({
        action: "update",
        module: "settings",
        description: "Clinic logo updated",
        userName: "System",
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/settings/logo", async (_req, res) => {
    try {
      const current = await storage.getSettings();
      if (current?.logo) {
        const oldPath = path.join(logoUploadsDir, path.basename(current.logo));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const settings = await storage.upsertSettings({ ...current, logo: null });
      await storage.createActivityLog({
        action: "update",
        module: "settings",
        description: "Clinic logo removed",
        userName: "System",
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const current = await storage.getSettings();
      const existing = current ? { ...current, id: undefined } : {};
      const merged = { ...existing, ...req.body };
      delete (merged as any).id;
      const data = validateBody(insertClinicSettingsSchema, merged);
      const settings = await storage.upsertSettings(data);
      await storage.createActivityLog({
        action: "update",
        module: "settings",
        description: "Settings updated",
        userName: "System",
      });
      res.json(settings);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Activity Logs
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/activity-logs", async (req, res) => {
    try {
      const log = await storage.createActivityLog(req.body);
      res.status(201).json(log);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/activity-logs", async (_req, res) => {
    try {
      await storage.clearActivityLogs();
      res.json({ success: true });
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

  app.post("/api/lab-tests/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteLabTests(ids);
      res.json({ success: true, deleted: ids.length });
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

  app.post("/api/appointments/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteAppointments(ids);
      res.json({ success: true, deleted: ids.length });
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

  // Unmatched /api routes -> 404 JSON (avoid SPA fallback)
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return httpServer;
}
