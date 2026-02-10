import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, LogOut, KeyRound, Shield, User, Lock } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export default function AuthenticationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const [passwordForm, setPasswordForm] = useState({ userId: "", currentPassword: "", newPassword: "", confirmPassword: "" });

  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      setLoggedInUser(data);
      setPasswordForm(prev => ({ ...prev, userId: String(data.id) }));
      toast({ title: "Login successful", description: `Welcome back, ${data.fullName}` });
      setLoginForm({ username: "", password: "" });
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/auth/change-password", { ...data, userId: Number(data.userId) });
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordForm({ userId: loggedInUser?.id ? String(loggedInUser.id) : "", currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    setLoggedInUser(null);
    setPasswordForm({ userId: "", currentPassword: "", newPassword: "", confirmPassword: "" });
    toast({ title: "Logged out successfully" });
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Authentication</h1>
        <p className="text-sm text-muted-foreground">Login, logout, and manage passwords</p>
      </div>

      {loggedInUser && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900">
                  <User className="h-5 w-5 text-green-700 dark:text-green-300" />
                </div>
                <div>
                  <p className="font-semibold" data-testid="text-logged-in-user">{loggedInUser.fullName}</p>
                  <p className="text-sm text-muted-foreground">@{loggedInUser.username} {loggedInUser.email ? `| ${loggedInUser.email}` : ""}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate no-default-active-elevate">
                Logged In
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-auth">
          <TabsTrigger value="login" data-testid="tab-login">
            <LogIn className="h-4 w-4 mr-2" /> Login
          </TabsTrigger>
          <TabsTrigger value="logout" data-testid="tab-logout">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </TabsTrigger>
          <TabsTrigger value="change-password" data-testid="tab-change-password">
            <KeyRound className="h-4 w-4 mr-2" /> Change Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-blue-500" /> Staff Login
              </CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="Enter username"
                    className="pl-9"
                    data-testid="input-login-username"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="pl-9"
                    data-testid="input-login-password"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!loginForm.username || !loginForm.password || loginMutation.isPending}
                onClick={() => loginMutation.mutate(loginForm)}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logout">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-amber-500" /> Logout
              </CardTitle>
              <CardDescription>End your current session</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md">
              {loggedInUser ? (
                <div className="space-y-4">
                  <p className="text-sm">You are currently logged in as <strong>{loggedInUser.fullName}</strong> (@{loggedInUser.username})</p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You are not logged in. Please login first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change-password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" /> Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {!loggedInUser ? (
                <p className="text-sm text-muted-foreground">Please login first to change your password.</p>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Current Password</label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">New Password</label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-sm text-destructive">Passwords do not match</p>
                  )}
                  <Button
                    className="w-full"
                    disabled={
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      passwordForm.newPassword !== passwordForm.confirmPassword ||
                      changePasswordMutation.isPending
                    }
                    onClick={() => changePasswordMutation.mutate({
                      userId: String(loggedInUser.id),
                      currentPassword: passwordForm.currentPassword,
                      newPassword: passwordForm.newPassword,
                    })}
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" /> Registered Staff Accounts
          </CardTitle>
          <CardDescription>All staff members with system access</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No staff accounts found. Create staff accounts from User and Role.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Username</th>
                    <th className="text-left p-3 font-medium">Full Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b" data-testid={`row-user-${u.id}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span className="font-medium">@{u.username}</span>
                        </div>
                      </td>
                      <td className="p-3">{u.fullName}</td>
                      <td className="p-3">{u.email || "-"}</td>
                      <td className="p-3">
                        {u.roleName ? (
                          <Badge className={`no-default-hover-elevate no-default-active-elevate ${
                            u.roleName === "Admin" ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20" :
                            u.roleName === "Doctor" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20" :
                            u.roleName === "Receptionist" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" :
                            "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                          }`}>
                            {u.roleName}
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate ${u.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
