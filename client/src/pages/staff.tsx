import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Shield, UserCog } from "lucide-react";
import type { User, Role, Permissions } from "@shared/schema";
import { permissionModules } from "@shared/schema";

export default function StaffPage() {
  const { toast } = useToast();
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Partial<Permissions>>({});

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
      toast({ title: "Staff member added successfully" });
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
      setRoleDialogOpen(false);
      setRolePermissions({});
      toast({ title: "Role created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleStaffMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff status updated" });
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

  const handleCreateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createRoleMutation.mutate({
      name: form.get("name"),
      permissions: rolePermissions,
    });
  };

  const togglePermission = (module: string, action: "read" | "write" | "delete") => {
    setRolePermissions(prev => ({
      ...prev,
      [module]: {
        read: prev[module as keyof Permissions]?.read || false,
        write: prev[module as keyof Permissions]?.write || false,
        delete: prev[module as keyof Permissions]?.delete || false,
        [action]: !prev[module as keyof Permissions]?.[action],
      },
    }));
  };

  const filteredStaff = staff.filter((s: any) =>
    s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const staffColumns = [
    { header: "Name", accessor: (row: any) => (
      <div>
        <span className="font-medium text-sm">{row.fullName}</span>
        <span className="block text-xs text-muted-foreground">@{row.username}</span>
      </div>
    )},
    { header: "Email", accessor: (row: any) => row.email || "-" },
    { header: "Phone", accessor: (row: any) => row.phone || "-" },
    { header: "Role", accessor: (row: any) => (
      <Badge variant="outline">{row.roleName || "No Role"}</Badge>
    )},
    { header: "Status", accessor: (row: any) => (
      <Badge variant={row.isActive ? "default" : "secondary"}>
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
    { header: "Actions", accessor: (row: any) => (
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => { e.stopPropagation(); toggleStaffMutation.mutate({ id: row.id, isActive: !row.isActive }); }}
        data-testid={`button-toggle-staff-${row.id}`}
      >
        {row.isActive ? "Deactivate" : "Activate"}
      </Button>
    )},
  ];

  const roleColumns = [
    { header: "Role Name", accessor: (row: Role) => <span className="font-medium">{row.name}</span> },
    { header: "Permissions", accessor: (row: Role) => {
      const perms = row.permissions as any;
      const count = Object.keys(perms || {}).filter(k => perms[k]?.read || perms[k]?.write).length;
      return <span className="text-sm text-muted-foreground">{count} modules</span>;
    }},
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="User and Role"
        description="Manage staff members and role permissions"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-new-role">
                  <Shield className="h-4 w-4 mr-1" /> New Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div>
                    <Label htmlFor="roleName">Role Name *</Label>
                    <Input id="roleName" name="name" required data-testid="input-role-name" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Permissions</Label>
                    <div className="mt-2 border rounded-md">
                      <div className="grid grid-cols-[1fr,60px,60px,60px] gap-2 p-2 bg-muted/50 text-xs font-medium">
                        <span>Module</span>
                        <span className="text-center">Read</span>
                        <span className="text-center">Write</span>
                        <span className="text-center">Delete</span>
                      </div>
                      {permissionModules.map(mod => (
                        <div key={mod} className="grid grid-cols-[1fr,60px,60px,60px] gap-2 p-2 items-center border-t">
                          <span className="text-sm capitalize">{mod}</span>
                          {(["read", "write", "delete"] as const).map(action => (
                            <div key={action} className="flex justify-center">
                              <Checkbox
                                checked={rolePermissions[mod]?.[action] || false}
                                onCheckedChange={() => togglePermission(mod, action)}
                                data-testid={`checkbox-${mod}-${action}`}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createRoleMutation.isPending} data-testid="button-submit-role">
                    {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-staff">
                  <Plus className="h-4 w-4 mr-1" /> Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateStaff} className="space-y-3">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" name="fullName" required data-testid="input-staff-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input id="username" name="username" required data-testid="input-staff-username" />
                    </div>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input id="password" name="password" type="password" required data-testid="input-staff-password" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" data-testid="input-staff-email" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" data-testid="input-staff-phone" />
                    </div>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select name="roleId">
                      <SelectTrigger data-testid="select-staff-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createStaffMutation.isPending} data-testid="button-submit-staff">
                    {createStaffMutation.isPending ? "Adding..." : "Add Staff Member"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="staff">
          <TabsList>
            <TabsTrigger value="staff" data-testid="tab-staff">
              <UserCog className="h-3.5 w-3.5 mr-1" /> Staff
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-3.5 w-3.5 mr-1" /> Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Staff Members</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    className="pl-8 h-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-staff"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={staffColumns} data={filteredStaff} isLoading={staffLoading} emptyMessage="No staff members" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-3">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Roles & Permissions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={roleColumns} data={roles} emptyMessage="No roles defined" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
