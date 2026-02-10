import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").notNull().default({}),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  roleId: integer("role_id").references(() => roles.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const patients = pgTable("patients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  patientId: text("patient_id").notNull().unique(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  age: integer("age"),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  bloodGroup: text("blood_group"),
  dateOfBirth: text("date_of_birth"),
  patientType: text("patient_type").default("Out Patient"),
  photoUrl: text("photo_url"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  medicalHistory: text("medical_history"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const services = pgTable("services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const medicines = pgTable("medicines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  category: text("category"),
  manufacturer: text("manufacturer"),
  batchNo: text("batch_no"),
  expiryDate: date("expiry_date"),
  unit: text("unit").notNull().default("Box"),
  unitCount: integer("unit_count").notNull().default(1),
  boxPrice: numeric("box_price", { precision: 10, scale: 2 }).notNull().default("0"),
  qtyPerBox: integer("qty_per_box").notNull().default(1),
  perMedPrice: numeric("per_med_price", { precision: 10, scale: 4 }).notNull().default("0"),
  totalPurchasePrice: numeric("total_purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPriceLocal: numeric("selling_price_local", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPriceForeigner: numeric("selling_price_foreigner", { precision: 10, scale: 2 }).notNull().default("0"),
  stockCount: integer("stock_count").notNull().default(0),
  stockAlert: integer("stock_alert").notNull().default(10),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

export const opdVisits = pgTable("opd_visits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  visitId: text("visit_id").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorName: text("doctor_name"),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  prescription: text("prescription"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  visitDate: timestamp("visit_date").defaultNow(),
});

export const insertOpdVisitSchema = createInsertSchema(opdVisits).omit({ id: true, visitDate: true });
export type InsertOpdVisit = z.infer<typeof insertOpdVisitSchema>;
export type OpdVisit = typeof opdVisits.$inferSelect;

export const appointments = pgTable("appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  patientType: text("patient_type").default("Out Patient"),
  department: text("department"),
  doctorName: text("doctor_name"),
  consultationMode: text("consultation_mode"),
  appointmentDate: text("appointment_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason"),
  notes: text("notes"),
  paymentMode: text("payment_mode"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const bills = pgTable("bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  billNo: text("bill_no").notNull().unique(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  visitId: integer("visit_id").references(() => opdVisits.id),
  items: jsonb("items").notNull().default([]),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  discountType: text("discount_type").default("amount"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").default("cash"),
  referenceDoctor: text("reference_doctor"),
  paymentDate: date("payment_date"),
  status: text("status").notNull().default("unpaid"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"),
  date: date("date").notNull(),
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const bankTransactions = pgTable("bank_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNo: text("account_no"),
  referenceNo: text("reference_no"),
  description: text("description"),
  date: date("date").notNull(),
});

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true });
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

export const investments = pgTable("investments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  returnAmount: numeric("return_amount", { precision: 10, scale: 2 }).default("0"),
  investorName: text("investor_name"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({ id: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export const integrations = pgTable("integrations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(),
  connectionType: text("connection_type").notNull(),
  port: text("port"),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("disconnected"),
  lastConnected: timestamp("last_connected"),
  config: jsonb("config").default({}),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, lastConnected: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

export const clinicSettings = pgTable("clinic_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clinicName: text("clinic_name").notNull().default("My Clinic"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logo: text("logo"),
  currency: text("currency").default("USD"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  visitPrefix: text("visit_prefix").default("VIS"),
  patientPrefix: text("patient_prefix").default("PAT"),
});

export const insertClinicSettingsSchema = createInsertSchema(clinicSettings).omit({ id: true });
export type InsertClinicSettings = z.infer<typeof insertClinicSettingsSchema>;
export type ClinicSettings = typeof clinicSettings.$inferSelect;

export const labTests = pgTable("lab_tests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  testCode: text("test_code").notNull().unique(),
  testName: text("test_name").notNull(),
  category: text("category").notNull(),
  sampleType: text("sample_type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  turnaroundTime: text("turnaround_time"),
  patientId: integer("patient_id").references(() => patients.id),
  reportFileUrl: text("report_file_url"),
  reportFileName: text("report_file_name"),
  referrerName: text("referrer_name"),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLabTestSchema = createInsertSchema(labTests).omit({ id: true, createdAt: true });
export type InsertLabTest = z.infer<typeof insertLabTestSchema>;
export type LabTest = typeof labTests.$inferSelect;

export const doctors = pgTable("doctors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: text("doctor_id").notNull().unique(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  qualification: text("qualification"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }).default("0"),
  schedule: text("schedule"),
  status: text("status").notNull().default("active"),
  joiningDate: text("joining_date"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

export const salaries = pgTable("salaries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffId: integer("staff_id"),
  staffName: text("staff_name").notNull(),
  role: text("role"),
  department: text("department"),
  baseSalary: numeric("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 10, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }).default("0"),
  netSalary: numeric("net_salary", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("bank_transfer"),
  paymentDate: text("payment_date").notNull(),
  month: text("month").notNull(),
  year: text("year").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalarySchema = createInsertSchema(salaries).omit({ id: true, createdAt: true });
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;

export type BillItem = {
  name: string;
  type: "service" | "medicine";
  quantity: number;
  unitPrice: number;
  total: number;
};

export const permissionModules = [
  "dashboard", "opd", "billing", "services", "medicines",
  "expenses", "bank", "investments", "staff", "integrations", "settings", "reports"
] as const;

export type PermissionModule = typeof permissionModules[number];
export type Permissions = Record<PermissionModule, { read: boolean; write: boolean; delete: boolean }>;
