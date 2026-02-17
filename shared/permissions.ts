/**
 * Canonical permission configuration shared by server and client.
 * Used for: Role Permission UI, API enforcement, sidebar visibility.
 */

export const PERMISSION_ACTIONS = ["view", "add", "edit", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "make_payment", label: "Make Payment (POS)" },
  { key: "opd", label: "OPD Management" },
  { key: "appointments", label: "Appointments" },
  { key: "services", label: "Services" },
  { key: "lab_tests", label: "Lab Tests" },
  { key: "medicines", label: "Medicines" },
  { key: "doctors", label: "Doctor Management" },
  { key: "patients", label: "Patient Registration" },
  { key: "expenses", label: "Expenses" },
  { key: "bank_transactions", label: "Bank Transactions" },
  { key: "investments", label: "Investments" },
  { key: "salary", label: "Salary" },
  { key: "user_role", label: "User & Role" },
  { key: "authentication", label: "Authentication" },
  { key: "integrations", label: "Integrations" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]["key"];

export type PermissionMap = Record<string, Record<string, boolean>>;

export function getDefaultPermissions(): PermissionMap {
  const perms: PermissionMap = {};
  PERMISSION_MODULES.forEach((m) => {
    perms[m.key] = {};
    PERMISSION_ACTIONS.forEach((a) => {
      perms[m.key][a] = false;
    });
  });
  return perms;
}

/** Legacy schema used read/write/delete. Map to view/add/edit/delete for backwards compat. */
const LEGACY_ACTION_MAP: Record<string, string[]> = {
  view: ["view", "read"],
  add: ["add", "write"],
  edit: ["edit", "write"],
  delete: ["delete"],
};

/** For each new module key, legacy DB may have used this old key. */
const LEGACY_OLD_KEYS: Record<string, string> = {
  make_payment: "billing",
  bank_transactions: "bank",
  user_role: "staff",
};

export function mergePermissions(saved: unknown): PermissionMap {
  const defaults = getDefaultPermissions();
  if (!saved || typeof saved !== "object") return defaults;
  const savedObj = saved as Record<string, unknown>;
  PERMISSION_MODULES.forEach((m) => {
    const mod = savedObj[m.key] ?? savedObj[LEGACY_OLD_KEYS[m.key] ?? ""];
    const modObj = (mod && typeof mod === "object" ? mod : null) as Record<string, unknown> | null;
    if (modObj) {
      PERMISSION_ACTIONS.forEach((a) => {
        const keysToCheck = LEGACY_ACTION_MAP[a] ?? [a];
        defaults[m.key][a] = keysToCheck.some((k) => modObj![k] === true);
      });
    }
  });
  return defaults;
}

/** Check if user has permission. Admin role bypasses all checks. */
export function hasPermission(
  permissions: PermissionMap | null | undefined,
  moduleKey: string,
  action: PermissionAction,
  roleName?: string
): boolean {
  if (roleName?.toLowerCase() === "admin") return true;
  if (!permissions || !permissions[moduleKey]) return false;
  return !!permissions[moduleKey][action];
}

export function canView(permissions: PermissionMap | null | undefined, moduleKey: string, roleName?: string): boolean {
  return hasPermission(permissions, moduleKey, "view", roleName);
}

export function canAdd(permissions: PermissionMap | null | undefined, moduleKey: string, roleName?: string): boolean {
  return hasPermission(permissions, moduleKey, "add", roleName);
}

export function canEdit(permissions: PermissionMap | null | undefined, moduleKey: string, roleName?: string): boolean {
  return hasPermission(permissions, moduleKey, "edit", roleName);
}

export function canDelete(permissions: PermissionMap | null | undefined, moduleKey: string, roleName?: string): boolean {
  return hasPermission(permissions, moduleKey, "delete", roleName);
}

/** Sidebar URL to permission module. Packages/sample-collections map to parent modules. */
export const NAV_TO_MODULE: Record<string, PermissionModuleKey> = {
  "/": "dashboard",
  "/billing": "make_payment",
  "/opd": "opd",
  "/appointments": "appointments",
  "/services": "services",
  "/packages": "services",
  "/lab-tests": "lab_tests",
  "/sample-collections": "lab_tests",
  "/medicines": "medicines",
  "/doctors": "doctors",
  "/register-patient": "patients",
  "/expenses": "expenses",
  "/bank": "bank_transactions",
  "/investments": "investments",
  "/salary": "salary",
  "/staff": "user_role",
  "/authentication": "authentication",
  "/integrations": "integrations",
  "/reports": "reports",
  "/settings": "settings",
};
