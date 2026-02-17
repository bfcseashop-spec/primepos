import { createContext, useContext, type ReactNode } from "react";
import { canView, canAdd, canEdit, canDelete } from "@shared/permissions";
import type { PermissionMap } from "@shared/permissions";

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  roleId?: number | null;
  role?: string;
  permissions?: PermissionMap;
};

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({ user, children }: { user: AuthUser | null; children: ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function usePermissions(moduleKey: string) {
  const user = useAuth();
  const perms = user?.permissions;
  const roleName = user?.role;
  return {
    canView: canView(perms, moduleKey, roleName),
    canAdd: canAdd(perms, moduleKey, roleName),
    canEdit: canEdit(perms, moduleKey, roleName),
    canDelete: canDelete(perms, moduleKey, roleName),
  };
}
