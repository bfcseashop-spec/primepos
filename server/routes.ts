import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createRequirePermission } from "./permissions";
import { mergePermissions } from "@shared/permissions";
import {
  insertPatientSchema, insertOpdVisitSchema, insertBillSchema,
  insertDuePaymentSchema,
  insertServiceSchema, insertInjectionSchema, insertMedicineSchema, insertExpenseSchema,
  insertBankTransactionSchema, insertInvestorSchema, insertInvestmentSchema, insertContributionSchema,
  insertPackageSchema,
  insertMedicinePurchaseSchema,
  insertUserSchema, insertRoleSchema, insertIntegrationSchema,
  insertClinicSettingsSchema, insertLabTestSchema, insertAppointmentSchema,
  insertDoctorSchema, insertSalarySchema,
  insertSalaryProfileSchema, insertSalaryLoanSchema, insertLoanInstallmentSchema,
  insertPayrollRunSchema, insertPayslipSchema,
} from "@shared/schema";
import { pushNotification, broadcastPatientMonitorReading } from "./websocket";
import type { NotificationPayload } from "@shared/notifications";
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

const userSignaturesDir = path.join(process.cwd(), "uploads", "user-signatures");
if (!fs.existsSync(userSignaturesDir)) {
  fs.mkdirSync(userSignaturesDir, { recursive: true });
}

/** Safely get string from req.query (handles string | string[] from repeated params). */
function qStr(q: Record<string, unknown>, key: string): string | undefined {
  const v = q[key];
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() || undefined;
  if (Array.isArray(v) && v.length > 0) return (v[0] && String(v[0]).trim()) || undefined;
  return String(v).trim() || undefined;
}

/** Safely get number from req.query with default. */
function qInt(q: Record<string, unknown>, key: string, def: number): number {
  const v = q[key];
  if (v == null) return def;
  const s = typeof v === "string" ? v : Array.isArray(v) ? String(v[0]) : String(v);
  const n = parseInt(s, 10);
  return isNaN(n) ? def : n;
}

const userSignatureUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, userSignaturesDir),
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
  limits: { fileSize: 2 * 1024 * 1024 },
});

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

  // --- HRM / Attendance (per clinic user + ADMS device integration) ---

  function isAdminLikeRoleName(roleName: string | null | undefined): boolean {
    if (!roleName) return false;
    const lower = roleName.toLowerCase();
    return lower.includes("admin");
  }

  // Minimal ADMS/ZKTeco integration: auto check-in/out from devices.
  // We support common ZKTeco ATTLOG formats and map device PIN -> PrimePOS user.
  // Note: In Express 5, wildcard segments must use :param(*) rather than bare *.
  // Using the base "/iclock" prefix here ensures all /iclock/... paths are matched.
  app.use("/iclock", express.text({ type: "*/*" }));
  app.use("/iclock", express.urlencoded({ extended: true }));

  const handleAdmsAttendance = async (req: express.Request, res: express.Response) => {
    const tableTypeRaw = (req.query as any).table;
    const tableType = typeof tableTypeRaw === "string" ? tableTypeRaw.toUpperCase() : "";

    // For non-attendance tables (device options, logs, etc.) just acknowledge.
    if (tableType && tableType !== "ATTLOG") {
      res.setHeader("Content-Type", "text/plain");
      return res.send("OK");
    }

    try {
      // Read raw body as text
      let bodyText = "";
      if (typeof req.body === "string") {
        bodyText = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        bodyText = req.body.toString("utf8");
      } else if ((req as any).rawBody && typeof (req as any).rawBody === "string") {
        bodyText = (req as any).rawBody;
      } else {
        bodyText = String(req.body ?? "");
      }

      const lines = bodyText
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        res.setHeader("Content-Type", "text/plain");
        return res.send("OK");
      }

      const users = await storage.getUsers();

      const parseRecords = () => {
        const records: Array<{ pin: string; time: string; status: string }> = [];
        for (const line of lines) {
          let pin = "";
          let time = "";
          let status = "0";

          // Tab-separated: PIN \t Time \t Status ...
          if (line.includes("\t")) {
            const parts = line
              .split("\t")
              .map((p) => p.trim())
              .filter((p) => p.length > 0);
            if (parts.length >= 2) {
              pin = parts[0];
              time = parts[1];
              status = parts[2] ?? "0";
            }
          } else if (line.match(/^\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/)) {
            // Space-separated: PIN  YYYY-MM-DD HH:mm:ss  Status ...
            const parts = line
              .split(/\s{2,}/)
              .map((p) => p.trim())
              .filter((p) => p.length > 0);
            if (parts.length >= 2) {
              pin = parts[0];
              if (
                parts[1]?.match(/^\d{4}-\d{2}-\d{2}$/) &&
                parts[2]?.match(/^\d{2}:\d{2}:\d{2}$/)
              ) {
                time = `${parts[1]} ${parts[2]}`;
                status = parts[3] ?? "0";
              } else {
                time = parts[1];
                status = parts[2] ?? "0";
              }
            }
          } else {
            // Comma-separated key=value: PIN=...,Time=...,Status=...
            const parts = line.split(",");
            for (const part of parts) {
              const m = part.match(/(\w+)=(.+)/);
              if (!m) continue;
              const key = m[1].trim().toLowerCase();
              const value = m[2].trim();
              if (key === "pin" || key === "uid" || key === "userid") pin = value;
              else if (key === "time" || key === "timestamp") time = value;
              else if (key === "status") status = value;
            }
          }

          if (pin && time) {
            records.push({ pin, time, status });
          }
        }
        return records;
      };

      const records = parseRecords();
      if (records.length === 0) {
        res.setHeader("Content-Type", "text/plain");
        return res.send("OK");
      }

      for (const rec of records) {
        const pinStr = String(rec.pin).trim();

        const user = users.find((u: any) => {
          const idStr = String(u.id).trim();
          const usernameStr = String(u.username ?? "").trim();
          if (idStr === pinStr) return true;
          if (usernameStr === pinStr) return true;
          const idNum = parseInt(idStr, 10);
          const pinNum = parseInt(pinStr, 10);
          if (!Number.isNaN(idNum) && !Number.isNaN(pinNum) && idNum === pinNum) return true;
          return false;
        });

        if (!user) {
          continue;
        }

        let deviceTime: Date | null = null;
        const t = rec.time;
        try {
          if (t.includes("-") && t.includes(" ")) {
            deviceTime = new Date(t);
          } else if (t.length === 14 && /^\d+$/.test(t)) {
            const year = t.substring(0, 4);
            const month = t.substring(4, 6);
            const day = t.substring(6, 8);
            const hour = t.substring(8, 10);
            const minute = t.substring(10, 12);
            const second = t.substring(12, 14);
            deviceTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
          } else if (/^\d+$/.test(t)) {
            deviceTime = new Date(parseInt(t, 10) * 1000);
          }
        } catch {
          deviceTime = null;
        }

        const recordTime = deviceTime ?? new Date();
        const recordDate = new Date(recordTime);
        recordDate.setHours(0, 0, 0, 0);

        const isCheckIn =
          rec.status === "0" || rec.status === "CheckIn" || rec.status === "CHECKIN";
        const isCheckOut =
          rec.status === "1" || rec.status === "CheckOut" || rec.status === "CHECKOUT";

        if (!isCheckIn && !isCheckOut) continue;

        const existing = await storage.getTodayHrmAttendance(user.id, recordTime);

        if (existing) {
          if (isCheckIn) {
            if (!existing.checkInTime) {
              await storage.updateHrmAttendance(existing.id, {
                checkInTime: recordTime,
                status: "present",
              });
            }
          } else if (isCheckOut && !existing.checkOutTime) {
            const checkIn = existing.checkInTime ?? recordTime;
            const minutes = Math.max(
              0,
              Math.round((recordTime.getTime() - checkIn.getTime()) / 60000),
            );
            await storage.updateHrmAttendance(existing.id, {
              checkOutTime: recordTime,
              workingMinutes: minutes,
              status: existing.status ?? "present",
            });
          }
        } else {
          if (isCheckIn) {
            await storage.createHrmAttendance({
              userId: user.id,
              date: recordDate,
              checkInTime: recordTime,
              status: "present",
              workingMinutes: 0,
              notes: null,
            } as any);
          } else if (isCheckOut) {
            await storage.createHrmAttendance({
              userId: user.id,
              date: recordDate,
              checkOutTime: recordTime,
              status: "present",
              workingMinutes: 0,
              notes: null,
            } as any);
          }
        }
      }

      res.setHeader("Content-Type", "text/plain");
      return res.send("OK");
    } catch (err: any) {
      console.error("ADMS attendance error:", err);
      res.status(500).json({ message: err?.message || "ADMS attendance error" });
    }
  };

  // Common ADMS endpoints some ZKTeco firmwares use
  app.post("/iclock/cdata", handleAdmsAttendance);
  app.post("/api/adms/attendance", handleAdmsAttendance);
  app.post("/adms/attendance", handleAdmsAttendance);

  app.get("/api/hrm/attendance/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      const records = await storage.getHrmAttendanceForUser(Number(userId), from, today);
      const byDate = new Map<string, any>();
      for (const r of records) {
        const raw = r.date as unknown as string;
        const dateKey = raw.slice(0, 10);
        byDate.set(dateKey, r);
      }
      const todayKey = today.toISOString().slice(0, 10);
      const todayRec = byDate.get(todayKey) ?? null;
      const resultToday = todayRec && {
        date: todayRec.date,
        status: todayRec.status as any,
        checkInTime: todayRec.checkInTime,
        checkOutTime: todayRec.checkOutTime,
        workingMinutes: todayRec.workingMinutes ?? 0,
      };
      const recent: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const rec = byDate.get(key);
        recent.push({
          date: d.toISOString(),
          status: (rec?.status ?? "scheduled") as any,
          checkInTime: rec?.checkInTime ?? null,
          checkOutTime: rec?.checkOutTime ?? null,
          workingMinutes: rec?.workingMinutes ?? 0,
        });
      }
      res.json({ today: resultToday, recent });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/hrm/attendance/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const today = new Date();
      const to =
        typeof req.query.to === "string"
          ? new Date(`${req.query.to}T23:59:59.999Z`)
          : today;
      const from =
        typeof req.query.from === "string"
          ? new Date(`${req.query.from}T00:00:00.000Z`)
          : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

      const records = await storage.getHrmAttendanceForUser(
        Number(userId),
        from,
        to,
      );

      res.json(
        records.map((r) => ({
          id: r.id,
          date: (r.date as unknown as string)?.slice(0, 10),
          status: r.status,
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          workingMinutes: r.workingMinutes ?? 0,
          notes: r.notes ?? null,
        })),
      );
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load history" });
    }
  });

  app.get("/api/hrm/attendance/all", requireAuth, async (req, res) => {
    try {
      const roleId = req.session.roleId;
      let roleName: string | null = null;
      if (roleId) {
        const role = await storage.getRole(roleId);
        roleName = role?.name ?? null;
      }
      if (!isAdminLikeRoleName(roleName)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 6);

      const records = await storage.getHrmAttendanceForAll(from, today);
      res.json({
        recent: records.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          fullName: r.fullName,
          date: (r.date as unknown as string)?.slice(0, 10),
          status: r.status,
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          workingMinutes: r.workingMinutes ?? 0,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load HRM attendance for all users" });
    }
  });

  app.post("/api/hrm/attendance/check-in", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const today = new Date();
      const existing = await storage.getTodayHrmAttendance(Number(userId), today);
      if (existing?.checkInTime) {
        return res.status(400).json({ message: "Already checked in today" });
      }
      const recordData = existing
        ? { checkInTime: new Date(), status: "present" as const }
        : {
            userId,
            date: today,
            checkInTime: new Date(),
            status: "present" as const,
            workingMinutes: 0,
          };
      const rec = existing
        ? await storage.updateHrmAttendance(existing.id, recordData)
        : await storage.createHrmAttendance(recordData as any);
      res.json({
        date: rec!.date,
        status: rec!.status,
        checkInTime: rec!.checkInTime,
        checkOutTime: rec!.checkOutTime,
        workingMinutes: rec!.workingMinutes ?? 0,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/hrm/attendance/check-out", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const today = new Date();
      const existing = await storage.getTodayHrmAttendance(Number(userId), today);
      if (!existing || !existing.checkInTime) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      if (existing.checkOutTime) {
        return res.status(400).json({ message: "Already checked out today" });
      }
      const now = new Date();
      const diffMs = now.getTime() - new Date(existing.checkInTime).getTime();
      const workingMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
      const rec = await storage.updateHrmAttendance(existing.id, {
        checkOutTime: now,
        workingMinutes,
      });
      res.json({
        date: rec!.date,
        status: rec!.status,
        checkInTime: rec!.checkInTime,
        checkOutTime: rec!.checkOutTime,
        workingMinutes: rec!.workingMinutes ?? workingMinutes,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  function isAdminRole(role?: string | null): boolean {
    if (!role) return false;
    const r = role.toLowerCase();
    return r === "admin" || r.includes("super admin");
  }

  function shouldDeliverToUser(
    user: { roleName?: string | null; fullName?: string | null },
    payload: NotificationPayload
  ): boolean {
    if (isAdminRole(user.roleName)) return true;
    const role = (user.roleName || "").toLowerCase();
    const full = (user.fullName || "").toLowerCase();

    switch (payload.audience) {
      case "all":
        return true;
      case "doctor":
        if (!role.includes("doctor")) return false;
        if (!payload.doctorName) return true;
        return full.includes(payload.doctorName.toLowerCase());
      case "pharmacist":
        return role.includes("pharmacist");
      case "receptionist":
        return role.includes("receptionist") || role.includes("front desk");
      case "lab_technologist":
        return role.includes("lab") || role.includes("technologist");
      case "manager":
        return role.includes("manager");
      case "staff":
        return !!user.roleName;
      case "admin":
        return isAdminRole(user.roleName);
      default:
        return false;
    }
  }

  async function persistNotificationForAudience(payload: NotificationPayload): Promise<void> {
    try {
      const users = await storage.getUsers();
      const recipients = users.filter((u) => shouldDeliverToUser({ roleName: u.roleName, fullName: u.fullName }, payload));
      if (recipients.length === 0) return;
      await Promise.all(
        recipients.map((u) =>
          storage.createUserNotification({
            userId: u.id,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            audience: payload.audience,
            doctorName: payload.doctorName ?? null,
            data: payload.data ?? null,
          }),
        ),
      );
    } catch (err) {
      console.error("Failed to persist notification", err);
    }
  }

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
      let permissions: Record<string, Record<string, boolean>> = {};
      if (user.roleId) {
        const role = await storage.getRole(user.roleId);
        if (role) {
          roleName = role.name;
          permissions = mergePermissions(role.permissions);
        }
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
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          roleId: user.roleId,
          role: roleName,
          permissions,
        });
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
    let permissions: Record<string, Record<string, boolean>> = {};
    if (req.session.roleId) {
      const role = await storage.getRole(req.session.roleId);
      if (role) {
        roleName = role.name;
        permissions = mergePermissions(role.permissions);
      }
    }
    res.json({
      id: req.session.userId,
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email,
      roleId: req.session.roleId,
      role: roleName,
      permissions,
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
          "Medicine Name": "Paracetamol 500mg", Category: "Tablet",
          "Purchase Price (Per Pcs)": "1.00", "Selling Price (Per Pcs)": "1.50",
          "Quantity (Total Pcs)": 100, Unit: "Box",
          Available: 1000, Status: "Active", "Expiry Date": "2027-12-31",
        },
        {
          "Medicine Name": "Amoxicillin 500mg", Category: "Capsule",
          "Purchase Price (Per Pcs)": "5.00", "Selling Price (Per Pcs)": "8.00",
          "Quantity (Total Pcs)": 50, Unit: "Box",
          Available: 500, Status: "Active", "Expiry Date": "2027-06-15",
        },
        {
          "Medicine Name": "Cough Syrup", Category: "Syrup",
          "Purchase Price (Per Pcs)": "6.00", "Selling Price (Per Pcs)": "9.00",
          "Quantity (Total Pcs)": 1, Unit: "Bottle",
          Available: 150, Status: "Active", "Expiry Date": "2026-08-25",
        },
        {
          "Medicine Name": "Omeprazole 20mg", Category: "Capsule",
          "Purchase Price (Per Pcs)": "8.00", "Selling Price (Per Pcs)": "12.00",
          "Quantity (Total Pcs)": 30, Unit: "Box",
          Available: 300, Status: "Active", "Expiry Date": "2027-03-20",
        },
        {
          "Medicine Name": "Ciprofloxacin 250mg", Category: "Tablet",
          "Purchase Price (Per Pcs)": "12.00", "Selling Price (Per Pcs)": "18.00",
          "Quantity (Total Pcs)": 20, Unit: "Box",
          Available: 8, Status: "Active", "Expiry Date": "2026-09-10",
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

  // Patient Monitor ingest (no auth — device/gateway posts here)
  const ingestVitalsSchema = z.object({
    deviceIdentifier: z.string().min(1),
    deviceModel: z.string().optional().default("Smart View-Pro 12B"),
    deviceSerial: z.string().optional(),
    patientId: z.number().optional().nullable(),
    visitId: z.number().optional().nullable(),
    heartRate: z.number().optional().nullable(),
    spo2: z.number().optional().nullable(),
    sbp: z.number().optional().nullable(),
    dbp: z.number().optional().nullable(),
    temperature: z.union([z.number(), z.string()]).optional().nullable(),
    respiratoryRate: z.number().optional().nullable(),
    rawPayload: z.record(z.unknown()).optional().nullable(),
  });
  app.post("/api/patient-monitor/ingest", async (req, res) => {
    try {
      const body = validateBody(ingestVitalsSchema, req.body);
      let device = await storage.getPatientMonitorDeviceByIdentifier(body.deviceIdentifier);
      if (!device) {
        device = await storage.createPatientMonitorDevice({
          name: "Patient Monitor",
          deviceModel: body.deviceModel ?? "Smart View-Pro 12B",
          deviceSerial: body.deviceSerial ?? null,
          deviceIdentifier: body.deviceIdentifier,
          isActive: true,
        });
      }
      const tempVal = body.temperature != null ? String(body.temperature) : null;
      const reading = await storage.createPatientMonitorReading({
        deviceId: device.id,
        patientId: body.patientId ?? null,
        visitId: body.visitId ?? null,
        heartRate: body.heartRate ?? null,
        spo2: body.spo2 ?? null,
        sbp: body.sbp ?? null,
        dbp: body.dbp ?? null,
        temperature: tempVal,
        respiratoryRate: body.respiratoryRate ?? null,
        rawPayload: body.rawPayload ?? null,
      });
      await storage.updatePatientMonitorDevice(device.id, { lastReadingAt: new Date() });
      const payload = {
        id: reading.id,
        deviceId: reading.deviceId,
        patientId: reading.patientId,
        visitId: reading.visitId,
        heartRate: reading.heartRate,
        spo2: reading.spo2,
        sbp: reading.sbp,
        dbp: reading.dbp,
        temperature: reading.temperature,
        respiratoryRate: reading.respiratoryRate,
        recordedAt: reading.recordedAt?.toISOString?.() ?? new Date().toISOString(),
        device: { id: device.id, name: device.name, deviceModel: device.deviceModel, deviceSerial: device.deviceSerial, deviceIdentifier: device.deviceIdentifier },
      };
      broadcastPatientMonitorReading(payload);
      res.status(201).json(payload);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Protect all other API routes (auth + permission check)
  const requirePermission = createRequirePermission(storage);
  app.use("/api", requireAuth, requirePermission);

  // IMPORTANT: Paginated and stats routes MUST be registered BEFORE :id routes for each resource.
  // Otherwise Express matches /paginated or /stats as :id and returns 404.
  // Registered order: patients, prescriptions, bills, services, packages, medicines, expenses,
  // bank-transactions, lab-tests, sample-collections, appointments, doctors, dues.

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

  // Patients – paginated endpoint (always returns { items, total })
  app.get("/api/patients-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getPatientsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        patientTypeFilter: (req.query.patientTypeFilter as string) || undefined,
      });
      const lastVisits = await storage.getLastVisitDatesByPatientIds(result.items.map((p: any) => p.id));
      const enriched = result.items.map((p: any) => ({ ...p, lastVisitDate: lastVisits[p.id] || null }));
      res.json({ items: enriched, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Patients
  app.get("/api/patients", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getPatientsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          patientTypeFilter: (req.query.patientTypeFilter as string) || undefined,
        });
        const lastVisits = await storage.getLastVisitDatesByPatientIds(result.items.map((p: any) => p.id));
        const enriched = result.items.map((p: any) => ({ ...p, lastVisitDate: lastVisits[p.id] || null }));
        res.json({ items: enriched, total: result.total });
      } else {
        const result = await storage.getPatients();
        res.json(result);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/patients-stats", async (req, res) => {
    try {
      const result = await storage.getPatientsStats({
        search: (req.query.search as string)?.trim() || undefined,
        patientTypeFilter: (req.query.patientTypeFilter as string) || undefined,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/patients/by-patient-id", async (req, res) => {
    try {
      const patientId = (req.query.patientId as string)?.trim();
      if (!patientId) return res.status(400).json({ message: "Query parameter 'patientId' is required" });
      const patient = await storage.getPatientByPatientId(patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(patient);
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
  app.get("/api/opd-visits/next-id", async (_req, res) => {
    try {
      const visitId = await storage.getNextVisitId();
      res.json({ visitId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // OPD Visits – paginated endpoint (always returns { items, total })
  app.get("/api/opd-visits-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getOpdVisitsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        typeFilter: (req.query.typeFilter as string) || undefined,
        fromDate: (req.query.fromDate as string) || undefined,
        toDate: (req.query.toDate as string) || undefined,
        doctorName: (req.query.doctorName as string) || undefined,
        hasPrescription: req.query.hasPrescription === "true" || req.query.hasPrescription === "1",
      });
      const users = await storage.getUsers();
      const doctorUserByFullName = new Map<string, { fullName: string; qualification?: string | null; signatureUrl?: string | null }>();
      for (const u of users) {
        const name = (u.fullName || "").trim();
        if (name) doctorUserByFullName.set(name, { fullName: u.fullName, qualification: u.qualification ?? null, signatureUrl: u.signatureUrl ?? null });
      }
      const enriched = result.items.map((v: any) => {
        const dName = (v.doctorName || "").trim();
        const doctorUser = dName ? doctorUserByFullName.get(dName) ?? { fullName: dName, qualification: null, signatureUrl: null } : undefined;
        return { ...v, doctorUser };
      });
      res.json({ items: enriched, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/opd-visits", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getOpdVisitsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          typeFilter: (req.query.typeFilter as string) || undefined,
          fromDate: (req.query.fromDate as string) || undefined,
          toDate: (req.query.toDate as string) || undefined,
          doctorName: (req.query.doctorName as string) || undefined,
          hasPrescription: req.query.hasPrescription === "true" || req.query.hasPrescription === "1",
        });
        const users = await storage.getUsers();
        const doctorUserByFullName = new Map<string, { fullName: string; qualification?: string | null; signatureUrl?: string | null }>();
        for (const u of users) {
          const name = (u.fullName || "").trim();
          if (name) doctorUserByFullName.set(name, { fullName: u.fullName, qualification: u.qualification ?? null, signatureUrl: u.signatureUrl ?? null });
        }
        const enriched = result.items.map((v: any) => {
          const dName = (v.doctorName || "").trim();
          const doctorUser = dName ? doctorUserByFullName.get(dName) ?? { fullName: dName, qualification: null, signatureUrl: null } : undefined;
          return { ...v, doctorUser };
        });
        res.json({ items: enriched, total: result.total });
      } else {
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const doctorName = req.query.doctorName as string | undefined;
        const patientId = req.query.patientId != null ? Number(req.query.patientId) : undefined;
        const hasPrescription = req.query.hasPrescription === "true" || req.query.hasPrescription === "1";
        let result: any[];
        if (fromDate || toDate || (doctorName != null && doctorName.trim() !== "") || patientId != null || hasPrescription) {
          result = await storage.getOpdVisitsFiltered({ fromDate, toDate, doctorName, patientId, hasPrescription: hasPrescription || undefined });
        } else {
          result = await storage.getOpdVisits();
        }
        const users = await storage.getUsers();
        const doctorUserByFullName = new Map<string, { fullName: string; qualification?: string | null; signatureUrl?: string | null }>();
        for (const u of users) {
          const name = (u.fullName || "").trim();
          if (name) doctorUserByFullName.set(name, { fullName: u.fullName, qualification: u.qualification ?? null, signatureUrl: u.signatureUrl ?? null });
        }
        const enriched = result.map((v: any) => {
          const dName = (v.doctorName || "").trim();
          const doctorUser = dName ? doctorUserByFullName.get(dName) ?? { fullName: dName, qualification: null, signatureUrl: null } : undefined;
          return { ...v, doctorUser };
        });
        res.json(enriched);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/opd-visits/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      const numericIds = ids.map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n));
      await storage.bulkDeleteOpdVisits(numericIds);
      res.json({ success: true, deleted: numericIds.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Prescriptions – dedicated paginated endpoint for prescriptions page (always hasPrescription=true)
  app.get("/api/prescriptions-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getOpdVisitsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        fromDate: (req.query.fromDate as string) || undefined,
        toDate: (req.query.toDate as string) || undefined,
        doctorName: (req.query.doctorName as string) || undefined,
        hasPrescription: true,
      });
      const users = await storage.getUsers();
      const doctorUserByFullName = new Map<string, { fullName: string; qualification?: string | null; signatureUrl?: string | null }>();
      for (const u of users) {
        const name = (u.fullName || "").trim();
        if (name) doctorUserByFullName.set(name, { fullName: u.fullName, qualification: u.qualification ?? null, signatureUrl: u.signatureUrl ?? null });
      }
      const enriched = result.items.map((v: any) => {
        const dName = (v.doctorName || "").trim();
        const doctorUser = dName ? doctorUserByFullName.get(dName) ?? { fullName: dName, qualification: null, signatureUrl: null } : undefined;
        return { ...v, doctorUser };
      });
      res.json({ items: enriched, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Prescriptions – dedicated stats endpoint for prescriptions page
  app.get("/api/prescriptions-stats", async (req, res) => {
    try {
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const doctorName = req.query.doctorName as string | undefined;
      const visits = await storage.getOpdVisitsFiltered({ fromDate, toDate, doctorName, hasPrescription: true });
      const byDoctor = new Map<string, number>();
      for (const v of visits) {
        const name = v.doctorName || "Unassigned";
        byDoctor.set(name, (byDoctor.get(name) || 0) + 1);
      }
      res.json({
        total: visits.length,
        byDoctor: Array.from(byDoctor.entries()).map(([doctorName, count]) => ({ doctorName, count })).sort((a, b) => b.count - a.count),
        recentVisits: visits.slice(0, 10),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/opd-visits", async (req, res) => {
    try {
      const data = validateBody(insertOpdVisitSchema, req.body);
      const visit = await storage.createOpdVisit(data);
      res.status(201).json(visit);

      // Auto-create draft bill + lab test + sample collection when prescription contains lab services
      const prescriptionRaw = (data as any).prescription;
      if (prescriptionRaw && typeof prescriptionRaw === "string" && prescriptionRaw.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(prescriptionRaw.trim()) as { lines?: Array<{ name?: string; medicineName?: string; serviceId?: number; type?: string }> };
          const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
          const allServices = await storage.getServices();
          const labLines: Array<{ serv: any; name: string }> = [];
          for (const line of lines) {
            const serv = line.serviceId != null
              ? allServices.find((s: any) => s.id === Number(line.serviceId))
              : allServices.find((s: any) => s.name === (line.name || (line as any).medicineName));
            if (serv && (serv as any).isLabTest) labLines.push({ serv, name: serv.name });
          }
          if (labLines.length > 0) {
            const settings = await storage.getSettings();
            const prefix = (settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
            const billNo = await storage.getNextBillNo(prefix);
            const billItems = labLines.map(({ serv }) => ({
              type: "service",
              serviceId: serv.id,
              name: serv.name,
              quantity: 1,
              unitPrice: Number(serv.price) || 0,
              total: Number(serv.price) || 0,
            }));
            const subtotal = billItems.reduce((s: number, it: any) => s + (it.total || 0), 0);
            const draftBill = await storage.createBill({
              billNo,
              patientId: visit.patientId,
              visitId: visit.id,
              items: billItems,
              subtotal: String(subtotal.toFixed(2)),
              discount: "0",
              discountType: "amount",
              tax: "0",
              total: String(subtotal.toFixed(2)),
              paidAmount: "0",
              paymentMethod: "cash",
              referenceDoctor: (visit as any).doctorName || null,
              paymentDate: null,
              status: "draft",
            } as any);
            await createLabTestAndSampleFromBillItems(draftBill, billItems, visit.patientId, (visit as any).doctorName || null);
          }
        } catch (e) {
          console.error("Prescription draft-bill creation failed:", e);
        }
      }

      try {
        const payload: NotificationPayload = {
          id: `visit-${visit.id}-${Date.now()}`,
          type: "visit_created",
          title: "New OPD Visit",
          message: `Visit ${visit.visitId} created${visit.doctorName ? ` for Dr. ${visit.doctorName}` : ""}.`,
          audience: visit.doctorName ? "doctor" : "staff",
          doctorName: visit.doctorName || undefined,
          createdAt: new Date().toISOString(),
          data: { visitId: visit.id, visitCode: visit.visitId, doctorName: visit.doctorName || null },
        };
        pushNotification(payload);
        void persistNotificationForAudience(payload);
      } catch {
        // Notification errors should not break the main request.
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/opd-visits/:id", async (req, res) => {
    try {
      const updateSchema = z.object({ status: z.string().optional(), symptoms: z.string().optional(), diagnosis: z.string().optional(), prescription: z.string().optional(), notes: z.string().optional(), doctorName: z.string().optional() });
      const data = validateBody(updateSchema, req.body);
      const visit = await storage.updateOpdVisit(Number(req.params.id), data);
      if (!visit) return res.status(404).json({ message: "Visit not found" });

      // Auto-create draft bill + lab test + sample collection when prescription contains lab services
      const prescriptionRaw = typeof data.prescription === "string" ? data.prescription : (visit as any).prescription;
      if (prescriptionRaw && typeof prescriptionRaw === "string" && prescriptionRaw.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(prescriptionRaw.trim()) as { lines?: Array<{ name?: string; medicineName?: string; serviceId?: number; type?: string }> };
          const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
          const allServices = await storage.getServices();
          const labLines: Array<{ serv: any; name: string }> = [];
          for (const line of lines) {
            const serv = line.serviceId != null
              ? allServices.find((s: any) => s.id === Number(line.serviceId))
              : allServices.find((s: any) => s.name === (line.name || (line as any).medicineName));
            if (serv && (serv as any).isLabTest) labLines.push({ serv, name: serv.name });
          }
          if (labLines.length > 0) {
            const allBills = await storage.getBills();
            const existingDraft = (allBills as any[]).find((b: any) => b.visitId === visit.id && b.status === "draft");
            if (!existingDraft) {
              const settings = await storage.getSettings();
              const prefix = (settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
              const billNo = await storage.getNextBillNo(prefix);
              const billItems = labLines.map(({ serv }) => ({
                type: "service",
                serviceId: serv.id,
                name: serv.name,
                quantity: 1,
                unitPrice: Number(serv.price) || 0,
                total: Number(serv.price) || 0,
              }));
              const subtotal = billItems.reduce((s: number, it: any) => s + (it.total || 0), 0);
              const draftBill = await storage.createBill({
                billNo,
                patientId: visit.patientId,
                visitId: visit.id,
                items: billItems,
                subtotal: String(subtotal.toFixed(2)),
                discount: "0",
                discountType: "amount",
                tax: "0",
                total: String(subtotal.toFixed(2)),
                paidAmount: "0",
                paymentMethod: "cash",
                referenceDoctor: (visit as any).doctorName || null,
                paymentDate: null,
                status: "draft",
              } as any);
              await createLabTestAndSampleFromBillItems(draftBill, billItems, visit.patientId, (visit as any).doctorName || null);
            }
          }
        } catch (e) {
          console.error("Prescription draft-bill creation failed:", e);
        }
      }

      res.json(visit);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/opd-visits/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid visit id" });
      const visit = await storage.getOpdVisit(id);
      if (!visit) return res.status(404).json({ message: "Visit not found" });
      await storage.deleteOpdVisit(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Patient Monitor (GET endpoints require auth + opd view)
  const PATIENT_MONITOR_ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  app.get("/api/patient-monitor/devices", async (_req, res) => {
    try {
      const list = await storage.getPatientMonitorDevices();
      const now = Date.now();
      const withStatus = list.map((d) => {
        const last = d.lastReadingAt ? new Date(d.lastReadingAt).getTime() : 0;
        const isOnline = last > 0 && now - last < PATIENT_MONITOR_ONLINE_THRESHOLD_MS;
        return { ...d, isOnline, lastReadingAt: d.lastReadingAt };
      });
      res.json(withStatus);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/patient-monitor/latest", async (req, res) => {
    try {
      const deviceIds = req.query.deviceId != null ? [Number(req.query.deviceId)] : undefined;
      if (req.query.deviceId != null && isNaN(Number(req.query.deviceId))) {
        return res.status(400).json({ message: "Invalid deviceId" });
      }
      const list = await storage.getLatestPatientMonitorReadings(deviceIds);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/patient-monitor/readings", async (req, res) => {
    try {
      const deviceId = req.query.deviceId != null ? Number(req.query.deviceId) : undefined;
      const patientId = req.query.patientId != null ? Number(req.query.patientId) : undefined;
      const visitId = req.query.visitId != null ? Number(req.query.visitId) : undefined;
      const limit = req.query.limit != null ? Math.min(Number(req.query.limit), 500) : 100;
      const list = await storage.getPatientMonitorReadings({ deviceId, patientId, visitId, limit });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Bills – paginated endpoint (always returns { items, total } with server-side pagination/filtering)
  app.get("/api/bills-paginated", async (req, res) => {
    try {
      const page = Math.max(1, qInt(req.query as Record<string, unknown>, "page", 1));
      const limit = Math.min(500, Math.max(1, qInt(req.query as Record<string, unknown>, "limit", 10)));
      const offset = (page - 1) * limit;
      const result = await storage.getBillsPaginated({
        limit,
        offset,
        search: qStr(req.query as Record<string, unknown>, "search"),
        dateFrom: qStr(req.query as Record<string, unknown>, "dateFrom"),
        dateTo: qStr(req.query as Record<string, unknown>, "dateTo"),
        statusFilter: qStr(req.query as Record<string, unknown>, "statusFilter"),
        patientId: req.query.patientId != null ? Number(req.query.patientId) : undefined,
      });
      res.json({ items: result.items, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Bills – legacy endpoint (returns all when no pagination params; use /api/bills-paginated for list views)
  app.get("/api/bills", async (req, res) => {
    try {
      const q = req.query as Record<string, unknown>;
      const limit = req.query.limit != null ? Math.min(500, Math.max(1, qInt(q, "limit", 10))) : undefined;
      const offset = req.query.offset != null ? Math.max(0, qInt(q, "offset", 0)) : 0;
      if (limit != null && limit > 0) {
        const pid = req.query.patientId;
        const patientId = pid != null ? (typeof pid === "string" ? Number(pid) : Array.isArray(pid) ? Number(pid[0]) : Number(pid)) : undefined;
        const result = await storage.getBillsPaginated({
          limit,
          offset,
          search: qStr(q, "search"),
          dateFrom: qStr(q, "dateFrom"),
          dateTo: qStr(q, "dateTo"),
          statusFilter: qStr(q, "statusFilter"),
          patientId: !isNaN(patientId as number) ? patientId : undefined,
        });
        res.json({ items: result.items, total: result.total });
      } else {
        const result = await storage.getBills();
        res.json(result);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const billsStatsHandler = async (req: express.Request, res: express.Response) => {
    try {
      const q = req.query as Record<string, unknown>;
      const result = await storage.getBillsStats({
        search: qStr(q, "search"),
        dateFrom: qStr(q, "dateFrom"),
        dateTo: qStr(q, "dateTo"),
        statusFilter: qStr(q, "statusFilter"),
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
  app.get("/api/bills-stats", billsStatsHandler);
  app.get("/api/bills-state", billsStatsHandler); // alias for legacy/cached clients

  app.get("/api/bills/by-billno", async (req, res) => {
    try {
      const billNo = (req.query.billNo as string)?.trim();
      if (!billNo) return res.status(400).json({ message: "Query parameter 'billNo' is required" });
      const bill = await storage.getBillByBillNo(billNo);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      res.json(bill);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /** Create lab test(s) and sample collection(s) from bill items that are lab services. Used by bills and prescription draft flow. */
  async function createLabTestAndSampleFromBillItems(
    bill: { id: number },
    items: any[],
    patientId: number,
    referrerName: string | null
  ): Promise<void> {
    const allServices = await storage.getServices();
    const labItems: Array<{ serv: any; item: any }> = [];
    for (const item of items) {
      if (item?.type === "service" && (item.serviceId != null || item.name)) {
        const serv = item.serviceId != null
          ? allServices.find((s: any) => s.id === Number(item.serviceId))
          : allServices.find((s: any) => (s.name || "").trim() === (item.name || "").trim());
        if (serv && (serv as any).isLabTest) labItems.push({ serv, item });
      }
    }
    if (labItems.length === 0) return;
    const code = await storage.getNextLabTestCode();
    const first = labItems[0].serv;
    const anySampleRequired = labItems.some(({ serv }) => (serv as any).sampleCollectionRequired);
    const serviceIds = labItems.map(({ serv }) => serv.id);
    const labTest = await storage.createLabTest({
      testCode: code,
      testName: labItems.length === 1 ? first.name : "Lab Panel",
      category: first.category,
      sampleType: (first as any).sampleType || "Blood",
      price: String(labItems.reduce((s: number, { serv }: any) => s + Number(serv.price || 0), 0)),
      patientId,
      serviceId: first.id,
      serviceIds: labItems.length > 1 ? serviceIds : null,
      billId: bill.id,
      sampleCollectionRequired: anySampleRequired,
      referrerName,
      status: anySampleRequired ? "awaiting_sample" : "processing",
    });
    for (const { serv } of labItems) {
      const sampleRequired = Boolean((serv as any).sampleCollectionRequired);
      if (sampleRequired) {
        await storage.createSampleCollection({
          labTestId: labTest.id,
          patientId,
          billId: bill.id,
          testName: serv.name,
          sampleType: (serv as any).sampleType || "Blood",
          status: "pending",
        });
      }
    }
    try {
      const payload: NotificationPayload = {
        id: `lab-${labTest.id}-${Date.now()}`,
        type: "lab_test_created",
        title: "New Lab Request",
        message: `Lab test ${labTest.testCode} – ${labTest.testName}`,
        audience: labTest.referrerName ? "doctor" : "lab_technologist",
        doctorName: labTest.referrerName || undefined,
        createdAt: new Date().toISOString(),
        data: { labTestId: labTest.id, testCode: labTest.testCode, referrerName: labTest.referrerName || null },
      };
      pushNotification(payload);
      void persistNotificationForAudience(payload);
    } catch {
      // Ignore notification errors.
    }
  }

  app.post("/api/bills", async (req, res) => {
    try {
      const data = validateBody(insertBillSchema, req.body) as Record<string, unknown>;
      const isDraft = data.status === "draft";
      const items = Array.isArray(data.items) ? data.items : [];

      // Server-generated bill number to avoid duplicate key
      const settings = await storage.getSettings();
      const prefix = (settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
      data.billNo = await storage.getNextBillNo(prefix);

      const medQtyMap: Record<number, number> = {};
      for (const item of items) {
        if (item?.type === "medicine" && item.medicineId != null && typeof item.quantity === "number" && item.quantity > 0) {
          const medId = Number(item.medicineId);
          medQtyMap[medId] = (medQtyMap[medId] || 0) + item.quantity;
        }
      }
      if (!isDraft) {
        for (const [medIdStr, totalQty] of Object.entries(medQtyMap)) {
          const med = await storage.getMedicine(Number(medIdStr));
          if (med) {
            const available = Number(med.stockCount ?? 0);
            if (totalQty > available) {
              throw new Error(`Not enough stock for "${med.name}". Available: ${available}, requested: ${totalQty}`);
            }
          }
        }
      }
      const bill = await storage.createBill(data as Parameters<typeof storage.createBill>[0]);

      const patientId = Number(data.patientId);
      const referrerName = (data.referenceDoctor as string) || null;
      // Create lab test and sample collection for draft and non-draft when bill has lab services
      const itemsToUse = items.length > 0 ? items : (Array.isArray((bill as any).items) ? (bill as any).items : []);
      await createLabTestAndSampleFromBillItems(bill, itemsToUse, patientId, referrerName);
      if (!isDraft) {
        for (const [medIdStr, totalQty] of Object.entries(medQtyMap)) {
          const med = await storage.getMedicine(Number(medIdStr));
          if (med) {
            const prev = Number(med.stockCount ?? 0);
            const newStock = Math.max(0, prev - totalQty);
            await storage.updateMedicine(med.id, { stockCount: newStock, quantity: newStock });
            await storage.createStockAdjustment({
              medicineId: med.id,
              previousStock: prev,
              newStock,
              adjustmentType: "subtract",
              reason: `Bill ${bill.billNo} – sold ${totalQty} pc`,
            });
          }
        }
      }
      res.status(201).json(bill);

      // Pharmacist notification when a bill includes medicines.
      try {
        const hasMedicines = Object.keys(medQtyMap).length > 0;
        if (hasMedicines) {
          const payload: NotificationPayload = {
            id: `bill-${bill.id}-${Date.now()}`,
            type: "bill_with_medicines_created",
            title: "New Pharmacy Bill",
            message: `Bill ${bill.billNo} includes medicine items.`,
            audience: "pharmacist",
            createdAt: new Date().toISOString(),
            data: { billId: bill.id, billNo: bill.billNo },
          };
          pushNotification(payload);
          void persistNotificationForAudience(payload);
        }
      } catch {
        // Ignore notification errors.
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/bills/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = req.body as Record<string, unknown>;
      const existingBill = await storage.getBill(id);
      if (!existingBill) return res.status(404).json({ message: "Bill not found" });
      const allServices = await storage.getServices();
      const getServiceIdsFromItems = (items: any[]): Set<number> => {
        const ids = new Set<number>();
        for (const it of items || []) {
          if (it?.type !== "service") continue;
          const sid = it.serviceId != null ? Number(it.serviceId) : null;
          const serv = sid != null ? allServices.find((s: any) => s.id === sid) : allServices.find((s: any) => (s.name || "").trim() === (it.name || "").trim());
          if (serv) ids.add(serv.id);
        }
        return ids;
      };
      const oldItems = Array.isArray(existingBill.items) ? existingBill.items : [];
      const newItems = Array.isArray(data.items) ? data.items : [];
      const oldServiceIds = getServiceIdsFromItems(oldItems);
      const newServiceIds = getServiceIdsFromItems(newItems);
      const removedServiceIds = new Set(Array.from(oldServiceIds).filter((sid) => !newServiceIds.has(sid)));
      const bill = await storage.updateBill(id, data);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      // Auto-remove lab tests and sample collections when services are removed from the bill
      if (removedServiceIds.size > 0) {
        const { items: labTestsForBill } = await storage.getLabTestsPaginated({ billId: id, limit: 500, offset: 0 });
        for (const lt of labTestsForBill) {
          const ltServiceId = lt.serviceId != null ? Number(lt.serviceId) : null;
          const ltServiceIds = Array.isArray(lt.serviceIds) ? lt.serviceIds.map((x: any) => Number(x)) : [];
          const hasRemoved = (ltServiceId != null && removedServiceIds.has(ltServiceId))
            || ltServiceIds.some((sid: number) => removedServiceIds.has(sid));
          if (hasRemoved) await storage.deleteLabTest(lt.id);
        }
      }
      // Create lab tests/samples when bill has lab items but none exist yet (e.g. draft updated with lab services)
      const items = newItems;
      const labItems = items.filter((it: any) => it?.type === "service" && (it.serviceId != null || it.name));
      if (labItems.length > 0) {
        const allLabTests = await storage.getLabTests();
        const existingForBill = allLabTests.filter((t: any) => t.billId === id);
        if (existingForBill.length === 0) {
          const hasLabServices = labItems.some((item: any) => {
            const serv = item.serviceId != null
              ? allServices.find((s: any) => s.id === Number(item.serviceId))
              : allServices.find((s: any) => s.name === item.name);
            return serv && (serv as any).isLabTest;
          });
          if (hasLabServices) {
            await createLabTestAndSampleFromBillItems(bill, items, bill.patientId, (bill.referenceDoctor as string) || null);
          }
        }
      }
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

  // Due management (role-permission: due.view / due.add / due.edit / due.delete)
  app.post("/api/due/create", async (req, res) => {
    try {
      const { patientId, amount, note } = req.body;
      const pid = Number(patientId);
      if (Number.isNaN(pid)) return res.status(400).json({ message: "Valid patient ID is required" });
      const amt = Number(amount);
      if (Number.isNaN(amt) || amt <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
      const patient = await storage.getPatient(pid);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      const settings = await storage.getSettings();
      const prefix = (settings?.invoicePrefix || "INV").replace(/\s/g, "").slice(0, 4) || "INV";
      const billNo = await storage.getNextBillNo(prefix);
      const itemName = typeof note === "string" && note.trim() ? note.trim() : "Manual due entry";
      const bill = await storage.createBill({
        billNo,
        patientId: pid,
        visitId: null,
        items: [{ type: "custom", name: itemName, quantity: 1, unitPrice: amt, total: amt }],
        subtotal: String(amt.toFixed(2)),
        discount: "0",
        discountType: "amount",
        tax: "0",
        total: String(amt.toFixed(2)),
        paidAmount: "0",
        paymentMethod: "due",
        referenceDoctor: null,
        paymentDate: null,
        status: "unpaid",
      } as any);
      res.status(201).json(bill);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/due/payments", async (req, res) => {
    try {
      const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;
      const result = await storage.getDuePayments(patientId, limit, offset);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/due/payments", async (req, res) => {
    try {
      const { allocations, paymentSlips, ...rest } = req.body;
      if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ message: "Allocations array is required" });
      }
      const patientId = Number(rest.patientId);
      if (Number.isNaN(patientId)) {
        return res.status(400).json({ message: "Valid patient ID is required" });
      }
      const allocList = allocations.map((a: { billId: number; amount: number }) => ({
        billId: Number(a.billId),
        amount: Number(a.amount),
      }));
      for (const a of allocList) {
        if (Number.isNaN(a.billId) || Number.isNaN(a.amount) || a.amount <= 0) {
          return res.status(400).json({ message: "Each allocation must have a valid bill ID and positive amount" });
        }
        const bill = await storage.getBill(a.billId);
        if (!bill) return res.status(404).json({ message: `Bill ${a.billId} not found` });
        if (bill.patientId !== patientId) {
          return res.status(400).json({ message: `Bill ${bill.billNo ?? a.billId} does not belong to this patient` });
        }
        const total = Number(bill.total ?? 0);
        const paid = Number(bill.paidAmount ?? 0);
        const remaining = total - paid;
        if (a.amount > remaining + 0.01) {
          return res.status(400).json({ message: `Allocation for bill ${bill.billNo ?? a.billId} ($${a.amount.toFixed(2)}) exceeds remaining balance ($${remaining.toFixed(2)})` });
        }
      }
      const totalAllocated = allocList.reduce((s, a) => s + a.amount, 0);
      const amount = Number(rest.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Valid payment amount is required" });
      }
      if (Math.abs(totalAllocated - amount) > 0.01) {
        return res.status(400).json({ message: `Allocated total ($${totalAllocated.toFixed(2)}) must equal payment amount ($${amount.toFixed(2)})` });
      }
      const paymentData = {
        ...rest,
        patientId,
        amount: String(amount),
        paymentDate: rest.paymentDate ? new Date(rest.paymentDate) : new Date(),
        ...(paymentSlips && Array.isArray(paymentSlips) ? { paymentSlips: JSON.stringify(paymentSlips) } : {}),
      };
      const validated = insertDuePaymentSchema.parse(paymentData);
      const payment = await storage.recordPaymentWithAllocations(validated, allocList);
      res.status(201).json(payment);
    } catch (err: any) {
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid payment data", details: err.errors });
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/due/payments/:id/allocations", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid payment id" });
      const allocations = await storage.getDuePaymentAllocations(id);
      res.json(allocations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/due/payments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid payment id" });
      const payment = await storage.updateDuePayment(id, req.body);
      if (!payment) return res.status(404).json({ message: "Due payment not found" });
      res.json(payment);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/due/payments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid payment id" });
      const deleted = await storage.deleteDuePayment(id);
      if (!deleted) return res.status(404).json({ message: "Due payment not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/due/patients-summary", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const result = await storage.getPatientsDueSummary(limit, offset, search, statusFilter, dateFrom, dateTo);
      res.json(result);
    } catch (err: any) {
      console.error("[due] getPatientsDueSummary error:", err?.message ?? err);
      const msg = err?.message ?? "Failed to load patients summary";
      const hint = /relation.*does not exist|does not exist/i.test(String(msg))
        ? " Run: npm run db:migrate-due"
        : "";
      res.status(500).json({ message: msg + hint });
    }
  });

  app.get("/api/due/patients-summary/stats", async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const stats = await storage.getPatientsDueSummaryStats(dateFrom, dateTo, search, statusFilter);
      res.json(stats);
    } catch (err: any) {
      console.error("[due] getPatientsDueSummaryStats error:", err?.message ?? err);
      const msg = err?.message ?? "Failed to load due statistics";
      const hint = /relation.*does not exist|does not exist/i.test(String(msg))
        ? " Run: npm run db:migrate-due"
        : "";
      res.status(500).json({ message: msg + hint });
    }
  });

  app.get("/api/due/export", async (req, res) => {
    try {
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const { summaries } = await storage.getPatientsDueSummary(undefined, undefined, search, statusFilter, dateFrom, dateTo);
      const rows = summaries.map((s) => ({
        patientId: s.patient.patientId ?? "",
        patientName: s.patient.name ?? "",
        phone: s.patient.phone ?? "",
        totalDue: s.totalDue,
        totalPaid: s.totalPaid,
        balance: s.balance,
        billsCount: s.billsCount,
      }));
      res.json({ summaries: rows });
    } catch (err: any) {
      console.error("[due] export error:", err?.message ?? err);
      res.status(500).json({ message: err?.message ?? "Export failed" });
    }
  });

  app.post("/api/bills/:id/return", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid bill id" });
      const bill = await storage.getBill(id);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      if (bill.status !== "paid") return res.status(400).json({ message: "Only paid bills can have medicine returns" });

      const returnSchema = z.object({
        returns: z.array(z.object({
          itemIndex: z.number().int().min(0),
          quantity: z.number().int().min(1),
        })).min(1, "At least one return item required"),
      });
      const data = validateBody(returnSchema, req.body);
      const items = Array.isArray(bill.items) ? [...(bill.items as any[])] : [];
      if (items.length === 0) return res.status(400).json({ message: "Bill has no items" });

      const byIndex = new Map<number, number>();
      for (const r of data.returns) {
        const cur = byIndex.get(r.itemIndex) ?? 0;
        byIndex.set(r.itemIndex, cur + r.quantity);
      }

      for (const [itemIndex, qty] of Array.from(byIndex)) {
        if (itemIndex >= items.length) return res.status(400).json({ message: `Invalid item index ${itemIndex}` });
        const item = items[itemIndex];
        if (item?.type !== "medicine" || item.medicineId == null) return res.status(400).json({ message: "Can only return medicine items" });
        const soldQty = typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 0;
        if (qty > soldQty) return res.status(400).json({ message: `Return quantity for "${item.name}" cannot exceed ${soldQty}` });
      }

      const newItems: any[] = [];
      const returnCredits: { medicineId: number; quantity: number; item: any }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = { ...items[i], quantity: typeof items[i].quantity === "number" ? items[i].quantity : Number(items[i].quantity) || 0, unitPrice: Number(items[i].unitPrice) || 0 };
        const retQty = byIndex.get(i);
        if (retQty != null && retQty > 0 && item.type === "medicine" && item.medicineId != null) {
          const remain = item.quantity - retQty;
          if (remain > 0) {
            item.quantity = remain;
            item.total = Math.round(item.unitPrice * remain * 100) / 100;
            newItems.push(item);
          }
          returnCredits.push({ medicineId: Number(item.medicineId), quantity: retQty, item });
        } else {
          item.total = Math.round(item.quantity * item.unitPrice * 100) / 100;
          newItems.push(item);
        }
      }

      const subtotal = newItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
      const discountVal = Number(bill.discount) || 0;
      const discountType = (bill.discountType === "percentage" ? "percentage" : "amount") as "amount" | "percentage";
      const discountAmount = discountType === "percentage" ? (subtotal * discountVal) / 100 : Math.min(discountVal, subtotal);
      const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
      const paidAmount = total;

      for (const cr of returnCredits) {
        const med = await storage.getMedicine(cr.medicineId);
        if (med) {
          const prev = Number(med.stockCount ?? 0);
          const newStock = prev + cr.quantity;
          await storage.updateMedicine(med.id, { stockCount: newStock, quantity: newStock });
          await storage.createStockAdjustment({
            medicineId: med.id,
            previousStock: prev,
            newStock,
            adjustmentType: "add",
            reason: `Return from bill ${bill.billNo} – ${cr.quantity} pc`,
          });
        }
      }

      const updated = await storage.updateBill(id, {
        items: newItems,
        subtotal: String(subtotal.toFixed(2)),
        total: String(total.toFixed(2)),
        paidAmount: String(paidAmount.toFixed(2)),
      });
      res.json(updated);
    } catch (err: any) {
      const msg = err?.message ?? "Server error";
      const isClientError = err?.name === "ZodError" || (typeof msg === "string" && (msg.includes("Invalid") || msg.includes("required") || msg.includes("cannot exceed") || msg.includes("Can only return") || msg.includes("No return")));
      res.status(isClientError ? 400 : 500).json({ message: msg });
    }
  });

  // Services – paginated endpoint (always returns { items, total })
  app.get("/api/services-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getServicesPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        categoryFilter: (req.query.categoryFilter as string) || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
      });
      res.json({ items: result.items, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Services – stats endpoint
  app.get("/api/services-stats", async (req, res) => {
    try {
      const result = await storage.getServicesStats({
        search: (req.query.search as string)?.trim() || undefined,
        categoryFilter: (req.query.categoryFilter as string) || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
      });
      res.json(result);
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

  app.get("/api/services/params-batch", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      const ids = idsParam ? idsParam.split(",").map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)) : [];
      if (ids.length === 0) return res.json({ reportParameters: [], reportParametersByCategory: [] });
      const allParams: Array<{ parameter: string; unit: string; normalRange: string; resultType?: string; dropdownItems?: string[]; category?: string }> = [];
      const seen = new Set<string>();
      for (const id of ids) {
        const svc = await storage.getService(id);
        const params = (svc as any)?.reportParameters;
        if (Array.isArray(params)) {
          for (const p of params) {
            if (p?.parameter && !seen.has(p.parameter)) {
              seen.add(p.parameter);
              allParams.push({
                parameter: p.parameter,
                unit: p.unit || "",
                normalRange: p.normalRange || "",
                resultType: p.resultType,
                dropdownItems: p.dropdownItems,
                category: p.category || "Other",
              });
            }
          }
        }
      }
      const byCategory = allParams.reduce<Record<string, typeof allParams>>((acc, p) => {
        const cat = p.category || "\x00";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {});
      // Preserve order as added in services (first occurrence of each category)
      const categoryOrder = Array.from(new Set(allParams.map((p) => p.category || "\x00")));
      const reportParametersByCategory = categoryOrder.map((category) => ({
        category: category === "\x00" ? "Other" : category,
        parameters: byCategory[category],
      }));
      res.json({
        reportParameters: allParams,
        reportParametersByCategory,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(Number(req.params.id));
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json(service);
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
      const reportParamSchema = z.object({
        parameter: z.string(),
        unit: z.string(),
        normalRange: z.string(),
        resultType: z.enum(["manual", "dropdown"]).optional(),
        dropdownItems: z.array(z.string()).optional(),
        category: z.string().optional(),
      });
      const updateSchema = z.object({
        isActive: z.boolean().optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        price: z.string().optional(),
        description: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        isLabTest: z.boolean().optional(),
        sampleCollectionRequired: z.boolean().optional(),
        sampleType: z.string().nullable().optional(),
        reportParameters: z.array(reportParamSchema).optional(),
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

  app.post("/api/services/bulk-update-category", async (req, res) => {
    try {
      const { oldCategory, newCategory } = req.body;
      if (!oldCategory || typeof oldCategory !== "string" || !newCategory || typeof newCategory !== "string") {
        return res.status(400).json({ message: "oldCategory and newCategory required" });
      }
      const updated = await storage.bulkUpdateServiceCategory(oldCategory, newCategory);
      res.json({ success: true, updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/services/bulk-remove-category", async (req, res) => {
    try {
      const { oldCategory, fallbackCategory } = req.body;
      if (!oldCategory || typeof oldCategory !== "string") {
        return res.status(400).json({ message: "oldCategory required" });
      }
      const fallback = (fallbackCategory && typeof fallbackCategory === "string") ? fallbackCategory : "Other";
      const updated = await storage.bulkRemoveServiceCategory(oldCategory, fallback);
      res.json({ success: true, updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Medicines
  app.get("/api/medicines/export/:format", async (req, res) => {
    try {
      const XLSX = await import("xlsx");
      const medicines = await storage.getMedicines();
      const rows = medicines.map(m => {
        const perPiece = Number(m.sellingPriceLocal ?? m.sellingPrice ?? 0);
        const totalPcs = (m.unitCount || 1) * (m.qtyPerBox || 1);
        const purchasePricePerPc = Number(m.perMedPrice) || (totalPcs > 0 ? Number(m.boxPrice || 0) / totalPcs : 0);
        const totalPurchasePrice = purchasePricePerPc * totalPcs;
        const totalSalesPrice = perPiece * totalPcs;
        return {
          "Medicine Name": m.name,
          Category: m.category || "",
          "Unit Type": m.unit,
          "Total Pcs": totalPcs,
          "Total Purchase Price": totalPurchasePrice.toFixed(2),
          "Purchase Each Price (auto)": purchasePricePerPc.toFixed(2),
          "Total Sales Price": totalSalesPrice.toFixed(2),
          "Sales Each Price (auto)": perPiece.toFixed(2),
          "Stock Available pcs": m.stockCount,
          "Expiry Date": m.expiryDate || "",
          Manufacturer: m.manufacturer || "",
          "Batch No": m.batchNo || "",
          "Stock Alert": m.stockAlert,
        };
      });
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
        const name = row["Medicine Name"] || row["Name"] || row["name"];
        if (!name) { skipped++; errors.push(`Row ${i + 2}: Missing medicine name`); continue; }
        try {
          const totalPcs = parseInt(row["Quantity (Total Pcs)"] || row["Total Pcs"] || row["Qty Per Box"] || "1") || 1;
          const purchasePricePerPc = parseFloat(row["Purchase Price (Per Pcs)"] || row["Purchase Each Price (auto)"] || row["Purchase Price"] || "0") || 0;
          const totalPurchasePrice = purchasePricePerPc * totalPcs;
          const sellingPricePerPc = parseFloat(row["Selling Price (Per Pcs)"] || row["Sales Each Price (auto)"] || row["Sales Price"] || "0") || 0;
          const stockAvailable = parseInt(row["Available"] || row["Stock Available pcs"] || row["Stock Available"] || "0") || 0;
          const statusRaw = (row["Status"] || "Active").toString().toLowerCase();
          const isActive = statusRaw !== "inactive";
          await storage.createMedicine({
            name,
            genericName: null,
            category: row["Category"] || row["category"] || null,
            manufacturer: null,
            batchNo: null,
            expiryDate: row["Expiry Date"] || row["expiryDate"] || null,
            unit: row["Unit"] || row["Unit Type"] || row["unit"] || "Box",
            unitCount: 1,
            boxPrice: totalPurchasePrice.toFixed(2),
            qtyPerBox: totalPcs,
            perMedPrice: purchasePricePerPc.toFixed(4),
            totalPurchasePrice: totalPurchasePrice.toFixed(2),
            sellingPriceLocal: sellingPricePerPc.toFixed(2),
            sellingPriceForeigner: sellingPricePerPc.toFixed(2),
            stockCount: stockAvailable,
            totalStock: stockAvailable,
            stockAlert: 10,
            quantity: stockAvailable,
            unitPrice: "0", sellingPrice: "0", isActive,
            imageUrl: null,
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

  app.post("/api/injections/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      for (const id of ids) {
        await storage.deleteInjection(Number(id));
      }
      res.json({ message: `Deleted ${ids.length} injection(s)` });
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
  // Packages – paginated endpoint (always returns { items, total })
  app.get("/api/packages-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getPackagesPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
      });
      res.json({ items: result.items, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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

  // Medicines – paginated endpoint (always returns { items, total, ... })
  app.get("/api/medicines-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getMedicinesPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        categoryFilter: (req.query.categoryFilter as string) || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
      });
      res.json({ items: result.items || [], total: result.total, inStockCount: result.inStockCount, lowStockCount: result.lowStockCount, outOfStockCount: result.outOfStockCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/medicines", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getMedicinesPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          categoryFilter: (req.query.categoryFilter as string) || undefined,
          statusFilter: (req.query.statusFilter as string) || undefined,
        });
        res.json({ items: result.items || [], total: result.total, inStockCount: result.inStockCount, lowStockCount: result.lowStockCount, outOfStockCount: result.outOfStockCount });
      } else {
        const result = await storage.getMedicines();
        res.json(result);
      }
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
      const data = validateBody(insertMedicineSchema, req.body) as Record<string, unknown>;
      const stockCount = Number(data.stockCount) ?? 0;
      if (data.totalStock == null) data.totalStock = stockCount;
      const totalPcs = Number(data.qtyPerBox) || stockCount;
      if (stockCount > totalPcs) {
        throw new Error(`Stock Available (${stockCount}) cannot exceed Total Pcs (${totalPcs})`);
      }
      const medicine = await storage.createMedicine(data as Parameters<typeof storage.createMedicine>[0]);
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
    boxNo: z.string().nullable().optional(),
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
    totalStock: z.number().optional(),
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
        const prevStock = existing.stockCount ?? 0;
        const newStock = data.stockCount;
        const prevTotal = Number((existing as any).totalStock) ?? prevStock;
        if (adjustmentType === "add") {
          updateData.totalStock = prevTotal + (newStock - prevStock);
          const currentMaxPcs = Number(existing.qtyPerBox) || prevTotal;
          if (newStock > currentMaxPcs) {
            updateData.qtyPerBox = newStock;
          }
        } else if (adjustmentType === "set") {
          updateData.totalStock = newStock;
        } else {
          updateData.totalStock = prevTotal;
        }
        const maxPcs = Number(updateData.qtyPerBox ?? existing.qtyPerBox) || (updateData.totalStock ?? prevTotal);
        if (adjustmentType !== "add" && newStock > maxPcs) {
          throw new Error(`Stock (${newStock}) cannot exceed Total Pcs (${maxPcs})`);
        }
        await storage.createStockAdjustment({
          medicineId: id,
          previousStock: prevStock,
          newStock,
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

  // Expenses – paginated endpoint (always returns { items, total, ... })
  app.get("/api/expenses-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const cat = (req.query.categoryFilter as string)?.trim();
      const st = (req.query.statusFilter as string)?.trim();
      const result = await storage.getExpensesPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        categoryFilter: cat && cat !== "all" ? cat : undefined,
        statusFilter: st && st !== "all" ? st : undefined,
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
      });
      res.json({ items: result.items || [], total: result.total, totalAmount: result.totalAmount, approvedAmount: result.approvedAmount, pendingAmount: result.pendingAmount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/expenses", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const cat = (req.query.categoryFilter as string)?.trim();
        const st = (req.query.statusFilter as string)?.trim();
        const result = await storage.getExpensesPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          categoryFilter: cat && cat !== "all" ? cat : undefined,
          statusFilter: st && st !== "all" ? st : undefined,
          dateFrom: (req.query.dateFrom as string) || undefined,
          dateTo: (req.query.dateTo as string) || undefined,
        });
        res.json({ items: result.items || [], total: result.total, totalAmount: result.totalAmount, approvedAmount: result.approvedAmount, pendingAmount: result.pendingAmount });
      } else {
        const result = await storage.getExpenses();
        res.json(result);
      }
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

  // Bank Transactions – paginated endpoint (always returns { items, total, ... })
  app.get("/api/bank-transactions-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getBankTransactionsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
      });
      res.json({ items: result.items || [], total: result.total, totalDeposits: result.totalDeposits, totalWithdrawals: result.totalWithdrawals });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Bank Transactions
  app.get("/api/bank-transactions", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getBankTransactionsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          dateFrom: (req.query.dateFrom as string) || undefined,
          dateTo: (req.query.dateTo as string) || undefined,
        });
        res.json({ items: result.items || [], total: result.total, totalDeposits: result.totalDeposits, totalWithdrawals: result.totalWithdrawals });
      } else {
        const result = await storage.getBankTransactions();
        res.json(result);
      }
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

  // Investments (paginated/stats before :id to avoid route conflicts)
  app.get("/api/investments-paginated", async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
      const offset = (page - 1) * limit;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const categoryFilter = typeof req.query.categoryFilter === "string" ? req.query.categoryFilter : undefined;
      const statusFilter = typeof req.query.statusFilter === "string" ? req.query.statusFilter : undefined;
      const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
      const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      const result = await storage.getInvestmentsPaginated({ limit, offset, search, categoryFilter, statusFilter, dateFrom, dateTo });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/investments-stats", async (req, res) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const categoryFilter = typeof req.query.categoryFilter === "string" ? req.query.categoryFilter : undefined;
      const statusFilter = typeof req.query.statusFilter === "string" ? req.query.statusFilter : undefined;
      const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
      const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      const result = await storage.getInvestmentsStats({ search, categoryFilter, statusFilter, dateFrom, dateTo });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

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
      const fromDate = typeof req.query.fromDate === "string" && req.query.fromDate ? req.query.fromDate : undefined;
      const toDate = typeof req.query.toDate === "string" && req.query.toDate ? req.query.toDate : undefined;
      const result = await storage.getContributions(investmentId, fromDate, toDate);
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
      const updateSchema = z.object({ isActive: z.boolean().optional(), roleId: z.number().nullable().optional(), fullName: z.string().optional(), email: z.string().nullable().optional(), phone: z.string().nullable().optional(), qualification: z.string().nullable().optional(), signatureUrl: z.string().nullable().optional(), signaturePrintInLabReport: z.boolean().optional() });
      const data = validateBody(updateSchema, req.body);
      const user = await storage.updateUser(Number(req.params.id), data);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.createActivityLog({ action: "update", module: "users", description: `User "${user.fullName}" updated`, userName: "System" });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/users/:id/upload-signature", userSignatureUpload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const signatureUrl = `/uploads/user-signatures/${req.file.filename}`;
      const user = await storage.updateUser(Number(req.params.id), { signatureUrl });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.use("/uploads/user-signatures", express.static(userSignaturesDir));

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

  app.get("/api/reports/prescription-stats", async (req, res) => {
    try {
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const doctorName = req.query.doctorName as string | undefined;
      const visits = await storage.getOpdVisitsFiltered({ fromDate, toDate, doctorName, hasPrescription: true });
      const byDoctor = new Map<string, number>();
      for (const v of visits) {
        const name = v.doctorName || "Unassigned";
        byDoctor.set(name, (byDoctor.get(name) || 0) + 1);
      }
      res.json({
        total: visits.length,
        byDoctor: Array.from(byDoctor.entries()).map(([doctorName, count]) => ({ doctorName, count })).sort((a, b) => b.count - a.count),
        recentVisits: visits.slice(0, 10),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Lab Tests – paginated endpoint (always returns { items, total, ... })
  app.get("/api/lab-tests-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getLabTestsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        categoryFilter: (req.query.categoryFilter as string) || undefined,
        dateFrom: (req.query.dateFrom as string) || undefined,
        dateTo: (req.query.dateTo as string) || undefined,
        billId: req.query.billId != null ? Number(req.query.billId) : undefined,
        patientId: req.query.patientId != null ? Number(req.query.patientId) : undefined,
      });
      res.json({ items: result.items || [], total: result.total, processingCount: result.processingCount, completeCount: result.completeCount, withReportsCount: result.withReportsCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Lab Tests
  app.get("/api/lab-tests", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getLabTestsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          statusFilter: (req.query.statusFilter as string) || undefined,
          categoryFilter: (req.query.categoryFilter as string) || undefined,
          dateFrom: (req.query.dateFrom as string) || undefined,
          dateTo: (req.query.dateTo as string) || undefined,
          billId: req.query.billId != null ? Number(req.query.billId) : undefined,
          patientId: req.query.patientId != null ? Number(req.query.patientId) : undefined,
        });
        res.json({ items: result.items || [], total: result.total, processingCount: result.processingCount, completeCount: result.completeCount, withReportsCount: result.withReportsCount });
      } else {
        const result = await storage.getLabTests();
        res.json(result);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Alias: /api/labs -> /api/lab-tests (for clients/proxies that use shorthand)
  app.get("/api/labs", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getLabTestsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          statusFilter: (req.query.statusFilter as string) || undefined,
          categoryFilter: (req.query.categoryFilter as string) || undefined,
          dateFrom: (req.query.dateFrom as string) || undefined,
          dateTo: (req.query.dateTo as string) || undefined,
          billId: req.query.billId != null ? Number(req.query.billId) : undefined,
          patientId: req.query.patientId != null ? Number(req.query.patientId) : undefined,
        });
        res.json({ items: result.items || [], total: result.total, processingCount: result.processingCount, completeCount: result.completeCount, withReportsCount: result.withReportsCount });
      } else {
        const result = await storage.getLabTests();
        res.json(result);
      }
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

  app.get("/api/lab-tests/by-code", async (req, res) => {
    try {
      const testCode = (req.query.testCode as string)?.trim();
      if (!testCode) return res.status(400).json({ message: "Query parameter 'testCode' is required" });
      const test = await storage.getLabTestByCode(testCode);
      if (!test) return res.status(404).json({ message: "Lab test not found" });
      res.json(test);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/lab-tests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid lab test id" });
      const test = await storage.getLabTestWithPatient(id);
      if (!test) return res.status(404).json({ message: "Lab test not found" });
      res.json(test);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/lab-tests", async (req, res) => {
    try {
      const data = validateBody(insertLabTestSchema, req.body);
      const test = await storage.createLabTest(data);
      res.status(201).json(test);

      // Direct lab-test creation (not via bill) — notify lab and optionally doctor.
      try {
        const payload: NotificationPayload = {
          id: `lab-${test.id}-${Date.now()}`,
          type: "lab_test_created",
          title: "New Lab Request",
          message: `Lab test ${test.testCode} – ${test.testName}`,
          audience: test.referrerName ? "doctor" : "lab_technologist",
          doctorName: test.referrerName || undefined,
          createdAt: new Date().toISOString(),
          data: { labTestId: test.id, testCode: test.testCode, referrerName: test.referrerName || null },
        };
        pushNotification(payload);
        void persistNotificationForAudience(payload);
      } catch {
        // Ignore notification errors.
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/lab-tests/:id", async (req, res) => {
    try {
      const reportResultSchema = z.object({ parameter: z.string(), result: z.string(), unit: z.string(), normalRange: z.string(), category: z.string().optional() });
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
        reportResults: z.array(reportResultSchema).optional(),
        labTechnologistId: z.number().nullable().optional(),
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
      const existing = await storage.getLabTest(id);
      if (!existing) return res.status(404).json({ message: "Lab test not found" });
      if (existing.status === "awaiting_sample") {
        return res.status(400).json({ message: "Sample collection is required before uploading report. Mark the sample as collected on the Sample Collection page first." });
      }
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

  // Sample Collections – paginated endpoint (always returns { items, total, ... })
  // Items always include patientAge, patientGender, patientDateOfBirth (same shape as lab-tests API).
  app.get("/api/sample-collections-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getSampleCollectionsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        billId: req.query.billId != null ? Number(req.query.billId) : undefined,
        labTestId: req.query.labTestId != null ? Number(req.query.labTestId) : undefined,
      });
      let items = result.items || [];
      // Ensure every item has patientAge, patientGender, patientDateOfBirth (enrich from patient if missing).
      const needEnrich = items.filter((it: any) => it.patientId != null && it.patientAge == null && it.patientGender == null);
      if (needEnrich.length > 0) {
        const patientIds = Array.from(new Set(needEnrich.map((it: any) => it.patientId)));
        const patientMap = new Map<number, any>();
        await Promise.all(patientIds.map(async (pid: number) => {
          const p = await storage.getPatient(pid);
          if (p) patientMap.set(pid, p);
        }));
        const ageFromDob = (dob: string | null | undefined): number | null => {
          if (!dob || typeof dob !== "string") return null;
          const birth = new Date(dob);
          if (isNaN(birth.getTime())) return null;
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          return age >= 0 ? age : null;
        };
        items = items.map((it: any) => {
          if (it.patientId == null || (it.patientAge != null && it.patientGender != null)) return it;
          const p = patientMap.get(it.patientId);
          if (!p) return { ...it, patientAge: null, patientGender: null, patientDateOfBirth: null };
          const patientAge = p.age != null ? p.age : ageFromDob(p.dateOfBirth);
          return { ...it, patientAge: patientAge ?? null, patientGender: p.gender ?? null, patientDateOfBirth: p.dateOfBirth ?? null };
        });
      }
      // Explicit response shape so keys are never omitted (match lab-tests API).
      const out = items.map((it: any) => ({
        id: it.id,
        labTestId: it.labTestId,
        patientId: it.patientId,
        billId: it.billId,
        testName: it.testName,
        sampleType: it.sampleType,
        status: it.status,
        collectedAt: it.collectedAt,
        collectedBy: it.collectedBy,
        notes: it.notes,
        createdAt: it.createdAt,
        patientName: it.patientName,
        patientIdCode: it.patientIdCode,
        patientAge: it.patientAge ?? null,
        patientGender: it.patientGender ?? null,
        patientDateOfBirth: it.patientDateOfBirth ?? null,
      }));
      res.json({ items: out, total: result.total, pendingCount: result.pendingCount, collectedCount: result.collectedCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sample-collections", async (req, res) => {
    try {
      const rawLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const limit = (rawLimit != null && rawLimit > 0) ? rawLimit : (req.query.limit != null ? 10 : undefined);
      if (limit != null) {
        const result = await storage.getSampleCollectionsPaginated({
          limit,
          offset: Number(req.query.offset) || 0,
          search: (req.query.search as string)?.trim() || undefined,
          statusFilter: (req.query.statusFilter as string) || undefined,
          billId: req.query.billId != null ? Number(req.query.billId) : undefined,
          labTestId: req.query.labTestId != null ? Number(req.query.labTestId) : undefined,
        });
        res.json({ items: result.items || [], total: result.total, pendingCount: result.pendingCount, collectedCount: result.collectedCount });
      } else {
        const result = await storage.getSampleCollections();
        res.json(result);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sample-collections/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid sample collection id" });
      const sc = await storage.getSampleCollectionWithPatient(id);
      if (!sc) return res.status(404).json({ message: "Sample collection not found" });
      res.json(sc);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sample-collections/:id", async (req, res) => {
    try {
      const data = req.body;
      const allowed = ["status", "collectedAt", "collectedBy", "notes"];
      const updateData: Record<string, unknown> = {};
      for (const k of allowed) {
        if (data[k] !== undefined) updateData[k] = data[k];
      }
      if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No valid fields to update" });
      if (updateData.status === "collected") {
        updateData.collectedAt = updateData.collectedAt
          ? new Date(updateData.collectedAt as string)
          : new Date();
      }
      const sc = await storage.updateSampleCollection(Number(req.params.id), updateData);
      if (!sc) return res.status(404).json({ message: "Sample collection not found" });
      if (sc.status === "collected" && sc.labTestId) {
        await storage.updateLabTest(sc.labTestId, { status: "processing" });

        // Notify lab team that a sample has been collected and processing can start.
        try {
          const payload: NotificationPayload = {
            id: `sample-${sc.id}-${Date.now()}`,
            type: "sample_collection_created",
            title: "Sample Collected",
            message: `Sample collected for test ${sc.testName}.`,
            audience: "lab_technologist",
            createdAt: new Date().toISOString(),
            data: { sampleCollectionId: sc.id, labTestId: sc.labTestId },
          };
          pushNotification(payload);
          void persistNotificationForAudience(payload);
        } catch {
          // Ignore notification errors.
        }
      }
      res.json(sc);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/sample-collections/:id", async (req, res) => {
    try {
      await storage.deleteSampleCollection(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sample-collections/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
      }
      await storage.bulkDeleteSampleCollections(ids.map((id: any) => Number(id)).filter((n: any) => !Number.isNaN(n)));
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

  app.get("/api/appointments-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "12"), 10) || 12));
      const offset = (page - 1) * limit;
      const result = await storage.getAppointmentsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        fromDate: (req.query.fromDate as string) || undefined,
        toDate: (req.query.toDate as string) || undefined,
      });
      res.json({ items: result.items, total: result.total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/appointments-stats", async (req, res) => {
    try {
      const result = await storage.getAppointmentsStats({
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        fromDate: (req.query.fromDate as string) || undefined,
        toDate: (req.query.toDate as string) || undefined,
      });
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

      // Receptionist + doctor-specific notification for new appointments.
      try {
        const payload: NotificationPayload = {
          id: `appt-${appointment.id}-${Date.now()}`,
          type: "appointment_created",
          title: "New Appointment",
          message: `Appointment scheduled${appointment.doctorName ? ` with Dr. ${appointment.doctorName}` : ""} on ${appointment.appointmentDate || ""}.`,
          audience: appointment.doctorName ? "doctor" : "receptionist",
          doctorName: appointment.doctorName || undefined,
          createdAt: new Date().toISOString(),
          data: { appointmentId: appointment.id, doctorName: appointment.doctorName || null },
        };
        pushNotification(payload);
        void persistNotificationForAudience(payload);
      } catch {
        // Ignore notification errors.
      }
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

  // User notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const limitParam = req.query.limit as string | undefined;
      const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 50)) : 50;
      const items = await storage.getUserNotifications(req.session.userId, limit);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const schema = z.object({
        ids: z.array(z.number()).optional(),
        all: z.boolean().optional(),
      });
      const body = validateBody(schema, req.body);
      const ids = body.all ? undefined : body.ids;
      await storage.markUserNotificationsRead(req.session.userId, ids);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Helper: ensure each doctor also has a corresponding user account with a doctor role.
  async function ensureDoctorUserFromDoctorRecord(doctor: InsertDoctor & { id?: number }) {
    try {
      // Find a role whose name contains "doctor"
      const rolesList = await storage.getRoles();
      const doctorRole = rolesList.find((r) => r.name.toLowerCase().includes("doctor"));

      // Build a stable base username from doctorId or name
      const baseRaw = (doctor.doctorId || doctor.name || "doctor").toLowerCase();
      const baseSanitized = baseRaw.replace(/[^a-z0-9]/g, "") || `doctor${doctor.id ?? ""}`;
      let username = baseSanitized;
      let suffix = 1;
      // Ensure username uniqueness
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const existing = await storage.getUserByUsername(username);
        if (!existing) break;
        username = `${baseSanitized}${suffix++}`;
      }

      const defaultPassword = doctor.doctorId || "doctor123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await storage.createUser({
        username,
        password: hashedPassword,
        fullName: doctor.name,
        email: doctor.email || null,
        phone: doctor.phone || null,
        roleId: doctorRole?.id ?? null,
        qualification: doctor.qualification || null,
        isActive: (doctor as any).status ? (doctor as any).status !== "inactive" : true,
      } as any);
    } catch (err) {
      console.error("Failed to ensure doctor user:", err);
    }
  }

  // Doctors – paginated endpoint (always returns { items, total })
  app.get("/api/doctors-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const result = await storage.getDoctorsPaginated({
        limit,
        offset,
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        departmentFilter: (req.query.departmentFilter as string) || undefined,
      });
      res.json({ items: result.items, total: result.total });
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

  app.get("/api/doctors-stats", async (req, res) => {
    try {
      const result = await storage.getDoctorsStats({
        search: (req.query.search as string)?.trim() || undefined,
        statusFilter: (req.query.statusFilter as string) || undefined,
        departmentFilter: (req.query.departmentFilter as string) || undefined,
      });
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
      // Ensure there is a matching user account with doctor role for this doctor.
      await ensureDoctorUserFromDoctorRecord({ ...data, id: doctor.id });
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

      // Try to sync with existing user; if none, create one.
      try {
        const users = await storage.getUsers();
        const match = users.find((u: any) => {
          const emailMatch = doctor.email && u.email && String(u.email).toLowerCase() === String(doctor.email).toLowerCase();
          const nameMatch = u.fullName === doctor.name;
          return emailMatch || nameMatch;
        });
        if (match) {
          const rolesList = await storage.getRoles();
          const doctorRole = rolesList.find((r) => r.name.toLowerCase().includes("doctor"));
          await storage.updateUser(match.id, {
            fullName: doctor.name,
            email: doctor.email || null,
            phone: doctor.phone || null,
            qualification: doctor.qualification || null,
            isActive: doctor.status !== "inactive",
            roleId: match.roleId || doctorRole?.id || null,
          } as any);
        } else {
          await ensureDoctorUserFromDoctorRecord({ ...(doctor as any), id: doctor.id });
        }
      } catch (err) {
        console.error("Failed to sync doctor update with user:", err);
      }

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

  // Medicine Purchases
  app.get("/api/medicine-purchases", async (_req, res) => {
    try {
      const result = await storage.getMedicinePurchases();
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/medicine-purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const purchase = await storage.getMedicinePurchase(id);
      if (!purchase) return res.status(404).json({ message: "Purchase not found" });
      res.json(purchase);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/medicine-purchases", async (req, res) => {
    try {
      const parsed = insertMedicinePurchaseSchema.parse(req.body);
      const purchase = await storage.createMedicinePurchase(parsed);
      res.status(201).json(purchase);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put("/api/medicine-purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = req.body;
      const purchase = await storage.updateMedicinePurchase(id, data);
      if (!purchase) return res.status(404).json({ message: "Purchase not found" });
      res.json(purchase);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/medicine-purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteMedicinePurchase(id);
      res.json({ message: "Deleted" });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Dues – paginated endpoint (always returns { summaries, total })
  app.get("/api/dues-paginated", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const result = await storage.getPatientsDueSummary(limit, offset, search, statusFilter, dateFrom, dateTo);
      res.json(result);
    } catch (err: any) {
      console.error("[due] getPatientsDueSummary (dues paginated) error:", err?.message ?? err);
      res.status(500).json({ message: err?.message ?? "Failed to load patients summary" });
    }
  });

  // Alias: /api/dues -> /api/due/patients-summary (for clients/proxies that use plural)
  app.get("/api/dues", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const result = await storage.getPatientsDueSummary(limit, offset, search, statusFilter, dateFrom, dateTo);
      res.json(result);
    } catch (err: any) {
      console.error("[due] getPatientsDueSummary (dues alias) error:", err?.message ?? err);
      res.status(500).json({ message: err?.message ?? "Failed to load patients summary" });
    }
  });
  app.get("/api/dues-stats", async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const search = (req.query.search as string)?.trim() || undefined;
      const statusFilter = (req.query.statusFilter as string) && req.query.statusFilter !== "all" ? req.query.statusFilter : undefined;
      const stats = await storage.getPatientsDueSummaryStats(dateFrom, dateTo, search, statusFilter);
      res.json(stats);
    } catch (err: any) {
      console.error("[due] getPatientsDueSummaryStats (dues alias) error:", err?.message ?? err);
      res.status(500).json({ message: err?.message ?? "Failed to load due statistics" });
    }
  });

  // Unmatched /api routes -> 404 JSON (avoid SPA fallback)
  app.use("/api", (req, res) => {
    console.warn(`[api] 404 unmatched: method=${req.method} path=${req.path} url=${req.url} originalUrl=${req.originalUrl}`);
    res.status(404).json({ message: "Not found" });
  });

  return httpServer;
}
