import { eq, desc, sql, and, gte, lte, count, sum, inArray, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  users, roles, patients, services, injections, medicines, opdVisits, bills,
  expenses, bankTransactions, investors, investments, integrations, clinicSettings, labTests, appointments,
  doctors, salaries, activityLogs,
  salaryProfiles, salaryLoans, loanInstallments, payrollRuns, payslips,
  type InsertUser, type User, type InsertRole, type Role,
  type InsertPatient, type Patient, type InsertService, type Service,
  type InsertInjection, type Injection,
  type InsertMedicine, type Medicine,
  stockAdjustments, type InsertStockAdjustment, type StockAdjustment,
  type InsertOpdVisit, type OpdVisit,
  type InsertBill, type Bill, type InsertExpense, type Expense,
  type InsertBankTransaction, type BankTransaction,
  type InsertInvestor, type Investor,
  type InsertInvestment, type Investment,
  contributions, type InsertContribution, type Contribution,
  type InsertIntegration, type Integration,
  type InsertClinicSettings, type ClinicSettings,
  type InsertLabTest, type LabTest,
  type InsertAppointment, type Appointment,
  type InsertDoctor, type Doctor,
  type InsertSalary, type Salary,
  type InsertSalaryProfile, type SalaryProfile,
  type InsertSalaryLoan, type SalaryLoan,
  type InsertLoanInstallment, type LoanInstallment,
  type InsertPayrollRun, type PayrollRun,
  type InsertPayslip, type Payslip,
  type InsertActivityLog, type ActivityLog,
  packages, type InsertPackage, type Package,
} from "@shared/schema";

export interface IStorage {
  getUsers(): Promise<any[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<void>;

  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  bulkDeleteServices(ids: number[]): Promise<void>;

  getInjections(): Promise<Injection[]>;
  getInjection(id: number): Promise<Injection | undefined>;
  createInjection(injection: InsertInjection): Promise<Injection>;
  updateInjection(id: number, data: Partial<InsertInjection>): Promise<Injection | undefined>;
  deleteInjection(id: number): Promise<void>;

  getMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  getMedicineByCode(code: string): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, data: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: number): Promise<void>;
  bulkDeleteMedicines(ids: number[]): Promise<void>;
  createStockAdjustment(adjustment: InsertStockAdjustment): Promise<StockAdjustment>;
  getStockAdjustmentsByMedicineId(medicineId: number): Promise<StockAdjustment[]>;

  getPackages(): Promise<Package[]>;
  getPackage(id: number): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: number, data: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: number): Promise<void>;

  getOpdVisits(): Promise<any[]>;
  getOpdVisit(id: number): Promise<OpdVisit | undefined>;
  createOpdVisit(visit: InsertOpdVisit): Promise<OpdVisit>;
  updateOpdVisit(id: number, data: Partial<InsertOpdVisit>): Promise<OpdVisit | undefined>;

  getBills(): Promise<any[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<void>;
  bulkDeleteBills(ids: number[]): Promise<void>;

  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  bulkDeleteExpenses(ids: number[]): Promise<void>;

  getBankTransactions(): Promise<BankTransaction[]>;
  createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction>;
  deleteBankTransaction(id: number): Promise<void>;
  bulkDeleteBankTransactions(ids: number[]): Promise<void>;

  getInvestors(): Promise<Investor[]>;
  getInvestor(id: number): Promise<Investor | undefined>;
  createInvestor(inv: InsertInvestor): Promise<Investor>;
  updateInvestor(id: number, data: Partial<InsertInvestor>): Promise<Investor | undefined>;
  deleteInvestor(id: number): Promise<void>;

  getInvestments(): Promise<Investment[]>;
  getInvestment(id: number): Promise<Investment | undefined>;
  createInvestment(inv: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, data: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<void>;
  bulkDeleteInvestments(ids: number[]): Promise<void>;

  getContributions(investmentId?: number): Promise<Contribution[]>;
  createContribution(data: InsertContribution): Promise<Contribution>;
  updateContribution(id: number, data: Partial<InsertContribution>): Promise<Contribution | undefined>;
  deleteContribution(id: number): Promise<void>;

  getIntegrations(): Promise<Integration[]>;
  createIntegration(int: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, data: Partial<InsertIntegration>): Promise<Integration | undefined>;

  getSettings(): Promise<ClinicSettings | undefined>;
  upsertSettings(settings: InsertClinicSettings): Promise<ClinicSettings>;

  getLabTests(): Promise<any[]>;
  getLabTest(id: number): Promise<LabTest | undefined>;
  createLabTest(test: InsertLabTest): Promise<LabTest>;
  updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined>;
  deleteLabTest(id: number): Promise<void>;
  bulkDeleteLabTests(ids: number[]): Promise<void>;
  getNextLabTestCode(): Promise<string>;

  getAppointments(): Promise<any[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<void>;
  bulkDeleteAppointments(ids: number[]): Promise<void>;

  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: number): Promise<void>;
  getNextDoctorId(): Promise<string>;

  getSalaries(): Promise<Salary[]>;
  getSalary(id: number): Promise<Salary | undefined>;
  createSalary(salary: InsertSalary): Promise<Salary>;
  updateSalary(id: number, data: Partial<InsertSalary>): Promise<Salary | undefined>;
  deleteSalary(id: number): Promise<void>;

  getSalaryProfiles(): Promise<SalaryProfile[]>;
  getSalaryProfile(id: number): Promise<SalaryProfile | undefined>;
  createSalaryProfile(profile: InsertSalaryProfile): Promise<SalaryProfile>;
  updateSalaryProfile(id: number, data: Partial<InsertSalaryProfile>): Promise<SalaryProfile | undefined>;
  deleteSalaryProfile(id: number): Promise<void>;

  getSalaryLoans(): Promise<SalaryLoan[]>;
  getSalaryLoan(id: number): Promise<SalaryLoan | undefined>;
  createSalaryLoan(loan: InsertSalaryLoan): Promise<SalaryLoan>;
  updateSalaryLoan(id: number, data: Partial<InsertSalaryLoan>): Promise<SalaryLoan | undefined>;
  deleteSalaryLoan(id: number): Promise<void>;

  getLoanInstallments(loanId: number): Promise<LoanInstallment[]>;
  createLoanInstallment(installment: InsertLoanInstallment): Promise<LoanInstallment>;
  updateLoanInstallment(id: number, data: Partial<InsertLoanInstallment>): Promise<LoanInstallment | undefined>;

  getPayrollRuns(): Promise<PayrollRun[]>;
  getPayrollRun(id: number): Promise<PayrollRun | undefined>;
  createPayrollRun(run: InsertPayrollRun): Promise<PayrollRun>;
  updatePayrollRun(id: number, data: Partial<InsertPayrollRun>): Promise<PayrollRun | undefined>;
  deletePayrollRun(id: number): Promise<void>;

  getPayslips(payrollRunId: number): Promise<Payslip[]>;
  createPayslip(payslip: InsertPayslip): Promise<Payslip>;
  updatePayslip(id: number, data: Partial<InsertPayslip>): Promise<Payslip | undefined>;

  getUserByUsername(username: string): Promise<User | undefined>;
  changePassword(id: number, newPassword: string): Promise<void>;

  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  clearActivityLogs(): Promise<void>;

  getDashboardStats(): Promise<any>;
  getRecentVisits(): Promise<any[]>;
  getRevenueChart(): Promise<any[]>;
  getServiceBreakdown(): Promise<any[]>;
  getReportSummary(): Promise<any>;
  getMonthlyRevenue(): Promise<any[]>;
  getExpensesByCategory(): Promise<any[]>;
  getTopServices(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<any[]> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      roleId: users.roleId,
      isActive: users.isActive,
      createdAt: users.createdAt,
      roleName: roles.name,
    }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).orderBy(desc(users.createdAt));
    return result;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user as typeof users.$inferInsert).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role as typeof roles.$inferInsert).returning();
    return created;
  }

  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return updated;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient as typeof patients.$inferInsert).returning();
    return created;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db.update(patients).set(patient).where(eq(patients.id, id)).returning();
    return updated;
  }

  async deletePatient(id: number): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service as typeof services.$inferInsert).returning();
    return created;
  }

  async updateService(id: number, data: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async bulkDeleteServices(ids: number[]): Promise<void> {
    await db.delete(services).where(inArray(services.id, ids));
  }

  async getInjections(): Promise<Injection[]> {
    return db.select().from(injections).orderBy(injections.name);
  }

  async getInjection(id: number): Promise<Injection | undefined> {
    const [injection] = await db.select().from(injections).where(eq(injections.id, id));
    return injection;
  }

  async createInjection(injection: InsertInjection): Promise<Injection> {
    const [created] = await db.insert(injections).values(injection as typeof injections.$inferInsert).returning();
    return created;
  }

  async updateInjection(id: number, data: Partial<InsertInjection>): Promise<Injection | undefined> {
    const [updated] = await db.update(injections).set(data).where(eq(injections.id, id)).returning();
    return updated;
  }

  async deleteInjection(id: number): Promise<void> {
    await db.delete(injections).where(eq(injections.id, id));
  }

  async getMedicines(): Promise<Medicine[]> {
    return db.select().from(medicines).orderBy(medicines.name);
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const [med] = await db.select().from(medicines).where(eq(medicines.id, id));
    return med;
  }

  /** Find medicine by barcode-like code: MED-{id}, numeric id, or batchNo (case-insensitive). */
  async getMedicineByCode(code: string): Promise<Medicine | undefined> {
    const trimmed = (code || "").trim();
    if (!trimmed) return undefined;
    const medIdMatch = trimmed.match(/^MED-(\d+)$/i);
    if (medIdMatch) {
      return this.getMedicine(parseInt(medIdMatch[1], 10));
    }
    const asNum = parseInt(trimmed, 10);
    if (!isNaN(asNum) && String(asNum) === trimmed) {
      return this.getMedicine(asNum);
    }
    const [byBatch] = await db.select().from(medicines).where(ilike(medicines.batchNo, trimmed)).limit(1);
    if (byBatch) return byBatch;
    const [byBatchContains] = await db.select().from(medicines).where(ilike(medicines.batchNo, "%" + trimmed + "%")).limit(1);
    return byBatchContains;
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const [created] = await db.insert(medicines).values(medicine as typeof medicines.$inferInsert).returning();
    return created;
  }

  async updateMedicine(id: number, data: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const [updated] = await db.update(medicines).set(data).where(eq(medicines.id, id)).returning();
    return updated;
  }

  async deleteMedicine(id: number): Promise<void> {
    await db.delete(medicines).where(eq(medicines.id, id));
  }

  async bulkDeleteMedicines(ids: number[]): Promise<void> {
    await db.delete(medicines).where(inArray(medicines.id, ids));
  }

  async createStockAdjustment(adjustment: InsertStockAdjustment): Promise<StockAdjustment> {
    const [created] = await db.insert(stockAdjustments).values(adjustment as typeof stockAdjustments.$inferInsert).returning();
    return created;
  }

  async getStockAdjustmentsByMedicineId(medicineId: number): Promise<StockAdjustment[]> {
    return db.select().from(stockAdjustments).where(eq(stockAdjustments.medicineId, medicineId)).orderBy(desc(stockAdjustments.createdAt));
  }

  async getPackages(): Promise<Package[]> {
    return db.select().from(packages).orderBy(packages.name);
  }

  async getPackage(id: number): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg;
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [created] = await db.insert(packages).values(pkg as typeof packages.$inferInsert).returning();
    return created;
  }

  async updatePackage(id: number, data: Partial<InsertPackage>): Promise<Package | undefined> {
    const [updated] = await db.update(packages).set(data).where(eq(packages.id, id)).returning();
    return updated;
  }

  async deletePackage(id: number): Promise<void> {
    await db.delete(packages).where(eq(packages.id, id));
  }

  async getOpdVisits(): Promise<any[]> {
    const result = await db.select({
      id: opdVisits.id,
      visitId: opdVisits.visitId,
      patientId: opdVisits.patientId,
      doctorName: opdVisits.doctorName,
      symptoms: opdVisits.symptoms,
      diagnosis: opdVisits.diagnosis,
      prescription: opdVisits.prescription,
      notes: opdVisits.notes,
      status: opdVisits.status,
      visitDate: opdVisits.visitDate,
      patientName: patients.name,
    }).from(opdVisits).leftJoin(patients, eq(opdVisits.patientId, patients.id)).orderBy(desc(opdVisits.visitDate));
    return result;
  }

  async getOpdVisit(id: number): Promise<OpdVisit | undefined> {
    const [visit] = await db.select().from(opdVisits).where(eq(opdVisits.id, id));
    return visit;
  }

  async createOpdVisit(visit: InsertOpdVisit): Promise<OpdVisit> {
    const [created] = await db.insert(opdVisits).values(visit as typeof opdVisits.$inferInsert).returning();
    return created;
  }

  async updateOpdVisit(id: number, data: Partial<InsertOpdVisit>): Promise<OpdVisit | undefined> {
    const [updated] = await db.update(opdVisits).set(data).where(eq(opdVisits.id, id)).returning();
    return updated;
  }

  async getBills(): Promise<any[]> {
    const result = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      patientId: bills.patientId,
      visitId: bills.visitId,
      items: bills.items,
      subtotal: bills.subtotal,
      discount: bills.discount,
      tax: bills.tax,
      total: bills.total,
      paidAmount: bills.paidAmount,
      paymentMethod: bills.paymentMethod,
      referenceDoctor: bills.referenceDoctor,
      paymentDate: bills.paymentDate,
      discountType: bills.discountType,
      status: bills.status,
      createdAt: bills.createdAt,
      patientName: patients.name,
    }).from(bills).leftJoin(patients, eq(bills.patientId, patients.id)).orderBy(desc(bills.createdAt));
    return result;
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [created] = await db.insert(bills).values(bill as typeof bills.$inferInsert).returning();
    return created;
  }

  async updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updated] = await db.update(bills).set(data).where(eq(bills.id, id)).returning();
    return updated;
  }

  async deleteBill(id: number): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async bulkDeleteBills(ids: number[]): Promise<void> {
    await db.delete(bills).where(inArray(bills.id, ids));
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense as typeof expenses.$inferInsert).returning();
    return created;
  }

  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async bulkDeleteExpenses(ids: number[]): Promise<void> {
    await db.delete(expenses).where(inArray(expenses.id, ids));
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return db.select().from(bankTransactions).orderBy(desc(bankTransactions.date));
  }

  async createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction> {
    const [created] = await db.insert(bankTransactions).values(tx as typeof bankTransactions.$inferInsert).returning();
    return created;
  }

  async deleteBankTransaction(id: number): Promise<void> {
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
  }

  async bulkDeleteBankTransactions(ids: number[]): Promise<void> {
    await db.delete(bankTransactions).where(inArray(bankTransactions.id, ids));
  }

  async getInvestors(): Promise<Investor[]> {
    return db.select().from(investors).orderBy(investors.name);
  }

  async getInvestor(id: number): Promise<Investor | undefined> {
    const [row] = await db.select().from(investors).where(eq(investors.id, id));
    return row;
  }

  async createInvestor(inv: InsertInvestor): Promise<Investor> {
    const [created] = await db.insert(investors).values(inv as typeof investors.$inferInsert).returning();
    return created;
  }

  async updateInvestor(id: number, data: Partial<InsertInvestor>): Promise<Investor | undefined> {
    const [updated] = await db.update(investors).set(data).where(eq(investors.id, id)).returning();
    return updated;
  }

  async deleteInvestor(id: number): Promise<void> {
    await db.delete(investors).where(eq(investors.id, id));
  }

  async getInvestments(): Promise<Investment[]> {
    return db.select().from(investments).orderBy(desc(investments.startDate));
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    const [row] = await db.select().from(investments).where(eq(investments.id, id));
    return row;
  }

  async createInvestment(inv: InsertInvestment): Promise<Investment> {
    const [created] = await db.insert(investments).values(inv as typeof investments.$inferInsert).returning();
    return created;
  }

  async updateInvestment(id: number, data: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const [updated] = await db.update(investments).set(data).where(eq(investments.id, id)).returning();
    return updated;
  }

  async deleteInvestment(id: number): Promise<void> {
    await db.delete(investments).where(eq(investments.id, id));
  }

  async bulkDeleteInvestments(ids: number[]): Promise<void> {
    await db.delete(investments).where(inArray(investments.id, ids));
  }

  async getContributions(investmentId?: number): Promise<Contribution[]> {
    if (investmentId != null) {
      return db.select().from(contributions).where(eq(contributions.investmentId, investmentId)).orderBy(desc(contributions.date));
    }
    return db.select().from(contributions).orderBy(desc(contributions.date));
  }

  async createContribution(data: InsertContribution): Promise<Contribution> {
    const [created] = await db.insert(contributions).values(data as typeof contributions.$inferInsert).returning();
    return created;
  }

  async updateContribution(id: number, data: Partial<InsertContribution>): Promise<Contribution | undefined> {
    const [updated] = await db.update(contributions).set(data).where(eq(contributions.id, id)).returning();
    return updated;
  }

  async deleteContribution(id: number): Promise<void> {
    await db.delete(contributions).where(eq(contributions.id, id));
  }

  async getIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations).orderBy(integrations.deviceName);
  }

  async createIntegration(int: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(integrations).values(int as typeof integrations.$inferInsert).returning();
    return created;
  }

  async updateIntegration(id: number, data: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updated] = await db.update(integrations).set(data).where(eq(integrations.id, id)).returning();
    return updated;
  }

  async getSettings(): Promise<ClinicSettings | undefined> {
    const [s] = await db.select().from(clinicSettings).limit(1);
    return s;
  }

  async upsertSettings(s: InsertClinicSettings): Promise<ClinicSettings> {
    const existing = await this.getSettings();
    const { id, ...data } = s as any;
    if (existing) {
      const [updated] = await db.update(clinicSettings).set(data).where(eq(clinicSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(clinicSettings).values(data as typeof clinicSettings.$inferInsert).returning();
    return created;
  }

  async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const [patientCount] = await db.select({ count: count() }).from(patients);
    const [medicineCount] = await db.select({ count: count() }).from(medicines);
    const [activeOpdCount] = await db.select({ count: count() }).from(opdVisits).where(eq(opdVisits.status, "active"));
    const [billCount] = await db.select({ count: count() }).from(bills);

    const [todayBills] = await db.select({
      count: count(),
      total: sum(bills.total),
    }).from(bills).where(gte(bills.createdAt, today));

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const [monthBills] = await db.select({ total: sum(bills.total) }).from(bills).where(gte(bills.createdAt, monthStart));
    const [monthExpenses] = await db.select({ total: sum(expenses.amount) }).from(expenses).where(gte(expenses.date, monthStart.toISOString().split('T')[0]));

    return {
      totalPatients: patientCount.count,
      totalMedicines: medicineCount.count,
      activeOpd: activeOpdCount.count,
      totalBills: billCount.count,
      todayPatients: todayBills.count || 0,
      todayRevenue: Number(todayBills.total || 0).toFixed(2),
      monthRevenue: Number(monthBills.total || 0).toFixed(2),
      monthExpenses: Number(monthExpenses.total || 0).toFixed(2),
      patientTrend: 5,
      revenueTrend: 8,
    };
  }

  async getRecentVisits(): Promise<any[]> {
    return this.getOpdVisits();
  }

  async getRevenueChart(): Promise<any[]> {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const [result] = await db.select({ total: sum(bills.total) })
        .from(bills)
        .where(and(gte(bills.createdAt, dayStart), lte(bills.createdAt, dayEnd)));

      days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: Number(result.total || 0),
      });
    }
    return days;
  }

  async getServiceBreakdown(): Promise<any[]> {
    const result = await db.select({
      name: services.category,
      count: count(),
    }).from(services).groupBy(services.category).orderBy(desc(count()));
    return result;
  }

  async getReportSummary(): Promise<any> {
    const [revenue] = await db.select({ total: sum(bills.total) }).from(bills);
    const [expenseTotal] = await db.select({ total: sum(expenses.amount) }).from(expenses);
    const [patientCount] = await db.select({ count: count() }).from(patients);
    const [visitCount] = await db.select({ count: count() }).from(opdVisits);
    const [billCount] = await db.select({ count: count() }).from(bills);
    const [medCount] = await db.select({ count: count() }).from(medicines);
    const [serviceCount] = await db.select({ count: count() }).from(services);

    const totalRev = Number(revenue.total || 0);
    const totalExp = Number(expenseTotal.total || 0);

    return {
      totalRevenue: totalRev.toFixed(2),
      totalExpenses: totalExp.toFixed(2),
      netProfit: (totalRev - totalExp).toFixed(2),
      totalPatients: patientCount.count,
      totalVisits: visitCount.count,
      totalBills: billCount.count,
      totalMedicines: medCount.count,
      totalServices: serviceCount.count,
    };
  }

  async getMonthlyRevenue(): Promise<any[]> {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const [rev] = await db.select({ total: sum(bills.total) })
        .from(bills)
        .where(and(gte(bills.createdAt, monthStart), lte(bills.createdAt, monthEnd)));

      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];
      const [exp] = await db.select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(gte(expenses.date, monthStartStr), lte(expenses.date, monthEndStr)));

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Number(rev.total || 0),
        expenses: Number(exp.total || 0),
      });
    }
    return months;
  }

  async getExpensesByCategory(): Promise<any[]> {
    const result = await db.select({
      category: expenses.category,
      total: sum(expenses.amount),
    }).from(expenses).groupBy(expenses.category).orderBy(desc(sum(expenses.amount)));
    return result;
  }

  async getTopServices(): Promise<any[]> {
    const result = await db.select({
      name: services.name,
      revenue: sql<number>`CAST(${services.price} AS numeric)`,
    }).from(services).where(eq(services.isActive, true)).orderBy(desc(services.price)).limit(10);
    return result;
  }

  async getLabTests(): Promise<any[]> {
    const result = await db.select({
      id: labTests.id,
      testCode: labTests.testCode,
      testName: labTests.testName,
      category: labTests.category,
      sampleType: labTests.sampleType,
      price: labTests.price,
      description: labTests.description,
      turnaroundTime: labTests.turnaroundTime,
      patientId: labTests.patientId,
      reportFileUrl: labTests.reportFileUrl,
      reportFileName: labTests.reportFileName,
      referrerName: labTests.referrerName,
      status: labTests.status,
      createdAt: labTests.createdAt,
      patientName: patients.name,
    }).from(labTests).leftJoin(patients, eq(labTests.patientId, patients.id)).orderBy(desc(labTests.createdAt));
    return result;
  }

  async getLabTest(id: number): Promise<LabTest | undefined> {
    const [test] = await db.select().from(labTests).where(eq(labTests.id, id));
    return test;
  }

  async createLabTest(test: InsertLabTest): Promise<LabTest> {
    const [created] = await db.insert(labTests).values(test as typeof labTests.$inferInsert).returning();
    return created;
  }

  async updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined> {
    const [updated] = await db.update(labTests).set(data).where(eq(labTests.id, id)).returning();
    return updated;
  }

  async deleteLabTest(id: number): Promise<void> {
    await db.delete(labTests).where(eq(labTests.id, id));
  }

  async bulkDeleteLabTests(ids: number[]): Promise<void> {
    await db.delete(labTests).where(inArray(labTests.id, ids));
  }

  async getNextLabTestCode(): Promise<string> {
    const [result] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(labTests);
    const num = (result.maxId || 0) + 1;
    return `LAB-${String(num).padStart(4, '0')}`;
  }

  async getAppointments(): Promise<any[]> {
    const result = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
    const patientList = await db.select().from(patients);
    const patientMap = new Map(patientList.map(p => [p.id, p]));
    return result.map(a => ({
      ...a,
      patientName: patientMap.get(a.patientId)?.name || "Unknown",
    }));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment as typeof appointments.$inferInsert).returning();
    return created;
  }

  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async bulkDeleteAppointments(ids: number[]): Promise<void> {
    await db.delete(appointments).where(inArray(appointments.id, ids));
  }

  async getDoctors(): Promise<Doctor[]> {
    return db.select().from(doctors).orderBy(desc(doctors.createdAt));
  }

  async getDoctor(id: number): Promise<Doctor | undefined> {
    const [doc] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doc;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [created] = await db.insert(doctors).values(doctor as typeof doctors.$inferInsert).returning();
    return created;
  }

  async updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [updated] = await db.update(doctors).set(data).where(eq(doctors.id, id)).returning();
    return updated;
  }

  async deleteDoctor(id: number): Promise<void> {
    await db.delete(doctors).where(eq(doctors.id, id));
  }

  async getNextDoctorId(): Promise<string> {
    const [result] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(doctors);
    const num = (result.maxId || 0) + 1;
    return `DOC-${String(num).padStart(4, '0')}`;
  }

  async getSalaries(): Promise<Salary[]> {
    return db.select().from(salaries).orderBy(desc(salaries.createdAt));
  }

  async getSalary(id: number): Promise<Salary | undefined> {
    const [sal] = await db.select().from(salaries).where(eq(salaries.id, id));
    return sal;
  }

  async createSalary(salary: InsertSalary): Promise<Salary> {
    const [created] = await db.insert(salaries).values(salary as typeof salaries.$inferInsert).returning();
    return created;
  }

  async updateSalary(id: number, data: Partial<InsertSalary>): Promise<Salary | undefined> {
    const [updated] = await db.update(salaries).set(data).where(eq(salaries.id, id)).returning();
    return updated;
  }

  async deleteSalary(id: number): Promise<void> {
    await db.delete(salaries).where(eq(salaries.id, id));
  }

  async getSalaryProfiles(): Promise<SalaryProfile[]> {
    return db.select().from(salaryProfiles).orderBy(desc(salaryProfiles.createdAt));
  }

  async getSalaryProfile(id: number): Promise<SalaryProfile | undefined> {
    const [profile] = await db.select().from(salaryProfiles).where(eq(salaryProfiles.id, id));
    return profile;
  }

  async createSalaryProfile(profile: InsertSalaryProfile): Promise<SalaryProfile> {
    const [created] = await db.insert(salaryProfiles).values(profile as typeof salaryProfiles.$inferInsert).returning();
    return created;
  }

  async updateSalaryProfile(id: number, data: Partial<InsertSalaryProfile>): Promise<SalaryProfile | undefined> {
    const [updated] = await db.update(salaryProfiles).set(data).where(eq(salaryProfiles.id, id)).returning();
    return updated;
  }

  async deleteSalaryProfile(id: number): Promise<void> {
    await db.delete(salaryProfiles).where(eq(salaryProfiles.id, id));
  }

  async getSalaryLoans(): Promise<SalaryLoan[]> {
    return db.select().from(salaryLoans).orderBy(desc(salaryLoans.createdAt));
  }

  async getSalaryLoan(id: number): Promise<SalaryLoan | undefined> {
    const [loan] = await db.select().from(salaryLoans).where(eq(salaryLoans.id, id));
    return loan;
  }

  async createSalaryLoan(loan: InsertSalaryLoan): Promise<SalaryLoan> {
    const [created] = await db.insert(salaryLoans).values(loan as typeof salaryLoans.$inferInsert).returning();
    return created;
  }

  async updateSalaryLoan(id: number, data: Partial<InsertSalaryLoan>): Promise<SalaryLoan | undefined> {
    const [updated] = await db.update(salaryLoans).set(data).where(eq(salaryLoans.id, id)).returning();
    return updated;
  }

  async deleteSalaryLoan(id: number): Promise<void> {
    await db.delete(salaryLoans).where(eq(salaryLoans.id, id));
  }

  async getLoanInstallments(loanId: number): Promise<LoanInstallment[]> {
    return db.select().from(loanInstallments).where(eq(loanInstallments.loanId, loanId)).orderBy(loanInstallments.dueDate);
  }

  async createLoanInstallment(installment: InsertLoanInstallment): Promise<LoanInstallment> {
    const [created] = await db.insert(loanInstallments).values(installment as typeof loanInstallments.$inferInsert).returning();
    return created;
  }

  async updateLoanInstallment(id: number, data: Partial<InsertLoanInstallment>): Promise<LoanInstallment | undefined> {
    const [updated] = await db.update(loanInstallments).set(data).where(eq(loanInstallments.id, id)).returning();
    return updated;
  }

  async getPayrollRuns(): Promise<PayrollRun[]> {
    return db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt));
  }

  async getPayrollRun(id: number): Promise<PayrollRun | undefined> {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return run;
  }

  async createPayrollRun(run: InsertPayrollRun): Promise<PayrollRun> {
    const [created] = await db.insert(payrollRuns).values(run as typeof payrollRuns.$inferInsert).returning();
    return created;
  }

  async updatePayrollRun(id: number, data: Partial<InsertPayrollRun>): Promise<PayrollRun | undefined> {
    const [updated] = await db.update(payrollRuns).set(data).where(eq(payrollRuns.id, id)).returning();
    return updated;
  }

  async deletePayrollRun(id: number): Promise<void> {
    await db.delete(payrollRuns).where(eq(payrollRuns.id, id));
  }

  async getPayslips(payrollRunId: number): Promise<Payslip[]> {
    return db.select().from(payslips).where(eq(payslips.payrollRunId, payrollRunId));
  }

  async createPayslip(payslip: InsertPayslip): Promise<Payslip> {
    const [created] = await db.insert(payslips).values(payslip as typeof payslips.$inferInsert).returning();
    return created;
  }

  async updatePayslip(id: number, data: Partial<InsertPayslip>): Promise<Payslip | undefined> {
    const [updated] = await db.update(payslips).set(data).where(eq(payslips.id, id)).returning();
    return updated;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async changePassword(id: number, newPassword: string): Promise<void> {
    await db.update(users).set({ password: newPassword }).where(eq(users.id, id));
  }

  async getActivityLogs(logLimit: number = 100): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(logLimit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log as typeof activityLogs.$inferInsert).returning();
    return created;
  }

  async clearActivityLogs(): Promise<void> {
    await db.delete(activityLogs);
  }
}

export const storage = new DatabaseStorage();
