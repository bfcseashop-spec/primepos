import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPatientSchema, insertOpdVisitSchema, insertBillSchema,
  insertServiceSchema, insertMedicineSchema, insertExpenseSchema,
  insertBankTransactionSchema, insertInvestmentSchema,
  insertUserSchema, insertRoleSchema, insertIntegrationSchema,
  insertClinicSettingsSchema, insertLabTestSchema, insertAppointmentSchema,
  insertDoctorSchema, insertSalarySchema
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
