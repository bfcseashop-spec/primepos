import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  permissions: jsonb("permissions").notNull().default({}),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true } as any);
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true } as any);
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

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true } as any);
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
  isLabTest: boolean("is_lab_test").notNull().default(false),
  sampleCollectionRequired: boolean("sample_collection_required").notNull().default(false),
  sampleType: text("sample_type"),
  reportParameters: jsonb("report_parameters").$type<Array<{ parameter: string; unit: string; normalRange: string; resultType?: "manual" | "dropdown"; dropdownItems?: string[] }>>(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true } as any);
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const injections = pgTable("injections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertInjectionSchema = createInsertSchema(injections).omit({ id: true } as any);
export type InsertInjection = z.infer<typeof insertInjectionSchema>;
export type Injection = typeof injections.$inferSelect;

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
  totalStock: integer("total_stock").notNull().default(0),
  stockAlert: integer("stock_alert").notNull().default(10),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true } as any);
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

export const stockAdjustments = pgTable("stock_adjustments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  medicineId: integer("medicine_id").references(() => medicines.id).notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  adjustmentType: text("adjustment_type").notNull(), // "set" | "add" | "subtract"
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockAdjustmentSchema = createInsertSchema(stockAdjustments).omit({ id: true, createdAt: true } as any);
export type InsertStockAdjustment = z.infer<typeof insertStockAdjustmentSchema>;
export type StockAdjustment = typeof stockAdjustments.$inferSelect;

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

export const insertOpdVisitSchema = createInsertSchema(opdVisits).omit({ id: true, visitDate: true } as any);
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

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true } as any);
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

export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true } as any);
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
  status: text("status").default("pending"),
  approvedBy: text("approved_by"),
  receiptUrl: text("receipt_url"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true } as any);
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

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true } as any);
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;

export const investors = pgTable("investors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  sharePercentage: numeric("share_percentage", { precision: 5, scale: 2 }).default("100"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestorSchema = createInsertSchema(investors).omit({ id: true, createdAt: true } as any);
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investors.$inferSelect;

export type InvestmentInvestor = { investorId?: number; name: string; sharePercentage: number; amount: string };

export const investments = pgTable("investments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  returnAmount: numeric("return_amount", { precision: 10, scale: 2 }).default("0"),
  investorName: text("investor_name"),
  investors: jsonb("investors").$type<InvestmentInvestor[]>().default([]),
  paymentMethod: text("payment_method").default("cash"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  notes: text("notes"),
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({ id: true } as any);
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export const contributions = pgTable("contributions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  investmentId: integer("investment_id").references(() => investments.id).notNull(),
  investorName: text("investor_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  category: text("category"),
  paymentSlip: text("payment_slip"),
  images: text("images").array(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContributionSchema = createInsertSchema(contributions).omit({ id: true, createdAt: true } as any);
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributions.$inferSelect;

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

export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, lastConnected: true } as any);
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
  secondaryCurrency: text("secondary_currency"),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 4 }).default("1"),
  currencyDisplay: text("currency_display").default("symbol"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  timezone: text("timezone").default("UTC"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  visitPrefix: text("visit_prefix").default("VIS"),
  patientPrefix: text("patient_prefix").default("PAT"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyWebsite: text("company_website"),
  companyTaxId: text("company_tax_id"),
  receiptFooter: text("receipt_footer"),
  receiptLogo: text("receipt_logo"),
  appName: text("app_name").default("ClinicPOS"),
  appTagline: text("app_tagline"),
  appVersion: text("app_version").default("1.0.0"),
});

export const insertClinicSettingsSchema = createInsertSchema(clinicSettings).omit({ id: true } as any);
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
  serviceId: integer("service_id").references(() => services.id),
  billId: integer("bill_id").references(() => bills.id),
  sampleCollectionRequired: boolean("sample_collection_required").notNull().default(false),
  reportFileUrl: text("report_file_url"),
  reportFileName: text("report_file_name"),
  reportResults: jsonb("report_results").$type<Array<{ parameter: string; result: string; unit: string; normalRange: string }>>(),
  referrerName: text("referrer_name"),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sampleCollections = pgTable("sample_collections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  labTestId: integer("lab_test_id").references(() => labTests.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  billId: integer("bill_id").references(() => bills.id),
  testName: text("test_name").notNull(),
  sampleType: text("sample_type").notNull(),
  status: text("status").notNull().default("pending"),
  collectedAt: timestamp("collected_at"),
  collectedBy: text("collected_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSampleCollectionSchema = createInsertSchema(sampleCollections).omit({ id: true, createdAt: true } as any);
export type InsertSampleCollection = z.infer<typeof insertSampleCollectionSchema>;
export type SampleCollection = typeof sampleCollections.$inferSelect;

export const insertLabTestSchema = createInsertSchema(labTests).omit({ id: true, createdAt: true } as any);
export type InsertLabTest = z.infer<typeof insertLabTestSchema>;
export type LabTest = typeof labTests.$inferSelect;

export const doctors = pgTable("doctors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  doctorId: text("doctor_id").notNull().unique(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  department: text("department"),
  experience: text("experience"),
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

export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true } as any);
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

export const salaries = pgTable("salaries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffId: integer("staff_id"),
  staffName: text("staff_name").notNull(),
  role: text("role"),
  department: text("department"),
  category: text("category"),
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

export const insertSalarySchema = createInsertSchema(salaries).omit({ id: true, createdAt: true } as any);
export type InsertSalary = z.infer<typeof insertSalarySchema>;
export type Salary = typeof salaries.$inferSelect;

export const salaryProfiles = pgTable("salary_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staffName: text("staff_name").notNull(),
  staffId: text("staff_id"),
  department: text("department"),
  category: text("category"),
  role: text("role"),
  baseSalary: numeric("base_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  housingAllowance: numeric("housing_allowance", { precision: 10, scale: 2 }).default("0"),
  transportAllowance: numeric("transport_allowance", { precision: 10, scale: 2 }).default("0"),
  mealAllowance: numeric("meal_allowance", { precision: 10, scale: 2 }).default("0"),
  otherAllowance: numeric("other_allowance", { precision: 10, scale: 2 }).default("0"),
  phone: text("phone"),
  email: text("email"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  joinDate: text("join_date"),
  profileImage: text("profile_image"),
  paymentSlip: text("payment_slip"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalaryProfileSchema = createInsertSchema(salaryProfiles).omit({ id: true, createdAt: true } as any);
export type InsertSalaryProfile = z.infer<typeof insertSalaryProfileSchema>;
export type SalaryProfile = typeof salaryProfiles.$inferSelect;

export const salaryLoans = pgTable("salary_loans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  profileId: integer("profile_id").references(() => salaryProfiles.id),
  staffName: text("staff_name").notNull(),
  type: text("type").notNull().default("loan"),
  principal: numeric("principal", { precision: 10, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).default("0"),
  termMonths: integer("term_months").notNull().default(1),
  installmentAmount: numeric("installment_amount", { precision: 10, scale: 2 }).notNull(),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }).default("0"),
  outstanding: numeric("outstanding", { precision: 10, scale: 2 }).notNull(),
  startDate: text("start_date").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalaryLoanSchema = createInsertSchema(salaryLoans).omit({ id: true, createdAt: true } as any);
export type InsertSalaryLoan = z.infer<typeof insertSalaryLoanSchema>;
export type SalaryLoan = typeof salaryLoans.$inferSelect;

export const loanInstallments = pgTable("loan_installments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  loanId: integer("loan_id").references(() => salaryLoans.id),
  dueDate: text("due_date").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("due"),
  paidDate: text("paid_date"),
});

export const insertLoanInstallmentSchema = createInsertSchema(loanInstallments).omit({ id: true } as any);
export type InsertLoanInstallment = z.infer<typeof insertLoanInstallmentSchema>;
export type LoanInstallment = typeof loanInstallments.$inferSelect;

export const payrollRuns = pgTable("payroll_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  month: text("month").notNull(),
  year: text("year").notNull(),
  runDate: text("run_date").notNull(),
  totalGross: numeric("total_gross", { precision: 12, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 12, scale: 2 }).default("0"),
  employeeCount: integer("employee_count").default(0),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({ id: true, createdAt: true } as any);
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;
export type PayrollRun = typeof payrollRuns.$inferSelect;

export const payslips = pgTable("payslips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payrollRunId: integer("payroll_run_id").references(() => payrollRuns.id),
  profileId: integer("profile_id").references(() => salaryProfiles.id),
  staffName: text("staff_name").notNull(),
  department: text("department"),
  baseSalary: numeric("base_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 10, scale: 2 }).default("0"),
  loanDeductions: numeric("loan_deductions", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: numeric("other_deductions", { precision: 10, scale: 2 }).default("0"),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("bank_transfer"),
  status: text("status").notNull().default("pending"),
  paidDate: text("paid_date"),
  notes: text("notes"),
});

export const insertPayslipSchema = createInsertSchema(payslips).omit({ id: true } as any);
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslips.$inferSelect;

export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id"),
  userName: text("user_name"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true } as any);
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type BillItem = {
  name: string;
  type: "service" | "medicine" | "injection" | "custom";
  quantity: number;
  unitPrice: number;
  total: number;
  medicineId?: number;
  serviceId?: number;
  packageId?: number;
  packageName?: string;
};

/** Item inside a package: service, medicine, injection, or custom (name + price only). */
export type PackageItem = {
  type: "service" | "medicine" | "injection" | "custom";
  refId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

export const packages = pgTable("packages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  items: jsonb("items").$type<PackageItem[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPackageSchema = createInsertSchema(packages).omit({ id: true, createdAt: true } as any);
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;

export const medicinePurchases = pgTable("medicine_purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseNo: text("purchase_no").notNull(),
  medicineId: integer("medicine_id").references(() => medicines.id),
  medicineName: text("medicine_name").notNull(),
  supplier: text("supplier"),
  quantity: integer("quantity").notNull().default(0),
  unitType: text("unit_type").notNull().default("Pcs"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull().default("0"),
  batchNo: text("batch_no"),
  expiryDate: date("expiry_date"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  purchaseDate: date("purchase_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicinePurchaseSchema = createInsertSchema(medicinePurchases).omit({ id: true, createdAt: true } as any);
export type InsertMedicinePurchase = z.infer<typeof insertMedicinePurchaseSchema>;
export type MedicinePurchase = typeof medicinePurchases.$inferSelect;

export const permissionModules = [
  "dashboard", "opd", "billing", "services", "medicines",
  "expenses", "bank", "investments", "staff", "integrations", "settings", "reports"
] as const;

export type PermissionModule = typeof permissionModules[number];
export type Permissions = Record<PermissionModule, { read: boolean; write: boolean; delete: boolean }>;
