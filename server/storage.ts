import { eq, desc, sql, and, gte, lte, count, sum } from "drizzle-orm";
import { db } from "./db";
import {
  users, roles, patients, services, medicines, opdVisits, bills,
  expenses, bankTransactions, investments, integrations, clinicSettings, labTests,
  type InsertUser, type User, type InsertRole, type Role,
  type InsertPatient, type Patient, type InsertService, type Service,
  type InsertMedicine, type Medicine, type InsertOpdVisit, type OpdVisit,
  type InsertBill, type Bill, type InsertExpense, type Expense,
  type InsertBankTransaction, type BankTransaction,
  type InsertInvestment, type Investment,
  type InsertIntegration, type Integration,
  type InsertClinicSettings, type ClinicSettings,
  type InsertLabTest, type LabTest
} from "@shared/schema";

export interface IStorage {
  getUsers(): Promise<any[]>;
  getUser(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;

  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;

  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;

  getMedicines(): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  updateMedicine(id: number, data: Partial<InsertMedicine>): Promise<Medicine | undefined>;
  deleteMedicine(id: number): Promise<void>;

  getOpdVisits(): Promise<any[]>;
  getOpdVisit(id: number): Promise<OpdVisit | undefined>;
  createOpdVisit(visit: InsertOpdVisit): Promise<OpdVisit>;
  updateOpdVisit(id: number, data: Partial<InsertOpdVisit>): Promise<OpdVisit | undefined>;

  getBills(): Promise<any[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined>;
  deleteBill(id: number): Promise<void>;

  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  getBankTransactions(): Promise<BankTransaction[]>;
  createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction>;

  getInvestments(): Promise<Investment[]>;
  createInvestment(inv: InsertInvestment): Promise<Investment>;

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
  getNextLabTestCode(): Promise<string>;

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
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: number, data: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getMedicines(): Promise<Medicine[]> {
    return db.select().from(medicines).orderBy(medicines.name);
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const [med] = await db.select().from(medicines).where(eq(medicines.id, id));
    return med;
  }

  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const [created] = await db.insert(medicines).values(medicine).returning();
    return created;
  }

  async updateMedicine(id: number, data: Partial<InsertMedicine>): Promise<Medicine | undefined> {
    const [updated] = await db.update(medicines).set(data).where(eq(medicines.id, id)).returning();
    return updated;
  }

  async deleteMedicine(id: number): Promise<void> {
    await db.delete(medicines).where(eq(medicines.id, id));
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
    const [created] = await db.insert(opdVisits).values(visit).returning();
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
    const [created] = await db.insert(bills).values(bill).returning();
    return created;
  }

  async updateBill(id: number, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updated] = await db.update(bills).set(data).where(eq(bills.id, id)).returning();
    return updated;
  }

  async deleteBill(id: number): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return db.select().from(bankTransactions).orderBy(desc(bankTransactions.date));
  }

  async createBankTransaction(tx: InsertBankTransaction): Promise<BankTransaction> {
    const [created] = await db.insert(bankTransactions).values(tx).returning();
    return created;
  }

  async getInvestments(): Promise<Investment[]> {
    return db.select().from(investments).orderBy(desc(investments.startDate));
  }

  async createInvestment(inv: InsertInvestment): Promise<Investment> {
    const [created] = await db.insert(investments).values(inv).returning();
    return created;
  }

  async getIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations).orderBy(integrations.deviceName);
  }

  async createIntegration(int: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(integrations).values(int).returning();
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
    if (existing) {
      const [updated] = await db.update(clinicSettings).set(s).where(eq(clinicSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(clinicSettings).values(s).returning();
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
      isActive: labTests.isActive,
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
    const [created] = await db.insert(labTests).values(test).returning();
    return created;
  }

  async updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined> {
    const [updated] = await db.update(labTests).set(data).where(eq(labTests.id, id)).returning();
    return updated;
  }

  async deleteLabTest(id: number): Promise<void> {
    await db.delete(labTests).where(eq(labTests.id, id));
  }

  async getNextLabTestCode(): Promise<string> {
    const [result] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(labTests);
    const num = (result.maxId || 0) + 1;
    return `LAB-${String(num).padStart(4, '0')}`;
  }
}

export const storage = new DatabaseStorage();
