import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Plus, Eye, Edit, Trash2, ShieldCheck, Check, X } from "lucide-react";
import type { Role } from "@shared/schema";

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
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">User Management</h1>
            <p className="text-sm text-muted-foreground">Manage users and assign roles</p>
          </div>
          <Button onClick={() => setStaffDialogOpen(true)} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-1" /> Create User
          </Button>
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
                  <td className="p-3">{user.email || "-"}</td>
                  <td className="p-3 font-medium">{user.fullName}</td>
                  <td className="p-3">
                    <Badge variant="outline">{user.roleName || "No Role"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedUser(user); setViewDialogOpen(true); }}
                        data-testid={`button-view-user-${user.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm("Are you sure you want to delete this user?")) deleteUserMutation.mutate(user.id); }}
                        data-testid={`button-delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
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
              <h2 className="text-xl font-bold" data-testid="text-roles-title">Roles Management</h2>
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
                        <ShieldCheck className="h-4 w-4 mr-1" />
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
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm("Are you sure you want to delete this role?")) deleteRoleMutation.mutate(role.id); }}
                          data-testid={`button-delete-role-${role.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Full Name</span><p className="font-medium">{selectedUser.fullName}</p></div>
                <div><span className="text-muted-foreground">Username</span><p className="font-medium">@{selectedUser.username}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedUser.email || "-"}</p></div>
                <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedUser.phone || "-"}</p></div>
                <div><span className="text-muted-foreground">Role</span><p className="font-medium">{selectedUser.roleName || "No Role"}</p></div>
                <div><span className="text-muted-foreground">Status</span><p><Badge className={selectedUser.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"}>{selectedUser.isActive ? "Active" : "Deactive"}</Badge></p></div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setViewDialogOpen(false); setSelectedUser(null); }}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setSelectedUser(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
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
                      <td className="p-3 font-medium">{mod.label}</td>
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
