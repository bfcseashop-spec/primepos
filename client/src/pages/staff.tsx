import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Eye, Edit, Trash2, ShieldCheck, Check, X, Users, Shield, UserCheck } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@shared/schema";

function getRoleBadgeClasses(roleName: string): string {
  const lower = (roleName || "").toLowerCase();
  if (lower === "admin") return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20";
  if (lower === "doctor") return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20";
  if (lower === "receptionist") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
  if (lower === "finance") return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20";
  return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20";
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  dashboard: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20" },
  make_payment: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20" },
  opd: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", border: "border-teal-500/20" },
  appointments: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", border: "border-violet-500/20" },
  services: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20" },
  lab_tests: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-500/20" },
  medicines: { bg: "bg-green-500/10", text: "text-green-700 dark:text-green-300", border: "border-green-500/20" },
  doctors: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/20" },
  patients: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20" },
  expenses: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", border: "border-red-500/20" },
  bank_transactions: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20" },
  investments: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-500/20" },
  salary: { bg: "bg-lime-500/10", text: "text-lime-700 dark:text-lime-300", border: "border-lime-500/20" },
  user_role: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20" },
  authentication: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20" },
  integrations: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/20" },
  reports: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-500/20" },
  settings: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", border: "border-slate-500/20" },
};

const PERMISSION_MODULES = [
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

const PERMISSION_ACTIONS = ["view", "add", "edit", "delete"] as const;

type PermissionMap = Record<string, Record<string, boolean>>;

function getDefaultPermissions(): PermissionMap {
  const perms: PermissionMap = {};
  PERMISSION_MODULES.forEach(m => {
    perms[m.key] = {};
    PERMISSION_ACTIONS.forEach(a => { perms[m.key][a] = false; });
  });
  return perms;
}

function mergePermissions(saved: any): PermissionMap {
  const defaults = getDefaultPermissions();
  if (!saved || typeof saved !== "object") return defaults;
  PERMISSION_MODULES.forEach(m => {
    if (saved[m.key] && typeof saved[m.key] === "object") {
      PERMISSION_ACTIONS.forEach(a => {
        defaults[m.key][a] = !!saved[m.key][a];
      });
    }
  });
  return defaults;
}

const avatarGradients = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

export default function StaffPage() {
  const { toast } = useToast();
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionRole, setPermissionRole] = useState<Role | null>(null);
  const [permissionMap, setPermissionMap] = useState<PermissionMap>(getDefaultPermissions());
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  const { data: staff = [], isLoading: staffLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setStaffDialogOpen(false);
      toast({ title: "User created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({ title: "User updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setRoleName("");
      setRoleDescription("");
      toast({ title: "Role created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setEditRoleDialogOpen(false);
      setSelectedRole(null);
      toast({ title: "Role updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createStaffMutation.mutate({
      username: form.get("username"),
      password: form.get("password"),
      fullName: form.get("fullName"),
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      roleId: form.get("roleId") ? Number(form.get("roleId")) : null,
      isActive: true,
    });
  };

  const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    const form = new FormData(e.currentTarget);
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: {
        fullName: form.get("fullName"),
        email: form.get("email") || null,
        phone: form.get("phone") || null,
        roleId: form.get("roleId") ? Number(form.get("roleId")) : null,
        isActive: form.get("status") === "active",
        qualification: form.get("qualification") || null,
      },
    });
  };

  const handleCreateRole = () => {
    if (!roleName.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }
    createRoleMutation.mutate({
      name: roleName.trim(),
      description: roleDescription.trim(),
      permissions: {},
    });
  };

  const handleEditRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRole) return;
    const form = new FormData(e.currentTarget);
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: {
        name: form.get("name"),
        description: form.get("description") || "",
      },
    });
  };

  const openPermissionDialog = (role: Role) => {
    setPermissionRole(role);
    setPermissionMap(mergePermissions(role.permissions));
    setPermissionDialogOpen(true);
  };

  const togglePermission = (moduleKey: string, action: string) => {
    setPermissionMap(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [action]: !prev[moduleKey][action],
      },
    }));
  };

  const toggleModuleAll = (moduleKey: string) => {
    const allChecked = PERMISSION_ACTIONS.every(a => permissionMap[moduleKey]?.[a]);
    setPermissionMap(prev => ({
      ...prev,
      [moduleKey]: PERMISSION_ACTIONS.reduce((acc, a) => ({ ...acc, [a]: !allChecked }), {} as Record<string, boolean>),
    }));
  };

  const toggleActionAll = (action: string) => {
    const allChecked = PERMISSION_MODULES.every(m => permissionMap[m.key]?.[action]);
    setPermissionMap(prev => {
      const next = { ...prev };
      PERMISSION_MODULES.forEach(m => {
        next[m.key] = { ...next[m.key], [action]: !allChecked };
      });
      return next;
    });
  };

  const selectAllPermissions = () => {
    const allChecked = PERMISSION_MODULES.every(m => PERMISSION_ACTIONS.every(a => permissionMap[m.key]?.[a]));
    const val = !allChecked;
    const next: PermissionMap = {};
    PERMISSION_MODULES.forEach(m => {
      next[m.key] = {};
      PERMISSION_ACTIONS.forEach(a => { next[m.key][a] = val; });
    });
    setPermissionMap(next);
  };

  const savePermissions = () => {
    if (!permissionRole) return;
    updateRoleMutation.mutate({
      id: permissionRole.id,
      data: { permissions: permissionMap },
    }, {
      onSuccess: () => {
        setPermissionDialogOpen(false);
        setPermissionRole(null);
        toast({ title: "Permissions saved successfully" });
      },
    });
  };

  const getPermissionCount = (role: Role) => {
    const perms = role.permissions as PermissionMap;
    if (!perms || typeof perms !== "object") return 0;
    let count = 0;
    Object.values(perms).forEach(actions => {
      if (actions && typeof actions === "object") {
        Object.values(actions).forEach(v => { if (v) count++; });
      }
    });
    return count;
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="User Management"
        description="Manage users and assign roles"
        actions={
          <Button size="sm" onClick={() => setStaffDialogOpen(true)} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-1" /> Create User
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "total-users", label: "Total Users", gradient: "from-blue-500 to-blue-600", value: staff.length, icon: Users },
            { key: "active-users", label: "Active Users", gradient: "from-emerald-500 to-emerald-600", value: staff.filter((u: any) => u.isActive).length, icon: UserCheck },
            { key: "roles", label: "Roles", gradient: "from-violet-500 to-violet-600", value: roles.length, icon: Shield },
            { key: "permissions-set", label: "Permissions Set", gradient: "from-amber-500 to-amber-600", value: roles.filter(r => getPermissionCount(r) > 0).length, icon: ShieldCheck },
          ].map((s) => (
            <Card key={s.key} data-testid={`stat-${s.key}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${s.gradient} shrink-0`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-gradient-to-br from-blue-500 to-blue-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold" data-testid="text-users-title">User Management</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Manage system users and access</p>
          </div>
        </div>

        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Full Name</th>
                <th className="p-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffLoading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users found</td></tr>
              ) : staff.map((user: any) => (
                <tr key={user.id} className="border-b last:border-b-0" data-testid={`row-user-${user.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[user.id % avatarGradients.length]} text-white text-xs font-semibold`}>
                          {(user.fullName || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.email || "-"}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{user.fullName}</td>
                  <td className="p-3">
                    <Badge className={`no-default-hover-elevate no-default-active-elevate ${getRoleBadgeClasses(user.roleName || "")}`}>{user.roleName || "No Role"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedUser(user); setViewDialogOpen(true); }}
                        data-testid={`button-view-user-${user.id}`}
                      >
                        <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteUserConfirm({ open: true, id: user.id })}
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-gradient-to-br from-violet-500 to-violet-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold" data-testid="text-roles-title">Roles Management</h2>
              </div>
              <p className="text-sm text-muted-foreground">Create and manage user roles</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create New Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  placeholder="Enter role name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  data-testid="input-role-name"
                />
              </div>
              <div>
                <Label htmlFor="roleDesc">Description</Label>
                <Textarea
                  id="roleDesc"
                  placeholder="Enter role description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="input-role-description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setRoleName(""); setRoleDescription(""); }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending}
                  data-testid="button-create-role"
                >
                  {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 text-left font-medium text-muted-foreground">Role Name</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Permissions</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No roles defined</td></tr>
                ) : roles.map((role) => {
                  const permCount = getPermissionCount(role);
                  const totalPerms = PERMISSION_MODULES.length * PERMISSION_ACTIONS.length;
                  return (
                  <tr key={role.id} className="border-b last:border-b-0" data-testid={`row-role-${role.id}`}>
                    <td className="p-3 font-medium">{role.name}</td>
                    <td className="p-3 text-muted-foreground">{role.description || "-"}</td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPermissionDialog(role)}
                        data-testid={`button-permission-role-${role.id}`}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1 text-violet-600 dark:text-violet-400" />
                        {permCount > 0 ? (
                          <span>{permCount}/{totalPerms}</span>
                        ) : (
                          <span className="text-muted-foreground">Set Permissions</span>
                        )}
                      </Button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setSelectedRole(role); setEditRoleDialogOpen(true); }}
                          data-testid={`button-edit-role-${role.id}`}
                        >
                          <Edit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteRoleConfirm({ open: true, id: role.id })}
                          data-testid={`button-delete-role-${role.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteUserConfirm.open}
        onOpenChange={(open) => setDeleteUserConfirm((c) => ({ ...c, open }))}
        title="Delete user"
        description="Are you sure you want to delete this user? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => { if (deleteUserConfirm.id != null) deleteUserMutation.mutate(deleteUserConfirm.id); }}
      />
      <ConfirmDialog
        open={deleteRoleConfirm.open}
        onOpenChange={(open) => setDeleteRoleConfirm((c) => ({ ...c, open }))}
        title="Delete role"
        description="Are you sure you want to delete this role? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => { if (deleteRoleConfirm.id != null) deleteRoleMutation.mutate(deleteRoleConfirm.id); }}
      />

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription className="sr-only">Create a new user account</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-3">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" required data-testid="input-user-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input id="username" name="username" required data-testid="input-user-username" />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input id="password" name="password" type="password" required data-testid="input-user-password" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" data-testid="input-user-email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" data-testid="input-user-phone" />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select name="roleId">
                <SelectTrigger data-testid="select-user-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createStaffMutation.isPending} data-testid="button-submit-user">
              {createStaffMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (!open) { setViewDialogOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="sr-only">View user account details</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Full Name</span><p className="font-medium">{selectedUser.fullName}</p></div>
                <div><span className="text-muted-foreground">Username</span><p className="font-medium">@{selectedUser.username}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedUser.email || "-"}</p></div>
                <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedUser.phone || "-"}</p></div>
                <div><span className="text-muted-foreground">Role</span><p className="font-medium">{selectedUser.roleName || "No Role"}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><Badge className={selectedUser.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"}>{selectedUser.isActive ? "Active" : "Deactive"}</Badge></p></div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setViewDialogOpen(false); setSelectedUser(null); }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="sr-only">Edit user account information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-3">
              <div>
                <Label htmlFor="editFullName">Full Name *</Label>
                <Input id="editFullName" name="fullName" defaultValue={selectedUser.fullName} required data-testid="input-edit-user-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="editEmail">Email</Label>
                  <Input id="editEmail" name="email" type="email" defaultValue={selectedUser.email || ""} data-testid="input-edit-user-email" />
                </div>
                <div>
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input id="editPhone" name="phone" defaultValue={selectedUser.phone || ""} data-testid="input-edit-user-phone" />
                </div>
              </div>
              <div>
                <Label htmlFor="editQualification">Qualification (for Lab Technologist)</Label>
                <Input id="editQualification" name="qualification" defaultValue={selectedUser.qualification || ""} placeholder="e.g. B.Sc in Lab Medicine (RU) BD" data-testid="input-edit-user-qualification" />
              </div>
              <div>
                <Label>Signature (for Lab Technologist)</Label>
                <div className="flex items-center gap-2">
                  {selectedUser.signatureUrl && (
                    <img src={selectedUser.signatureUrl} alt="Signature" className="h-10 object-contain border rounded" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="max-w-[200px]"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedUser) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      try {
                        const res = await fetch(`/api/users/${selectedUser.id}/upload-signature`, { method: "POST", body: fd, credentials: "include" });
                        if (res.ok) {
                          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                          toast({ title: "Signature uploaded" });
                        } else {
                          const err = await res.json().catch(() => ({}));
                          toast({ title: err.message || "Upload failed", variant: "destructive" });
                        }
                      } catch {
                        toast({ title: "Upload failed", variant: "destructive" });
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Used on printed lab test reports for Lab Technologist role</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select name="roleId" defaultValue={selectedUser.roleId ? String(selectedUser.roleId) : ""}>
                    <SelectTrigger data-testid="select-edit-user-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={selectedUser.isActive ? "active" : "deactive"}>
                    <SelectTrigger data-testid="select-edit-user-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deactive">Deactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateUserMutation.isPending} data-testid="button-submit-edit-user">
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editRoleDialogOpen} onOpenChange={(open) => { if (!open) { setEditRoleDialogOpen(false); setSelectedRole(null); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription className="sr-only">Edit role name and description</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <form onSubmit={handleEditRole} className="space-y-3">
              <div>
                <Label htmlFor="editRoleName">Role Name *</Label>
                <Input id="editRoleName" name="name" defaultValue={selectedRole.name} required data-testid="input-edit-role-name" />
              </div>
              <div>
                <Label htmlFor="editRoleDesc">Description</Label>
                <Textarea
                  id="editRoleDesc"
                  name="description"
                  defaultValue={selectedRole.description || ""}
                  className="resize-none"
                  rows={3}
                  data-testid="input-edit-role-description"
                />
              </div>
              <Button type="submit" className="w-full" disabled={updateRoleMutation.isPending} data-testid="button-submit-edit-role">
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={permissionDialogOpen} onOpenChange={(open) => { if (!open) { setPermissionDialogOpen(false); setPermissionRole(null); } }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Role Permission
            </DialogTitle>
            <DialogDescription>
              {permissionRole ? `Configure access permissions for "${permissionRole.name}" role` : "Configure access permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch
                checked={PERMISSION_MODULES.every(m => PERMISSION_ACTIONS.every(a => permissionMap[m.key]?.[a]))}
                onCheckedChange={selectAllPermissions}
                data-testid="switch-select-all-permissions"
              />
              <Label className="text-sm font-medium">Select All</Label>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {(() => {
                let enabled = 0;
                PERMISSION_MODULES.forEach(m => PERMISSION_ACTIONS.forEach(a => { if (permissionMap[m.key]?.[a]) enabled++; }));
                const total = PERMISSION_MODULES.length * PERMISSION_ACTIONS.length;
                return <span>{enabled} of {total} permissions enabled</span>;
              })()}
            </div>
          </div>
          <div className="border rounded-md overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="p-3 text-left font-medium text-muted-foreground min-w-[180px]">Module</th>
                  {PERMISSION_ACTIONS.map(action => (
                    <th key={action} className="p-3 text-center font-medium text-muted-foreground min-w-[80px]">
                      <div
                        className="flex flex-col items-center gap-1 w-full cursor-pointer"
                        onClick={() => toggleActionAll(action)}
                        data-testid={`button-toggle-all-${action}`}
                      >
                        <span className="capitalize">{action}</span>
                        <Checkbox
                          checked={PERMISSION_MODULES.every(m => permissionMap[m.key]?.[action])}
                          className="pointer-events-none"
                          data-testid={`checkbox-all-${action}`}
                        />
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-medium text-muted-foreground min-w-[70px]">All</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MODULES.map((mod, i) => {
                  const allChecked = PERMISSION_ACTIONS.every(a => permissionMap[mod.key]?.[a]);
                  const someChecked = PERMISSION_ACTIONS.some(a => permissionMap[mod.key]?.[a]);
                  return (
                    <tr
                      key={mod.key}
                      className={`border-b last:border-b-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                      data-testid={`row-permission-${mod.key}`}
                    >
                      <td className="p-3 font-medium">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${MODULE_COLORS[mod.key]?.bg || ""} ${MODULE_COLORS[mod.key]?.text || ""}`}>
                          {mod.label}
                        </span>
                      </td>
                      {PERMISSION_ACTIONS.map(action => (
                        <td key={action} className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={!!permissionMap[mod.key]?.[action]}
                              onCheckedChange={() => togglePermission(mod.key, action)}
                              data-testid={`checkbox-${mod.key}-${action}`}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={() => toggleModuleAll(mod.key)}
                            data-testid={`checkbox-${mod.key}-all`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setPermissionDialogOpen(false); setPermissionRole(null); }} data-testid="button-cancel-permissions">
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={updateRoleMutation.isPending} data-testid="button-save-permissions">
              <Check className="h-4 w-4 mr-1" />
              {updateRoleMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
