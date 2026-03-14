import { eq, desc, sql, and, or, gte, lte, count, sum, inArray, ilike, isNotNull, isNull, like } from "drizzle-orm";
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
  type InsertBill, type Bill,
  duePayments, duePaymentAllocations, type InsertDuePayment, type DuePayment, type InsertDuePaymentAllocation, type DuePaymentAllocation,
  type InsertExpense, type Expense,
  type InsertBankTransaction, type BankTransaction,
  type InsertInvestor, type Investor,
  type InsertInvestment, type Investment,
  contributions, type InsertContribution, type Contribution,
  type InsertIntegration, type Integration,
  type InsertClinicSettings, type ClinicSettings,
  type InsertLabTest, type LabTest,
  sampleCollections, type InsertSampleCollection, type SampleCollection,
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
  medicinePurchases, type InsertMedicinePurchase, type MedicinePurchase,
  userNotifications, type UserNotification,
  hrmAttendance, type InsertHrmAttendance, type HrmAttendance,
  patientMonitorDevices, patientMonitorReadings,
  type InsertPatientMonitorDevice, type PatientMonitorDevice,
  type InsertPatientMonitorReading, type PatientMonitorReading,
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
  getPatientsPaginated(opts: { limit: number; offset: number; search?: string; patientTypeFilter?: string }): Promise<{ items: Patient[]; total: number; outPatientCount?: number; inPatientCount?: number; emergencyPatientCount?: number }>;
  getPatient(id: number): Promise<Patient | undefined>;
  getLastVisitDatesByPatientIds(patientIds: number[]): Promise<Record<number, string>>;
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
  getMedicinesPaginated(opts: { limit: number; offset: number; search?: string; categoryFilter?: string; statusFilter?: string }): Promise<{ items: Medicine[]; total: number; inStockCount?: number; lowStockCount?: number; outOfStockCount?: number }>;
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

  getMedicinePurchases(): Promise<MedicinePurchase[]>;
  getMedicinePurchase(id: number): Promise<MedicinePurchase | undefined>;
  createMedicinePurchase(purchase: InsertMedicinePurchase): Promise<MedicinePurchase>;
  updateMedicinePurchase(id: number, data: Partial<InsertMedicinePurchase>): Promise<MedicinePurchase | undefined>;
  deleteMedicinePurchase(id: number): Promise<void>;

  getOpdVisits(): Promise<any[]>;
  getOpdVisitsFiltered(filters: { fromDate?: string; toDate?: string; doctorName?: string; patientId?: number; hasPrescription?: boolean }): Promise<any[]>;
  getOpdVisitsPaginated(opts: { limit: number; offset: number; search?: string; typeFilter?: string; fromDate?: string; toDate?: string; doctorName?: string; hasPrescription?: boolean }): Promise<{ items: any[]; total: number }>;
  getOpdVisit(id: number): Promise<OpdVisit | undefined>;
  getNextVisitId(): Promise<string>;
  createOpdVisit(visit: InsertOpdVisit): Promise<OpdVisit>;
  updateOpdVisit(id: number, data: Partial<InsertOpdVisit>): Promise<OpdVisit | undefined>;
  deleteOpdVisit(id: number): Promise<void>;
  bulkDeleteOpdVisits(ids: number[]): Promise<void>;

  getBills(): Promise<any[]>;
  getBillsPaginated(opts: { limit: number; offset: number; search?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: any[]; total: number; totalRevenue?: number; totalPaid?: number; paidCount?: number; pendingCount?: number }>;
  getBill(id: number): Promise<Bill | undefined>;
  getNextBillNo(prefix: string): Promise<string>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<void>;
  bulkDeleteBills(ids: number[]): Promise<void>;

  getDuePayments(patientId?: number, limit?: number, offset?: number): Promise<{ payments: DuePayment[]; total: number }>;
  getDuePaymentAllocations(paymentId: number): Promise<DuePaymentAllocation[]>;
  recordPaymentWithAllocations(payment: InsertDuePayment, allocations: { billId: number; amount: number }[]): Promise<DuePayment>;
  updateDuePayment(id: number, updates: Partial<InsertDuePayment>): Promise<DuePayment | undefined>;
  deleteDuePayment(id: number): Promise<boolean>;
  getPatientsDueSummary(limit?: number, offset?: number, search?: string, statusFilter?: string, dateFrom?: Date, dateTo?: Date): Promise<{ summaries: Array<{ patient: Patient; totalDue: number; totalPaid: number; balance: number; credit: number; billsCount: number }>; total: number }>;
  getPatientsDueSummaryStats(dateFrom?: Date, dateTo?: Date, search?: string, statusFilter?: string): Promise<{ totalBalance: number; totalPatients: number }>;

  getExpenses(): Promise<Expense[]>;
  getExpensesPaginated(opts: { limit: number; offset: number; search?: string; categoryFilter?: string; statusFilter?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: Expense[]; total: number }>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  bulkDeleteExpenses(ids: number[]): Promise<void>;

  getBankTransactions(): Promise<BankTransaction[]>;
  getBankTransactionsPaginated(opts: { limit: number; offset: number; search?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: BankTransaction[]; total: number; totalDeposits?: number; totalWithdrawals?: number }>;
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

  getContributions(investmentId?: number, fromDate?: string, toDate?: string): Promise<Contribution[]>;
  createContribution(data: InsertContribution): Promise<Contribution>;
  updateContribution(id: number, data: Partial<InsertContribution>): Promise<Contribution | undefined>;
  deleteContribution(id: number): Promise<void>;

  getIntegrations(): Promise<Integration[]>;
  createIntegration(int: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, data: Partial<InsertIntegration>): Promise<Integration | undefined>;

  getSettings(): Promise<ClinicSettings | undefined>;
  upsertSettings(settings: InsertClinicSettings): Promise<ClinicSettings>;

  getLabTests(): Promise<any[]>;
  getLabTestsPaginated(opts: { limit: number; offset: number; search?: string; statusFilter?: string; categoryFilter?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: any[]; total: number; processingCount?: number; completeCount?: number; withReportsCount?: number }>;
  getLabTest(id: number): Promise<LabTest | undefined>;
  getLabTestWithPatient(id: number): Promise<any | undefined>;
  createLabTest(test: InsertLabTest): Promise<LabTest>;
  updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined>;
  deleteLabTest(id: number): Promise<void>;
  bulkDeleteLabTests(ids: number[]): Promise<void>;
  getNextLabTestCode(): Promise<string>;

  getSampleCollections(): Promise<any[]>;
  getSampleCollectionsPaginated(opts: { limit: number; offset: number; search?: string; statusFilter?: string }): Promise<{ items: any[]; total: number; pendingCount?: number; collectedCount?: number }>;
  getSampleCollection(id: number): Promise<SampleCollection | undefined>;
  createSampleCollection(s: InsertSampleCollection): Promise<SampleCollection>;
  updateSampleCollection(id: number, data: Partial<InsertSampleCollection>): Promise<SampleCollection | undefined>;
  deleteSampleCollection(id: number): Promise<void>;
  bulkDeleteSampleCollections(ids: number[]): Promise<void>;

  getAppointments(): Promise<any[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<void>;
  bulkDeleteAppointments(ids: number[]): Promise<void>;

  // HRM attendance (per clinic user)
  getHrmAttendanceForUser(userId: number, fromDate: Date, toDate: Date): Promise<HrmAttendance[]>;
  getHrmAttendanceForAll(fromDate: Date, toDate: Date): Promise<
    Array<
      HrmAttendance & {
        userName: string;
        fullName: string | null;
      }
    >
  >;
  getTodayHrmAttendance(userId: number, date: Date): Promise<HrmAttendance | undefined>;
  createHrmAttendance(rec: InsertHrmAttendance): Promise<HrmAttendance>;
  updateHrmAttendance(id: number, data: Partial<InsertHrmAttendance>): Promise<HrmAttendance | undefined>;

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
  getUserNotifications(userId: number, limit?: number): Promise<UserNotification[]>;
  createUserNotification(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    audience: string;
    doctorName?: string | null;
    data?: Record<string, unknown> | null;
  }): Promise<UserNotification>;
  markUserNotificationsRead(userId: number, ids?: number[]): Promise<void>;

  getPatientMonitorDevices(): Promise<PatientMonitorDevice[]>;
  getPatientMonitorDevice(id: number): Promise<PatientMonitorDevice | undefined>;
  getPatientMonitorDeviceByIdentifier(deviceIdentifier: string): Promise<PatientMonitorDevice | undefined>;
  createPatientMonitorDevice(device: InsertPatientMonitorDevice): Promise<PatientMonitorDevice>;
  updatePatientMonitorDevice(id: number, data: Partial<InsertPatientMonitorDevice>): Promise<PatientMonitorDevice | undefined>;
  createPatientMonitorReading(reading: InsertPatientMonitorReading): Promise<PatientMonitorReading>;
  getPatientMonitorReadings(filters: { deviceId?: number; patientId?: number; visitId?: number; limit?: number }): Promise<any[]>;
  getLatestPatientMonitorReadings(deviceIds?: number[]): Promise<any[]>;
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
      qualification: users.qualification,
      signatureUrl: users.signatureUrl,
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

  async getPatientsPaginated(opts: { limit: number; offset: number; search?: string; patientTypeFilter?: string }): Promise<{ items: Patient[]; total: number }> {
    const { limit, offset, search, patientTypeFilter } = opts;
    const conditions: any[] = search?.trim() ? [or(ilike(patients.name, "%" + search.trim() + "%"), ilike(patients.patientId, "%" + search.trim() + "%"), ilike(patients.firstName, "%" + search.trim() + "%"), ilike(patients.lastName, "%" + search.trim() + "%"), ilike(patients.phone, "%" + search.trim() + "%"), ilike(patients.city, "%" + search.trim() + "%"))!] : [];
    if (patientTypeFilter && patientTypeFilter !== "all") {
      if (patientTypeFilter === "Out Patient") {
        conditions.push(or(eq(patients.patientType, "Out Patient"), isNull(patients.patientType))!);
      } else {
        conditions.push(eq(patients.patientType, patientTypeFilter));
      }
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const totalRes = await db.select({ count: count() }).from(patients).where(whereClause ?? sql`true`);
    const total = Number(totalRes[0]?.count ?? 0);
    const statsRes = await db.select({
      outPatientCount: sql<number>`count(*) filter (where ${patients.patientType} = 'Out Patient' or ${patients.patientType} is null)`,
      inPatientCount: sql<number>`count(*) filter (where ${patients.patientType} = 'In Patient')`,
      emergencyPatientCount: sql<number>`count(*) filter (where ${patients.patientType} = 'Emergency')`,
    }).from(patients).where(whereClause ?? sql`true`);
    const sr = statsRes[0];
    const outPatientCount = Number(sr?.outPatientCount ?? 0);
    const inPatientCount = Number(sr?.inPatientCount ?? 0);
    const emergencyPatientCount = Number(sr?.emergencyPatientCount ?? 0);
    let q = db.select().from(patients).where(whereClause ?? sql`true`).orderBy(desc(patients.createdAt)).limit(limit).offset(offset);
    const items = await q;
    return { items, total, outPatientCount, inPatientCount, emergencyPatientCount };
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getLastVisitDatesByPatientIds(patientIds: number[]): Promise<Record<number, string>> {
    if (patientIds.length === 0) return {};
    const latest = await db.select({
      patientId: opdVisits.patientId,
      visitDate: opdVisits.visitDate,
    }).from(opdVisits).where(inArray(opdVisits.patientId, patientIds)).orderBy(desc(opdVisits.visitDate));
    const byPatient = new Map<number, string>();
    for (const row of latest) {
      const pid = row.patientId;
      if (pid != null && !byPatient.has(pid)) {
        byPatient.set(pid, row.visitDate ? new Date(row.visitDate).toISOString().slice(0, 10) : "");
      }
    }
    return Object.fromEntries(byPatient);
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

  async getMedicinesPaginated(opts: { limit: number; offset: number; search?: string; categoryFilter?: string; statusFilter?: string }): Promise<{ items: Medicine[]; total: number }> {
    const { limit, offset, search, categoryFilter, statusFilter } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) conds.push(or(ilike(medicines.name, "%" + search.trim() + "%"), ilike(medicines.batchNo, "%" + search.trim() + "%"))!);
    if (categoryFilter?.trim()) conds.push(ilike(medicines.category, "%" + categoryFilter.trim() + "%"));
    if (statusFilter && statusFilter !== "all") {
      const stock = sql`COALESCE(${medicines.stockCount}, ${medicines.quantity}, 0)`;
      const alert = sql`COALESCE(${medicines.stockAlert}, 10)`;
      if (statusFilter === "in-stock" || statusFilter === "in_stock") conds.push(sql`(${stock} >= ${alert})`);
      else if (statusFilter === "low-stock" || statusFilter === "low_stock") conds.push(sql`(${stock} > 0 AND ${stock} < ${alert})`);
      else if (statusFilter === "out-of-stock" || statusFilter === "out_of_stock") conds.push(sql`(${stock} <= 0)`);
    }
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const baseWhere = whereClause ?? sql`true`;
    const totalRes = await db.select({ count: count() }).from(medicines).where(baseWhere);
    const total = Number(totalRes[0]?.count ?? 0);
    const items = await db.select().from(medicines).where(baseWhere).orderBy(medicines.name).limit(limit).offset(offset);
    const stock = sql`COALESCE(${medicines.stockCount}, ${medicines.quantity}, 0)`;
    const alert = sql`COALESCE(${medicines.stockAlert}, 10)`;
    const [inStockRes] = await db.select({ count: count() }).from(medicines).where(and(baseWhere, sql`(${stock} >= ${alert})`));
    const [lowStockRes] = await db.select({ count: count() }).from(medicines).where(and(baseWhere, sql`(${stock} > 0 AND ${stock} < ${alert})`));
    const [outOfStockRes] = await db.select({ count: count() }).from(medicines).where(and(baseWhere, sql`(${stock} <= 0)`));
    return {
      items,
      total,
      inStockCount: Number(inStockRes?.count ?? 0),
      lowStockCount: Number(lowStockRes?.count ?? 0),
      outOfStockCount: Number(outOfStockRes?.count ?? 0),
    };
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
    await db.delete(stockAdjustments).where(eq(stockAdjustments.medicineId, id));
    await db.delete(medicines).where(eq(medicines.id, id));
  }

  async bulkDeleteMedicines(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(stockAdjustments).where(inArray(stockAdjustments.medicineId, ids));
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

  async getOpdVisitsFiltered(filters: { fromDate?: string; toDate?: string; doctorName?: string; patientId?: number; hasPrescription?: boolean }): Promise<any[]> {
    const conds: ReturnType<typeof eq>[] = [];
    if (filters.fromDate) {
      conds.push(gte(opdVisits.visitDate, new Date(filters.fromDate + "T00:00:00")));
    }
    if (filters.toDate) {
      conds.push(lte(opdVisits.visitDate, new Date(filters.toDate + "T23:59:59.999")));
    }
    if (filters.doctorName && filters.doctorName.trim() !== "") {
      conds.push(eq(opdVisits.doctorName, filters.doctorName.trim()));
    }
    if (filters.patientId != null) {
      conds.push(eq(opdVisits.patientId, filters.patientId));
    }
    if (filters.hasPrescription === true) {
      conds.push(isNotNull(opdVisits.prescription));
    }
    const baseQuery = db.select({
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
    }).from(opdVisits).leftJoin(patients, eq(opdVisits.patientId, patients.id));
    const result = conds.length > 0
      ? await baseQuery.where(and(...conds)).orderBy(desc(opdVisits.visitDate))
      : await baseQuery.orderBy(desc(opdVisits.visitDate));
    return result;
  }

  async getOpdVisitsPaginated(opts: { limit: number; offset: number; search?: string; typeFilter?: string; fromDate?: string; toDate?: string; doctorName?: string; hasPrescription?: boolean }): Promise<{ items: any[]; total: number }> {
    const { limit, offset, search, typeFilter, fromDate, toDate, doctorName, hasPrescription } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) {
      const s = "%" + search.trim() + "%";
      conds.push(or(ilike(patients.name, s), ilike(opdVisits.visitId, s), ilike(opdVisits.doctorName, s))!);
    }
    if (typeFilter && typeFilter !== "all") conds.push(eq(patients.patientType, typeFilter));
    if (fromDate) conds.push(gte(opdVisits.visitDate, new Date(fromDate + "T00:00:00")));
    if (toDate) conds.push(lte(opdVisits.visitDate, new Date(toDate + "T23:59:59.999")));
    if (doctorName?.trim()) conds.push(eq(opdVisits.doctorName, doctorName.trim()));
    if (hasPrescription === true) conds.push(isNotNull(opdVisits.prescription));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const baseQ = db.select({
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
      patientType: patients.patientType,
    }).from(opdVisits).leftJoin(patients, eq(opdVisits.patientId, patients.id));
    const countRes = await db.select({ count: count() }).from(opdVisits).leftJoin(patients, eq(opdVisits.patientId, patients.id)).where(whereClause ?? sql`true`);
    const total = Number(countRes[0]?.count ?? 0);
    const items = await baseQ.where(whereClause ?? sql`true`).orderBy(desc(opdVisits.visitDate)).limit(limit).offset(offset);
    return { items, total };
  }

  async getNextVisitId(): Promise<string> {
    const rows = await db.select({ visitId: opdVisits.visitId }).from(opdVisits);
    let maxNum = 0;
    for (const r of rows) {
      const m = (r.visitId || "").match(/^VIS-(\d+)$/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return `VIS-${String(maxNum + 1).padStart(3, "0")}`;
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

  async deleteOpdVisit(id: number): Promise<void> {
    await db.update(bills).set({ visitId: null }).where(eq(bills.visitId, id));
    await db.delete(opdVisits).where(eq(opdVisits.id, id));
  }

  async bulkDeleteOpdVisits(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(bills).set({ visitId: null }).where(inArray(bills.visitId, ids));
    await db.delete(opdVisits).where(inArray(opdVisits.id, ids));
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

  async getBillsPaginated(opts: { limit: number; offset: number; search?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: any[]; total: number }> {
    const { limit, offset, search, dateFrom, dateTo } = opts;
    const conditions: ReturnType<typeof sql>[] = [];
    if (search?.trim()) {
      const s = "%" + search.trim() + "%";
      conditions.push(or(ilike(bills.billNo, s), ilike(patients.name, s))!);
    }
    if (dateFrom) conditions.push(sql`(COALESCE(${bills.paymentDate}, ${bills.createdAt}::date)) >= ${dateFrom}::date`);
    if (dateTo) conditions.push(sql`(COALESCE(${bills.paymentDate}, ${bills.createdAt}::date)) <= ${dateTo}::date`);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const baseQ = db.select({
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
    }).from(bills).leftJoin(patients, eq(bills.patientId, patients.id));
    const countRes = await db.select({ count: count() }).from(bills).leftJoin(patients, eq(bills.patientId, patients.id)).where(whereClause ?? sql`true`);
    const total = Number(countRes[0]?.count ?? 0);
    const itemsQ = baseQ.where(whereClause ?? sql`true`).orderBy(desc(bills.createdAt)).limit(limit).offset(offset);
    const items = await itemsQ;
    const aggRes = await db.select({
      totalRevenue: sum(bills.total),
      totalPaid: sum(bills.paidAmount),
    }).from(bills).leftJoin(patients, eq(bills.patientId, patients.id)).where(whereClause ?? sql`true`);
    const totalRevenue = Number(aggRes[0]?.totalRevenue ?? 0);
    const totalPaid = Number(aggRes[0]?.totalPaid ?? 0);
    const statusCounts = await db.select({
      status: bills.status,
      cnt: count(),
    }).from(bills).leftJoin(patients, eq(bills.patientId, patients.id)).where(whereClause ?? sql`true`).groupBy(bills.status);
    const paidCount = statusCounts.filter((r: any) => r.status === "paid").reduce((s, r: any) => s + Number(r.cnt ?? 0), 0);
    const pendingCount = total - paidCount;
    return { items, total, totalRevenue, totalPaid, paidCount, pendingCount };
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getNextBillNo(prefix: string): Promise<string> {
    const safePrefix = (prefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
    const pattern = safePrefix + "%";
    const [row] = await db
      .select({
        next: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${bills.billNo} FROM '[0-9]+$') AS INTEGER)), 0) + 1`,
      })
      .from(bills)
      .where(like(bills.billNo, pattern));
    const nextNum = Number((row as { next: number })?.next) || 1;
    return safePrefix + String(nextNum).padStart(5, "0");
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
    await db.update(sampleCollections).set({ billId: null }).where(eq(sampleCollections.billId, id));
    await db.update(labTests).set({ billId: null }).where(eq(labTests.billId, id));
    await db.delete(duePaymentAllocations).where(eq(duePaymentAllocations.billId, id));
    await db.delete(bills).where(eq(bills.id, id));
  }

  async bulkDeleteBills(ids: number[]): Promise<void> {
    await db.update(sampleCollections).set({ billId: null }).where(inArray(sampleCollections.billId, ids));
    await db.update(labTests).set({ billId: null }).where(inArray(labTests.billId, ids));
    await db.delete(duePaymentAllocations).where(inArray(duePaymentAllocations.billId, ids));
    await db.delete(bills).where(inArray(bills.id, ids));
  }

  async getDuePayments(patientId?: number, limit?: number, offset?: number): Promise<{ payments: DuePayment[]; total: number }> {
    const conditions = patientId != null ? [eq(duePayments.patientId, patientId)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const countResult = await db.select({ count: count() }).from(duePayments).where(whereClause ?? sql`true`);
    const total = Number(countResult[0]?.count ?? 0);
    let q = db.select().from(duePayments).orderBy(desc(duePayments.paymentDate));
    if (whereClause) q = q.where(whereClause) as typeof q;
    if (limit != null) q = q.limit(limit) as typeof q;
    if (offset != null) q = q.offset(offset) as typeof q;
    const payments = await q;
    return { payments, total };
  }

  async getDuePaymentAllocations(paymentId: number): Promise<DuePaymentAllocation[]> {
    return db.select().from(duePaymentAllocations).where(eq(duePaymentAllocations.paymentId, paymentId));
  }

  async recordPaymentWithAllocations(payment: InsertDuePayment, allocations: { billId: number; amount: number }[]): Promise<DuePayment> {
    return db.transaction(async (tx) => {
      const paymentDate = typeof (payment as any).paymentDate === "string" || (payment as any).paymentDate instanceof Date
        ? (payment as any).paymentDate
        : new Date();
      const [created] = await tx.insert(duePayments).values({
        ...payment,
        paymentDate: paymentDate instanceof Date ? paymentDate : new Date(paymentDate),
      } as typeof duePayments.$inferInsert).returning();
      let totalAllocated = 0;
      for (const alloc of allocations) {
        await tx.insert(duePaymentAllocations).values({
          paymentId: created.id,
          billId: alloc.billId,
          amount: String(alloc.amount),
        });
        totalAllocated += alloc.amount;
        const [bill] = await tx.select().from(bills).where(eq(bills.id, alloc.billId));
        if (bill) {
          const currentPaid = Number(bill.paidAmount ?? 0);
          const newPaid = currentPaid + alloc.amount;
          const totalBill = Number(bill.total ?? 0);
          const newStatus = newPaid >= totalBill ? "paid" : newPaid > 0 ? "partial" : bill.status;
          await tx.update(bills).set({
            paidAmount: String(newPaid.toFixed(2)),
            status: newStatus,
          }).where(eq(bills.id, alloc.billId));
        }
      }
      const unapplied = Number((payment as InsertDuePayment).amount) - totalAllocated;
      if (unapplied !== 0) {
        await tx.update(duePayments).set({ unappliedAmount: String(unapplied.toFixed(2)) }).where(eq(duePayments.id, created.id));
      }
      const [updated] = await tx.select().from(duePayments).where(eq(duePayments.id, created.id));
      return updated;
    });
  }

  async updateDuePayment(id: number, updates: Partial<InsertDuePayment>): Promise<DuePayment | undefined> {
    const [updated] = await db.update(duePayments).set(updates as Record<string, unknown>).where(eq(duePayments.id, id)).returning();
    return updated;
  }

  async deleteDuePayment(id: number): Promise<boolean> {
    const existing = await db.select().from(duePayments).where(eq(duePayments.id, id)).limit(1);
    if (existing.length === 0) return false;
    const allocs = await db.select().from(duePaymentAllocations).where(eq(duePaymentAllocations.paymentId, id));
    await db.transaction(async (tx) => {
      for (const a of allocs) {
        const [bill] = await tx.select().from(bills).where(eq(bills.id, a.billId));
        if (bill) {
          const currentPaid = Number(bill.paidAmount ?? 0);
          const allocAmt = Number(a.amount ?? 0);
          const newPaid = Math.max(0, currentPaid - allocAmt);
          const totalBill = Number(bill.total ?? 0);
          const newStatus = newPaid >= totalBill ? "paid" : newPaid > 0 ? "partial" : "unpaid";
          await tx.update(bills).set({
            paidAmount: String(newPaid.toFixed(2)),
            status: newStatus,
          }).where(eq(bills.id, a.billId));
        }
      }
      await tx.delete(duePaymentAllocations).where(eq(duePaymentAllocations.paymentId, id));
      await tx.delete(duePayments).where(eq(duePayments.id, id));
    });
    return true;
  }

  async getPatientsDueSummary(
    limit?: number,
    offset?: number,
    search?: string,
    statusFilter?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{ summaries: Array<{ patient: Patient; totalDue: number; totalPaid: number; balance: number; credit: number; billsCount: number }>; total: number }> {
    const allBills = await db.select().from(bills);
    const billDateFilter = (b: typeof bills.$inferSelect) => {
      if (!dateFrom && !dateTo) return true;
      const d = b.createdAt ? new Date(b.createdAt) : null;
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };
    const dueBills = allBills.filter((b) => {
      if (!billDateFilter(b)) return false;
      const total = Number(b.total ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      const isDue = (b.paymentMethod === "due" || b.status === "unpaid" || b.status === "partial") && paid < total;
      return isDue;
    });
    const patientIds = Array.from(new Set(dueBills.map((b) => b.patientId)));
    const allPatients = await db.select().from(patients);
    const patientMap = new Map(allPatients.map((p) => [p.id, p]));
    const summaries: Array<{ patient: Patient; totalDue: number; totalPaid: number; balance: number; credit: number; billsCount: number }> = [];
    for (const pid of patientIds) {
      const patient = patientMap.get(pid);
      if (!patient) continue;
      if (search && search.trim()) {
        const term = search.toLowerCase().trim();
        if (!((patient.name ?? "").toLowerCase().includes(term) || (patient.patientId ?? "").toLowerCase().includes(term) || (patient.phone ?? "").includes(term))) continue;
      }
      const patientBills = dueBills.filter((b) => b.patientId === pid);
      let totalDue = 0;
      let totalPaid = 0;
      for (const b of patientBills) {
        totalDue += Number(b.total ?? 0);
        totalPaid += Number(b.paidAmount ?? 0);
      }
      const balance = totalDue - totalPaid;
      if (statusFilter === "with_balance" && balance <= 0) continue;
      if (statusFilter === "with_credit") {
        const { payments } = await this.getDuePayments(pid);
        const credit = payments.reduce((s, p) => s + Number(p.unappliedAmount ?? 0), 0);
        if (credit <= 0) continue;
      }
      const { payments } = await this.getDuePayments(pid);
      const credit = payments.reduce((s, p) => s + Number(p.unappliedAmount ?? 0), 0);
      summaries.push({
        patient,
        totalDue,
        totalPaid,
        balance,
        credit,
        billsCount: patientBills.length,
      });
    }
    const total = summaries.length;
    if (offset != null || limit != null) {
      const start = offset ?? 0;
      const end = limit != null ? start + limit : undefined;
      return { summaries: summaries.slice(start, end), total };
    }
    return { summaries, total };
  }

  async getPatientsDueSummaryStats(dateFrom?: Date, dateTo?: Date, search?: string, statusFilter?: string): Promise<{ totalBalance: number; totalPatients: number; totalCollected: number }> {
    const { summaries } = await this.getPatientsDueSummary(undefined, undefined, search, statusFilter, dateFrom, dateTo);
    const totalBalance = summaries.reduce((s, x) => s + x.balance, 0);
    const totalCollected = summaries.reduce((s, x) => s + x.totalPaid, 0);
    return { totalBalance, totalPatients: summaries.length, totalCollected };
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpensesPaginated(opts: { limit: number; offset: number; search?: string; categoryFilter?: string; statusFilter?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: Expense[]; total: number; totalAmount?: number; approvedAmount?: number; pendingAmount?: number }> {
    const { limit, offset, search, categoryFilter, statusFilter, dateFrom, dateTo } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) conds.push(or(ilike(expenses.description, "%" + search.trim() + "%"), ilike(expenses.category, "%" + search.trim() + "%"))!);
    if (categoryFilter?.trim()) conds.push(eq(expenses.category, categoryFilter.trim()));
    if (statusFilter?.trim()) conds.push(eq(expenses.status, statusFilter.trim()));
    if (dateFrom) conds.push(gte(expenses.date, dateFrom));
    if (dateTo) conds.push(lte(expenses.date, dateTo));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const totalRes = await db.select({ count: count() }).from(expenses).where(whereClause ?? sql`true`);
    const total = Number(totalRes[0]?.count ?? 0);
    const items = await db.select().from(expenses).where(whereClause ?? sql`true`).orderBy(desc(expenses.date)).limit(limit).offset(offset);
    const aggRes = await db.select({
      totalAmount: sum(expenses.amount),
      approvedAmount: sql<number>`sum(case when ${expenses.status} = 'approved' then ${expenses.amount}::float else 0 end)`,
      pendingAmount: sql<number>`sum(case when ${expenses.status} is null or ${expenses.status} = 'pending' then ${expenses.amount}::float else 0 end)`,
    }).from(expenses).where(whereClause ?? sql`true`);
    const r = aggRes[0];
    const totalAmount = Number(r?.totalAmount ?? 0);
    const approvedAmount = Number(r?.approvedAmount ?? 0);
    const pendingAmount = Number(r?.pendingAmount ?? 0);
    return { items, total, totalAmount, approvedAmount, pendingAmount };
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

  async getBankTransactionsPaginated(opts: { limit: number; offset: number; search?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: BankTransaction[]; total: number }> {
    const { limit, offset, search, dateFrom, dateTo } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) {
      const s = "%" + search.trim() + "%";
      conds.push(or(ilike(bankTransactions.bankName, s), ilike(bankTransactions.description, s))!);
    }
    if (dateFrom) conds.push(gte(bankTransactions.date, dateFrom));
    if (dateTo) conds.push(lte(bankTransactions.date, dateTo));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const totalRes = await db.select({ count: count() }).from(bankTransactions).where(whereClause ?? sql`true`);
    const total = Number(totalRes[0]?.count ?? 0);
    const items = await db.select().from(bankTransactions).where(whereClause ?? sql`true`).orderBy(desc(bankTransactions.date)).limit(limit).offset(offset);
    const aggRes = await db.select({
      totalDeposits: sql<number>`coalesce(sum(case when ${bankTransactions.type} = 'deposit' then ${bankTransactions.amount}::float else 0 end), 0)`,
      totalWithdrawals: sql<number>`coalesce(sum(case when ${bankTransactions.type} in ('withdrawal','transfer') then ${bankTransactions.amount}::float else 0 end), 0)`,
    }).from(bankTransactions).where(whereClause ?? sql`true`);
    const r = aggRes[0];
    return { items, total, totalDeposits: Number(r?.totalDeposits ?? 0), totalWithdrawals: Number(r?.totalWithdrawals ?? 0) };
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

  async getContributions(investmentId?: number, fromDate?: string, toDate?: string): Promise<Contribution[]> {
    const conditions = [];
    if (investmentId != null) conditions.push(eq(contributions.investmentId, investmentId));
    if (fromDate) conditions.push(gte(contributions.date, fromDate));
    if (toDate) conditions.push(lte(contributions.date, toDate));
    if (conditions.length > 0) {
      return db.select().from(contributions).where(and(...conditions)).orderBy(desc(contributions.date));
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
    if (s?.clinicName === "Prime Medical Clinic") {
      const [updated] = await db.update(clinicSettings).set({ clinicName: "Prime Clinic Center" }).where(eq(clinicSettings.id, s.id)).returning();
      return updated;
    }
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

  async getUserNotifications(userId: number, limit = 50): Promise<UserNotification[]> {
    return db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
  }

  async createUserNotification(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    audience: string;
    doctorName?: string | null;
    data?: Record<string, unknown> | null;
  }): Promise<UserNotification> {
    const insertData: typeof userNotifications.$inferInsert = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      audience: data.audience,
      doctorName: data.doctorName ?? null,
      data: (data as any).data ?? null,
    };
    const [created] = await db.insert(userNotifications).values(insertData).returning();
    return created;
  }

  async markUserNotificationsRead(userId: number, ids?: number[]): Promise<void> {
    if (ids && ids.length > 0) {
      await db
        .update(userNotifications)
        .set({ isRead: true })
        .where(and(eq(userNotifications.userId, userId), inArray(userNotifications.id, ids)));
    } else {
      await db
        .update(userNotifications)
        .set({ isRead: true })
        .where(eq(userNotifications.userId, userId));
    }
  }

  /** Calculate age in years from date of birth string (YYYY-MM-DD). Returns null if invalid. */
  _ageFromDob(dob: string | null | undefined): number | null {
    if (!dob || typeof dob !== "string") return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  }

  async getLabTestsPaginated(opts: { limit: number; offset: number; search?: string; statusFilter?: string; categoryFilter?: string; dateFrom?: string; dateTo?: string }): Promise<{ items: any[]; total: number }> {
    const { limit, offset, search, statusFilter, categoryFilter, dateFrom, dateTo } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) {
      const s = "%" + search.trim() + "%";
      conds.push(or(ilike(labTests.testCode, s), ilike(labTests.testName, s), ilike(patients.name, s), ilike(labTests.referrerName, s))!);
    }
    if (statusFilter?.trim() && statusFilter !== "all") conds.push(eq(labTests.status, statusFilter.trim()));
    if (categoryFilter?.trim() && categoryFilter !== "all") conds.push(ilike(labTests.category, "%" + categoryFilter.trim() + "%"));
    if (dateFrom) conds.push(gte(labTests.createdAt, new Date(dateFrom + "T00:00:00")));
    if (dateTo) conds.push(lte(labTests.createdAt, new Date(dateTo + "T23:59:59.999")));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const baseQ = db.select({
      id: labTests.id,
      testCode: labTests.testCode,
      testName: labTests.testName,
      category: labTests.category,
      sampleType: labTests.sampleType,
      price: labTests.price,
      description: labTests.description,
      turnaroundTime: labTests.turnaroundTime,
      patientId: labTests.patientId,
      billId: labTests.billId,
      serviceId: labTests.serviceId,
      serviceIds: labTests.serviceIds,
      reportFileUrl: labTests.reportFileUrl,
      reportFileName: labTests.reportFileName,
      reportResults: labTests.reportResults,
      referrerName: labTests.referrerName,
      labTechnologistId: labTests.labTechnologistId,
      status: labTests.status,
      createdAt: labTests.createdAt,
      patientName: patients.name,
      patientPatientId: patients.patientId,
      patientAge: patients.age,
      patientDateOfBirth: patients.dateOfBirth,
      patientGender: patients.gender,
      technologistFullName: users.fullName,
      technologistQualification: users.qualification,
      technologistSignatureUrl: users.signatureUrl,
      technologistSignaturePrintInLabReport: users.signaturePrintInLabReport,
      technologistRoleName: roles.name,
    }).from(labTests)
      .leftJoin(patients, eq(labTests.patientId, patients.id))
      .leftJoin(users, eq(labTests.labTechnologistId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id));
    const countRes = await db.select({ count: count() }).from(labTests)
      .leftJoin(patients, eq(labTests.patientId, patients.id))
      .leftJoin(users, eq(labTests.labTechnologistId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(whereClause ?? sql`true`);
    const total = Number(countRes[0]?.count ?? 0);
    const statsRes = await db.select({
      processingCount: sql<number>`count(*) filter (where ${labTests.status} = 'processing')`,
      completeCount: sql<number>`count(*) filter (where ${labTests.status} = 'complete')`,
      withReportsCount: sql<number>`count(*) filter (where ${labTests.reportFileUrl} is not null and ${labTests.reportFileUrl} != '')`,
    }).from(labTests)
      .leftJoin(patients, eq(labTests.patientId, patients.id))
      .leftJoin(users, eq(labTests.labTechnologistId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(whereClause ?? sql`true`);
    const sr = statsRes[0];
    const processingCount = Number(sr?.processingCount ?? 0);
    const completeCount = Number(sr?.completeCount ?? 0);
    const withReportsCount = Number(sr?.withReportsCount ?? 0);
    const result = await baseQ.where(whereClause ?? sql`true`).orderBy(desc(labTests.createdAt)).limit(limit).offset(offset);
    const items = result.map((r: any) => {
      const { technologistFullName, technologistQualification, technologistSignatureUrl, technologistSignaturePrintInLabReport, technologistRoleName, patientPatientId, patientAge, patientDateOfBirth, patientGender, ...rest } = r;
      const resolvedAge = patientAge != null ? patientAge : this._ageFromDob(patientDateOfBirth);
      return {
        ...rest,
        patientPatientId,
        patientAge: resolvedAge,
        patientGender,
        labTechnologist: r.labTechnologistId && r.technologistFullName ? {
          id: r.labTechnologistId,
          fullName: technologistFullName,
          qualification: technologistQualification,
          signatureUrl: technologistSignatureUrl,
          signaturePrintInLabReport: technologistSignaturePrintInLabReport ?? true,
          roleName: technologistRoleName,
        } : null,
      };
    });
    return { items, total, processingCount, completeCount, withReportsCount };
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
      billId: labTests.billId,
      serviceId: labTests.serviceId,
      serviceIds: labTests.serviceIds,
      reportFileUrl: labTests.reportFileUrl,
      reportFileName: labTests.reportFileName,
      reportResults: labTests.reportResults,
      referrerName: labTests.referrerName,
      labTechnologistId: labTests.labTechnologistId,
      status: labTests.status,
      createdAt: labTests.createdAt,
      patientName: patients.name,
      patientPatientId: patients.patientId,
      patientAge: patients.age,
      patientDateOfBirth: patients.dateOfBirth,
      patientGender: patients.gender,
      technologistFullName: users.fullName,
      technologistQualification: users.qualification,
      technologistSignatureUrl: users.signatureUrl,
      technologistSignaturePrintInLabReport: users.signaturePrintInLabReport,
      technologistRoleName: roles.name,
    }).from(labTests)
      .leftJoin(patients, eq(labTests.patientId, patients.id))
      .leftJoin(users, eq(labTests.labTechnologistId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .orderBy(desc(labTests.createdAt));
    return result.map((r: any) => {
      const { technologistFullName, technologistQualification, technologistSignatureUrl, technologistSignaturePrintInLabReport, technologistRoleName, patientPatientId, patientAge, patientDateOfBirth, patientGender, ...rest } = r;
      const resolvedAge = patientAge != null ? patientAge : this._ageFromDob(patientDateOfBirth);
      return {
        ...rest,
        patientPatientId,
        patientAge: resolvedAge,
        patientGender,
        labTechnologist: r.labTechnologistId && r.technologistFullName ? {
          id: r.labTechnologistId,
          fullName: technologistFullName,
          qualification: technologistQualification,
          signatureUrl: technologistSignatureUrl,
          signaturePrintInLabReport: technologistSignaturePrintInLabReport ?? true,
          roleName: technologistRoleName,
        } : null,
      };
    });
  }

  async getLabTest(id: number): Promise<LabTest | undefined> {
    const [test] = await db.select().from(labTests).where(eq(labTests.id, id));
    return test;
  }

  async getLabTestWithPatient(id: number): Promise<any | undefined> {
    const [row] = await db.select({
      id: labTests.id,
      testCode: labTests.testCode,
      testName: labTests.testName,
      category: labTests.category,
      sampleType: labTests.sampleType,
      price: labTests.price,
      description: labTests.description,
      turnaroundTime: labTests.turnaroundTime,
      patientId: labTests.patientId,
      serviceId: labTests.serviceId,
      serviceIds: labTests.serviceIds,
      billId: labTests.billId,
      sampleCollectionRequired: labTests.sampleCollectionRequired,
      reportFileUrl: labTests.reportFileUrl,
      reportFileName: labTests.reportFileName,
      reportResults: labTests.reportResults,
      referrerName: labTests.referrerName,
      labTechnologistId: labTests.labTechnologistId,
      status: labTests.status,
      createdAt: labTests.createdAt,
      patientName: patients.name,
      patientPatientId: patients.patientId,
      patientAge: patients.age,
      patientDateOfBirth: patients.dateOfBirth,
      patientGender: patients.gender,
      technologistFullName: users.fullName,
      technologistQualification: users.qualification,
      technologistSignatureUrl: users.signatureUrl,
      technologistSignaturePrintInLabReport: users.signaturePrintInLabReport,
      technologistRoleName: roles.name,
    }).from(labTests)
      .leftJoin(patients, eq(labTests.patientId, patients.id))
      .leftJoin(users, eq(labTests.labTechnologistId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(labTests.id, id));
    if (!row) return undefined;
    const { technologistFullName, technologistQualification, technologistSignatureUrl, technologistSignaturePrintInLabReport, technologistRoleName, patientPatientId, patientAge, patientDateOfBirth, patientGender, ...rest } = row as any;
    const resolvedAge = patientAge != null ? patientAge : this._ageFromDob(patientDateOfBirth);
    return {
      ...rest,
      patientPatientId,
      patientAge: resolvedAge,
      patientGender,
      labTechnologist: row.labTechnologistId && technologistFullName ? {
        id: row.labTechnologistId,
        fullName: technologistFullName,
        qualification: technologistQualification,
        signatureUrl: technologistSignatureUrl,
        signaturePrintInLabReport: technologistSignaturePrintInLabReport ?? true,
        roleName: technologistRoleName,
      } : null,
    };
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
    await db.delete(sampleCollections).where(eq(sampleCollections.labTestId, id));
    await db.delete(labTests).where(eq(labTests.id, id));
  }

  async bulkDeleteLabTests(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(sampleCollections).where(inArray(sampleCollections.labTestId, ids));
    await db.delete(labTests).where(inArray(labTests.id, ids));
  }

  async getNextLabTestCode(): Promise<string> {
    const [result] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(labTests);
    const num = (result.maxId || 0) + 1;
    return `LAB-${String(num).padStart(4, '0')}`;
  }

  async getSampleCollections(): Promise<any[]> {
    return db.select({
      id: sampleCollections.id,
      labTestId: sampleCollections.labTestId,
      patientId: sampleCollections.patientId,
      billId: sampleCollections.billId,
      testName: sampleCollections.testName,
      sampleType: sampleCollections.sampleType,
      status: sampleCollections.status,
      collectedAt: sampleCollections.collectedAt,
      collectedBy: sampleCollections.collectedBy,
      notes: sampleCollections.notes,
      createdAt: sampleCollections.createdAt,
      patientName: patients.name,
      patientIdCode: patients.patientId,
    }).from(sampleCollections).leftJoin(patients, eq(sampleCollections.patientId, patients.id)).orderBy(desc(sampleCollections.createdAt));
  }

  async getSampleCollectionsPaginated(opts: { limit: number; offset: number; search?: string; statusFilter?: string }): Promise<{ items: any[]; total: number }> {
    const { limit, offset, search, statusFilter } = opts;
    const conds: ReturnType<typeof sql>[] = [];
    if (search?.trim()) {
      const s = "%" + search.trim() + "%";
      conds.push(or(ilike(sampleCollections.testName, s), ilike(patients.name, s), ilike(patients.patientId, s))!);
    }
    if (statusFilter?.trim() && statusFilter !== "all") conds.push(eq(sampleCollections.status, statusFilter.trim()));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;
    const baseQ = db.select({
      id: sampleCollections.id,
      labTestId: sampleCollections.labTestId,
      patientId: sampleCollections.patientId,
      billId: sampleCollections.billId,
      testName: sampleCollections.testName,
      sampleType: sampleCollections.sampleType,
      status: sampleCollections.status,
      collectedAt: sampleCollections.collectedAt,
      collectedBy: sampleCollections.collectedBy,
      notes: sampleCollections.notes,
      createdAt: sampleCollections.createdAt,
      patientName: patients.name,
      patientIdCode: patients.patientId,
    }).from(sampleCollections).leftJoin(patients, eq(sampleCollections.patientId, patients.id));
    const countRes = await db.select({ count: count() }).from(sampleCollections).leftJoin(patients, eq(sampleCollections.patientId, patients.id)).where(whereClause ?? sql`true`);
    const total = Number(countRes[0]?.count ?? 0);
    const statsRes = await db.select({
      pendingCount: sql<number>`count(*) filter (where ${sampleCollections.status} = 'pending')`,
      collectedCount: sql<number>`count(*) filter (where ${sampleCollections.status} = 'collected')`,
    }).from(sampleCollections).leftJoin(patients, eq(sampleCollections.patientId, patients.id)).where(whereClause ?? sql`true`);
    const sr = statsRes[0];
    const pendingCount = Number(sr?.pendingCount ?? 0);
    const collectedCount = Number(sr?.collectedCount ?? 0);
    const items = await baseQ.where(whereClause ?? sql`true`).orderBy(desc(sampleCollections.createdAt)).limit(limit).offset(offset);
    return { items, total, pendingCount, collectedCount };
  }

  async getSampleCollection(id: number): Promise<SampleCollection | undefined> {
    const [s] = await db.select().from(sampleCollections).where(eq(sampleCollections.id, id));
    return s;
  }

  async createSampleCollection(s: InsertSampleCollection): Promise<SampleCollection> {
    const [created] = await db.insert(sampleCollections).values(s as typeof sampleCollections.$inferInsert).returning();
    return created;
  }

  async updateSampleCollection(id: number, data: Partial<InsertSampleCollection>): Promise<SampleCollection | undefined> {
    const [updated] = await db.update(sampleCollections).set(data).where(eq(sampleCollections.id, id)).returning();
    return updated;
  }

  async deleteSampleCollection(id: number): Promise<void> {
    await db.delete(sampleCollections).where(eq(sampleCollections.id, id));
  }

  async bulkDeleteSampleCollections(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await db.delete(sampleCollections).where(inArray(sampleCollections.id, ids));
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

  // --- HRM attendance ---

  async getHrmAttendanceForUser(userId: number, fromDate: Date, toDate: Date): Promise<HrmAttendance[]> {
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);
    return db
      .select()
      .from(hrmAttendance)
      .where(
        and(
          eq(hrmAttendance.userId, userId),
          gte(hrmAttendance.date, fromStr),
          lte(hrmAttendance.date, toStr),
        ),
      )
      .orderBy(desc(hrmAttendance.date));
  }

  async getHrmAttendanceForAll(fromDate: Date, toDate: Date): Promise<
    Array<
      HrmAttendance & {
        userName: string;
        fullName: string | null;
      }
    >
  > {
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);
    const rows = await db
      .select({
        id: hrmAttendance.id,
        userId: hrmAttendance.userId,
        date: hrmAttendance.date,
        checkInTime: hrmAttendance.checkInTime,
        checkOutTime: hrmAttendance.checkOutTime,
        workingMinutes: hrmAttendance.workingMinutes,
        status: hrmAttendance.status,
        notes: hrmAttendance.notes,
        createdAt: hrmAttendance.createdAt,
        userName: users.username,
        fullName: users.fullName,
      })
      .from(hrmAttendance)
      .leftJoin(users, eq(hrmAttendance.userId, users.id))
      .where(and(gte(hrmAttendance.date, fromStr), lte(hrmAttendance.date, toStr)))
      .orderBy(desc(hrmAttendance.date), users.fullName ?? users.username);
    return rows as Array<
      HrmAttendance & {
        userName: string;
        fullName: string | null;
      }
    >;
  }

  async getTodayHrmAttendance(userId: number, date: Date): Promise<HrmAttendance | undefined> {
    const dateStr = date.toISOString().slice(0, 10);
    const [row] = await db
      .select()
      .from(hrmAttendance)
      .where(
        and(
          eq(hrmAttendance.userId, userId),
          eq(hrmAttendance.date, dateStr),
        ),
      );
    return row;
  }

  async createHrmAttendance(rec: InsertHrmAttendance): Promise<HrmAttendance> {
    const [created] = await db.insert(hrmAttendance).values(rec as typeof hrmAttendance.$inferInsert).returning();
    return created;
  }

  async updateHrmAttendance(id: number, data: Partial<InsertHrmAttendance>): Promise<HrmAttendance | undefined> {
    const [updated] = await db.update(hrmAttendance).set(data).where(eq(hrmAttendance.id, id)).returning();
    return updated;
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

  async getMedicinePurchases(): Promise<MedicinePurchase[]> {
    return db.select().from(medicinePurchases).orderBy(desc(medicinePurchases.createdAt));
  }

  async getMedicinePurchase(id: number): Promise<MedicinePurchase | undefined> {
    const [purchase] = await db.select().from(medicinePurchases).where(eq(medicinePurchases.id, id));
    return purchase;
  }

  async createMedicinePurchase(purchase: InsertMedicinePurchase): Promise<MedicinePurchase> {
    const [created] = await db.insert(medicinePurchases).values(purchase as typeof medicinePurchases.$inferInsert).returning();
    return created;
  }

  async updateMedicinePurchase(id: number, data: Partial<InsertMedicinePurchase>): Promise<MedicinePurchase | undefined> {
    const [updated] = await db.update(medicinePurchases).set(data).where(eq(medicinePurchases.id, id)).returning();
    return updated;
  }

  async deleteMedicinePurchase(id: number): Promise<void> {
    await db.delete(medicinePurchases).where(eq(medicinePurchases.id, id));
  }

  async getPatientMonitorDevices(): Promise<PatientMonitorDevice[]> {
    return db.select().from(patientMonitorDevices).where(eq(patientMonitorDevices.isActive, true)).orderBy(desc(patientMonitorDevices.lastReadingAt));
  }

  async getPatientMonitorDevice(id: number): Promise<PatientMonitorDevice | undefined> {
    const [row] = await db.select().from(patientMonitorDevices).where(eq(patientMonitorDevices.id, id));
    return row;
  }

  async getPatientMonitorDeviceByIdentifier(deviceIdentifier: string): Promise<PatientMonitorDevice | undefined> {
    const [row] = await db.select().from(patientMonitorDevices).where(eq(patientMonitorDevices.deviceIdentifier, deviceIdentifier));
    return row;
  }

  async createPatientMonitorDevice(device: InsertPatientMonitorDevice): Promise<PatientMonitorDevice> {
    const [created] = await db.insert(patientMonitorDevices).values(device as typeof patientMonitorDevices.$inferInsert).returning();
    return created;
  }

  async updatePatientMonitorDevice(id: number, data: Partial<InsertPatientMonitorDevice>): Promise<PatientMonitorDevice | undefined> {
    const [updated] = await db.update(patientMonitorDevices).set(data).where(eq(patientMonitorDevices.id, id)).returning();
    return updated;
  }

  async createPatientMonitorReading(reading: InsertPatientMonitorReading): Promise<PatientMonitorReading> {
    const [created] = await db.insert(patientMonitorReadings).values(reading as typeof patientMonitorReadings.$inferInsert).returning();
    return created;
  }

  async getPatientMonitorReadings(filters: { deviceId?: number; patientId?: number; visitId?: number; limit?: number }): Promise<any[]> {
    const limit = Math.min(filters.limit ?? 100, 500);
    const conds: ReturnType<typeof eq>[] = [];
    if (filters.deviceId != null) conds.push(eq(patientMonitorReadings.deviceId, filters.deviceId));
    if (filters.patientId != null) conds.push(eq(patientMonitorReadings.patientId, filters.patientId));
    if (filters.visitId != null) conds.push(eq(patientMonitorReadings.visitId, filters.visitId));
    const baseQuery = db.select({
      id: patientMonitorReadings.id,
      deviceId: patientMonitorReadings.deviceId,
      patientId: patientMonitorReadings.patientId,
      visitId: patientMonitorReadings.visitId,
      heartRate: patientMonitorReadings.heartRate,
      spo2: patientMonitorReadings.spo2,
      sbp: patientMonitorReadings.sbp,
      dbp: patientMonitorReadings.dbp,
      temperature: patientMonitorReadings.temperature,
      respiratoryRate: patientMonitorReadings.respiratoryRate,
      recordedAt: patientMonitorReadings.recordedAt,
    }).from(patientMonitorReadings).orderBy(desc(patientMonitorReadings.recordedAt)).limit(limit);
    if (conds.length > 0) {
      return baseQuery.where(and(...conds));
    }
    return baseQuery;
  }

  async getLatestPatientMonitorReadings(deviceIds?: number[]): Promise<any[]> {
    const devices = deviceIds && deviceIds.length > 0
      ? await db.select().from(patientMonitorDevices).where(inArray(patientMonitorDevices.id, deviceIds))
      : await db.select().from(patientMonitorDevices).where(eq(patientMonitorDevices.isActive, true));
    const results: any[] = [];
    for (const dev of devices) {
      const [latest] = await db.select().from(patientMonitorReadings)
        .where(eq(patientMonitorReadings.deviceId, dev.id))
        .orderBy(desc(patientMonitorReadings.recordedAt))
        .limit(1);
      if (latest) {
        results.push({ ...latest, device: dev });
      }
    }
    return results;
  }
}

export const storage = new DatabaseStorage();
