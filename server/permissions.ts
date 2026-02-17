/**
 * Server-side permission enforcement. Maps API routes to permission checks.
 */
import type { Request, Response, NextFunction } from "express";
import type { IStorage } from "./storage";
import { hasPermission, mergePermissions } from "@shared/permissions";

type RouteRule = { prefix: string; module: string };
const ROUTE_TO_MODULE: RouteRule[] = [
  { prefix: "/api/dashboard", module: "dashboard" },
  { prefix: "/api/bills", module: "make_payment" },
  { prefix: "/api/opd-visits", module: "opd" },
  { prefix: "/api/appointments", module: "appointments" },
  { prefix: "/api/services", module: "services" },
  { prefix: "/api/packages", module: "services" },
  { prefix: "/api/injections", module: "services" },
  { prefix: "/api/lab-tests", module: "lab_tests" },
  { prefix: "/api/sample-collections", module: "lab_tests" },
  { prefix: "/api/medicines", module: "medicines" },
  { prefix: "/api/medicine-purchases", module: "medicines" },
  { prefix: "/api/doctors", module: "doctors" },
  { prefix: "/api/patients", module: "patients" },
  { prefix: "/api/expenses", module: "expenses" },
  { prefix: "/api/bank-transactions", module: "bank_transactions" },
  { prefix: "/api/investments", module: "investments" },
  { prefix: "/api/investors", module: "investments" },
  { prefix: "/api/contributions", module: "investments" },
  { prefix: "/api/salaries", module: "salary" },
  { prefix: "/api/salary-profiles", module: "salary" },
  { prefix: "/api/salary-loans", module: "salary" },
  { prefix: "/api/loan-installments", module: "salary" },
  { prefix: "/api/payroll-runs", module: "salary" },
  { prefix: "/api/payslips", module: "salary" },
  { prefix: "/api/users", module: "user_role" },
  { prefix: "/api/roles", module: "user_role" },
  { prefix: "/api/integrations", module: "integrations" },
  { prefix: "/api/reports", module: "reports" },
  { prefix: "/api/settings", module: "settings" },
  { prefix: "/api/activity-logs", module: "settings" },
];

function methodToAction(method: string): "view" | "add" | "edit" | "delete" {
  const m = method.toUpperCase();
  if (m === "GET") return "view";
  if (m === "POST") return "add";
  if (m === "PATCH" || m === "PUT") return "edit";
  if (m === "DELETE") return "delete";
  return "view";
}

function resolveModule(path: string): string | null {
  for (const { prefix, module } of ROUTE_TO_MODULE) {
    if (path.startsWith(prefix)) return module;
  }
  return null;
}

const SKIP_PREFIXES = ["/api/auth", "/api/public", "/api/health"];

function shouldSkipPermissionCheck(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path.startsWith(p));
}

export function createRequirePermission(storage: IStorage) {
  return async function requirePermission(req: Request, res: Response, next: NextFunction) {
    if (shouldSkipPermissionCheck(req.path)) return next();

    const module = resolveModule(req.path);
    if (!module) return next(); // unknown route, allow (will 404 or succeed)

    const action = methodToAction(req.method);
    const roleId = req.session?.roleId;
    let permissions: ReturnType<typeof mergePermissions>;
    let roleName: string | undefined;

    try {
      if (roleId) {
        const role = await storage.getRole(roleId);
        if (role) {
          roleName = role.name;
          if (role.name.toLowerCase() === "admin") return next();
          permissions = mergePermissions(role.permissions);
        } else {
          permissions = mergePermissions({});
        }
      } else {
        permissions = mergePermissions({});
      }
      if (hasPermission(permissions, module, action as "view" | "add" | "edit" | "delete", roleName)) {
        return next();
      }
      return res.status(403).json({ message: "Insufficient permissions" });
    } catch (err) {
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}
