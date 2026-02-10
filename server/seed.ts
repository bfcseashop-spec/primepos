import { db } from "./db";
import { roles, users, patients, services, medicines, opdVisits, bills, expenses, bankTransactions, investments, integrations, clinicSettings } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedDatabase() {
  const [existingPatients] = await db.select({ count: count() }).from(patients);
  if (existingPatients.count > 0) return;

  console.log("Seeding database...");

  // Roles
  const [adminRole] = await db.insert(roles).values([
    { name: "Admin", permissions: { dashboard: { read: true, write: true, delete: true }, opd: { read: true, write: true, delete: true }, billing: { read: true, write: true, delete: true }, services: { read: true, write: true, delete: true }, medicines: { read: true, write: true, delete: true }, expenses: { read: true, write: true, delete: true }, bank: { read: true, write: true, delete: true }, investments: { read: true, write: true, delete: true }, staff: { read: true, write: true, delete: true }, integrations: { read: true, write: true, delete: true }, settings: { read: true, write: true, delete: true }, reports: { read: true, write: true, delete: true } } },
    { name: "Doctor", permissions: { dashboard: { read: true, write: false, delete: false }, opd: { read: true, write: true, delete: false }, billing: { read: true, write: true, delete: false }, services: { read: true, write: false, delete: false }, medicines: { read: true, write: false, delete: false }, expenses: { read: false, write: false, delete: false }, bank: { read: false, write: false, delete: false }, investments: { read: false, write: false, delete: false }, staff: { read: false, write: false, delete: false }, integrations: { read: true, write: false, delete: false }, settings: { read: false, write: false, delete: false }, reports: { read: true, write: false, delete: false } } },
    { name: "Receptionist", permissions: { dashboard: { read: true, write: false, delete: false }, opd: { read: true, write: true, delete: false }, billing: { read: true, write: true, delete: false }, services: { read: true, write: false, delete: false }, medicines: { read: true, write: false, delete: false }, expenses: { read: false, write: false, delete: false }, bank: { read: false, write: false, delete: false }, investments: { read: false, write: false, delete: false }, staff: { read: false, write: false, delete: false }, integrations: { read: false, write: false, delete: false }, settings: { read: false, write: false, delete: false }, reports: { read: false, write: false, delete: false } } },
  ]).returning();

  // Staff
  await db.insert(users).values([
    { username: "admin", password: "admin123", fullName: "Dr. Sarah Mitchell", email: "sarah@clinic.com", phone: "+1-555-0101", roleId: adminRole.id, isActive: true },
    { username: "drjones", password: "doctor123", fullName: "Dr. Michael Jones", email: "michael@clinic.com", phone: "+1-555-0102", roleId: adminRole.id + 1, isActive: true },
    { username: "reception", password: "reception123", fullName: "Emily Parker", email: "emily@clinic.com", phone: "+1-555-0103", roleId: adminRole.id + 2, isActive: true },
  ]);

  // Patients
  const insertedPatients = await db.insert(patients).values([
    { patientId: "PAT-001", name: "James Wilson", age: 45, gender: "male", phone: "+1-555-1001", email: "james@email.com", address: "123 Oak Street, Springfield", bloodGroup: "A+" },
    { patientId: "PAT-002", name: "Maria Garcia", age: 32, gender: "female", phone: "+1-555-1002", email: "maria@email.com", address: "456 Maple Ave, Springfield", bloodGroup: "O+" },
    { patientId: "PAT-003", name: "Robert Chen", age: 58, gender: "male", phone: "+1-555-1003", email: "robert@email.com", address: "789 Pine Road, Springfield", bloodGroup: "B+" },
    { patientId: "PAT-004", name: "Lisa Thompson", age: 28, gender: "female", phone: "+1-555-1004", email: "lisa@email.com", address: "321 Elm Lane, Springfield", bloodGroup: "AB-" },
    { patientId: "PAT-005", name: "Ahmed Hassan", age: 41, gender: "male", phone: "+1-555-1005", email: "ahmed@email.com", address: "654 Cedar Blvd, Springfield", bloodGroup: "O-" },
  ]).returning();

  // Services
  const insertedServices = await db.insert(services).values([
    { name: "General Consultation", category: "Consultation", price: "50.00", description: "Standard doctor consultation", isActive: true },
    { name: "Specialist Consultation", category: "Consultation", price: "100.00", description: "Specialist doctor consultation", isActive: true },
    { name: "Complete Blood Count", category: "Laboratory", price: "35.00", description: "CBC test", isActive: true },
    { name: "Blood Sugar Test", category: "Laboratory", price: "20.00", description: "Fasting and random blood sugar", isActive: true },
    { name: "Chest X-Ray", category: "Radiology", price: "75.00", description: "Standard chest X-ray", isActive: true },
    { name: "Abdominal Ultrasound", category: "Ultrasound", price: "120.00", description: "Full abdominal ultrasound scan", isActive: true },
    { name: "ECG / EKG", category: "ECG", price: "40.00", description: "Electrocardiogram test", isActive: true },
    { name: "Urine Analysis", category: "Laboratory", price: "25.00", description: "Complete urine analysis", isActive: true },
  ]).returning();

  // Medicines
  await db.insert(medicines).values([
    { name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Capsule", manufacturer: "PharmaCorp", batchNo: "AMX-2025-001", expiryDate: "2027-06-15", quantity: 500, unitPrice: "0.50", sellingPrice: "1.20", isActive: true },
    { name: "Paracetamol 500mg", genericName: "Acetaminophen", category: "Tablet", manufacturer: "MedPlus", batchNo: "PCT-2025-002", expiryDate: "2027-12-31", quantity: 1000, unitPrice: "0.10", sellingPrice: "0.30", isActive: true },
    { name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Capsule", manufacturer: "GastroHealth", batchNo: "OMP-2025-003", expiryDate: "2027-03-20", quantity: 300, unitPrice: "0.80", sellingPrice: "1.50", isActive: true },
    { name: "Ciprofloxacin 250mg", genericName: "Ciprofloxacin", category: "Tablet", manufacturer: "AntiBiotics Ltd", batchNo: "CPX-2025-004", expiryDate: "2026-09-10", quantity: 8, unitPrice: "0.60", sellingPrice: "1.40", isActive: true },
    { name: "Cough Syrup", genericName: "Dextromethorphan", category: "Syrup", manufacturer: "CoughCare", batchNo: "CSY-2025-005", expiryDate: "2026-08-25", quantity: 150, unitPrice: "2.00", sellingPrice: "4.50", isActive: true },
  ]);

  // OPD Visits
  const insertedVisits = await db.insert(opdVisits).values([
    { visitId: "VIS-001", patientId: insertedPatients[0].id, doctorName: "Dr. Sarah Mitchell", symptoms: "Persistent cough, mild fever", diagnosis: "Upper respiratory infection", prescription: "Amoxicillin 500mg TDS x 5 days, Paracetamol SOS", notes: "Follow up in 5 days", status: "completed" },
    { visitId: "VIS-002", patientId: insertedPatients[1].id, doctorName: "Dr. Michael Jones", symptoms: "Abdominal pain, nausea", diagnosis: "Gastritis", prescription: "Omeprazole 20mg BD x 14 days", notes: "Advised bland diet", status: "completed" },
    { visitId: "VIS-003", patientId: insertedPatients[2].id, doctorName: "Dr. Sarah Mitchell", symptoms: "Chest discomfort, shortness of breath", diagnosis: "Pending ECG results", prescription: "Rest advised", notes: "ECG scheduled", status: "active" },
    { visitId: "VIS-004", patientId: insertedPatients[3].id, doctorName: "Dr. Michael Jones", symptoms: "Routine checkup", diagnosis: "Healthy - all vitals normal", prescription: "Multivitamin daily", status: "completed" },
    { visitId: "VIS-005", patientId: insertedPatients[4].id, doctorName: "Dr. Sarah Mitchell", symptoms: "Joint pain, swelling in knee", diagnosis: "Mild arthritis", prescription: "NSAIDs, physiotherapy referral", status: "active" },
  ]).returning();

  // Bills
  await db.insert(bills).values([
    { billNo: "BILL-001", patientId: insertedPatients[0].id, visitId: insertedVisits[0].id, items: [{ name: "General Consultation", type: "service", quantity: 1, unitPrice: 50, total: 50 }, { name: "Amoxicillin 500mg", type: "medicine", quantity: 15, unitPrice: 1.20, total: 18 }], subtotal: "68.00", discount: "0.00", tax: "0.00", total: "68.00", paidAmount: "68.00", paymentMethod: "cash", status: "paid" },
    { billNo: "BILL-002", patientId: insertedPatients[1].id, visitId: insertedVisits[1].id, items: [{ name: "Specialist Consultation", type: "service", quantity: 1, unitPrice: 100, total: 100 }, { name: "Abdominal Ultrasound", type: "service", quantity: 1, unitPrice: 120, total: 120 }, { name: "Omeprazole 20mg", type: "medicine", quantity: 28, unitPrice: 1.50, total: 42 }], subtotal: "262.00", discount: "12.00", tax: "0.00", total: "250.00", paidAmount: "250.00", paymentMethod: "card", status: "paid" },
    { billNo: "BILL-003", patientId: insertedPatients[2].id, visitId: insertedVisits[2].id, items: [{ name: "General Consultation", type: "service", quantity: 1, unitPrice: 50, total: 50 }, { name: "ECG / EKG", type: "service", quantity: 1, unitPrice: 40, total: 40 }, { name: "Chest X-Ray", type: "service", quantity: 1, unitPrice: 75, total: 75 }], subtotal: "165.00", discount: "0.00", tax: "0.00", total: "165.00", paidAmount: "100.00", paymentMethod: "cash", status: "partial" },
    { billNo: "BILL-004", patientId: insertedPatients[3].id, visitId: insertedVisits[3].id, items: [{ name: "General Consultation", type: "service", quantity: 1, unitPrice: 50, total: 50 }, { name: "Complete Blood Count", type: "service", quantity: 1, unitPrice: 35, total: 35 }], subtotal: "85.00", discount: "5.00", tax: "0.00", total: "80.00", paidAmount: "80.00", paymentMethod: "bank_transfer", status: "paid" },
  ]);

  // Expenses
  await db.insert(expenses).values([
    { category: "Rent", description: "Monthly clinic rent - February", amount: "3500.00", paymentMethod: "bank_transfer", date: "2026-02-01", notes: "Paid to landlord" },
    { category: "Utilities", description: "Electricity bill - January", amount: "280.00", paymentMethod: "bank_transfer", date: "2026-01-28" },
    { category: "Medical Supplies", description: "Surgical gloves and masks bulk order", amount: "450.00", paymentMethod: "card", date: "2026-02-05" },
    { category: "Salaries", description: "Staff salaries - January", amount: "8500.00", paymentMethod: "bank_transfer", date: "2026-01-31" },
    { category: "Maintenance", description: "AC repair and maintenance", amount: "350.00", paymentMethod: "cash", date: "2026-02-08" },
  ]);

  // Bank Transactions
  await db.insert(bankTransactions).values([
    { type: "deposit", amount: "5000.00", bankName: "First National Bank", accountNo: "****1234", referenceNo: "TXN-20260201", description: "Revenue deposit - Week 1 Feb", date: "2026-02-01" },
    { type: "withdrawal", amount: "3500.00", bankName: "First National Bank", accountNo: "****1234", referenceNo: "TXN-20260202", description: "Rent payment", date: "2026-02-01" },
    { type: "deposit", amount: "3200.00", bankName: "First National Bank", accountNo: "****1234", referenceNo: "TXN-20260205", description: "Revenue deposit - Week 2 Feb", date: "2026-02-05" },
    { type: "withdrawal", amount: "8500.00", bankName: "City Bank", accountNo: "****5678", referenceNo: "TXN-20260131", description: "Staff salaries", date: "2026-01-31" },
    { type: "deposit", amount: "2000.00", bankName: "City Bank", accountNo: "****5678", referenceNo: "TXN-20260208", description: "Insurance reimbursement", date: "2026-02-08" },
  ]);

  // Investments
  await db.insert(investments).values([
    { title: "Digital X-Ray Machine", category: "Equipment", amount: "25000.00", returnAmount: "0", investorName: "Dr. Sarah Mitchell", status: "active", startDate: "2026-01-15", notes: "New digital X-ray system for clinic" },
    { title: "Clinic Expansion - Room 3", category: "Expansion", amount: "15000.00", returnAmount: "0", investorName: "Partners Fund", status: "active", startDate: "2026-02-01", endDate: "2026-06-01", notes: "Adding third consultation room" },
    { title: "Lab Equipment Upgrade", category: "Equipment", amount: "8000.00", returnAmount: "0", investorName: "Dr. Michael Jones", status: "completed", startDate: "2025-11-01", endDate: "2026-01-10", notes: "Upgraded blood analyzer" },
  ]);

  // Integrations
  await db.insert(integrations).values([
    { deviceName: "Philips Affiniti 50", deviceType: "ultrasound", connectionType: "TCP/IP", ipAddress: "192.168.1.50", port: "4242", status: "connected", config: {} },
    { deviceName: "Canon CXDI-701", deviceType: "xray", connectionType: "DICOM", ipAddress: "192.168.1.51", port: "11112", status: "connected", config: {} },
    { deviceName: "GE MAC 800", deviceType: "ecg", connectionType: "USB", port: "COM3", status: "disconnected", config: {} },
    { deviceName: "HP LaserJet Pro M404", deviceType: "printer", connectionType: "TCP/IP", ipAddress: "192.168.1.100", port: "9100", status: "connected", config: {} },
  ]);

  // Settings
  await db.insert(clinicSettings).values({
    clinicName: "Springfield Medical Clinic",
    address: "100 Healthcare Ave, Springfield, IL 62701",
    phone: "+1-555-CLINIC",
    email: "info@springfieldclinic.com",
    currency: "USD",
    taxRate: "0",
    invoicePrefix: "INV",
    visitPrefix: "VIS",
    patientPrefix: "PAT",
  });

  console.log("Database seeded successfully!");
}
