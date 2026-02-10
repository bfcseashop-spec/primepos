import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, MoreVertical, Trash2, Edit, DollarSign, Calendar, Filter, Download, X,
  Building2, Tag, Users, TrendingUp, AlertTriangle, FileText, Wallet, CreditCard,
  Clock, CheckCircle2, Banknote, ArrowUpDown, HandCoins, Play, Eye, RefreshCw,
  ChevronDown, ChevronRight, Landmark, UserCircle, CircleDollarSign, Receipt,
  Upload, Image, FileImage
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Salary, SalaryProfile, SalaryLoan, LoanInstallment, PayrollRun, Payslip } from "@shared/schema";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const DEFAULT_DEPARTMENTS = [
  "General Medicine", "Radiology", "Cardiology", "Orthopedics",
  "Pediatrics", "Pharmacy", "Laboratory", "Administration", "Nursing", "Other"
];

const DEFAULT_SALARY_CATEGORIES = [
  "Full-Time", "Part-Time", "Contract", "Consultant", "Intern", "Overtime", "Bonus", "Other"
];

function loadDepartments(): string[] {
  try {
    const stored = localStorage.getItem("salary_departments");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_DEPARTMENTS;
}

function loadSalaryCategories(): string[] {
  try {
    const stored = localStorage.getItem("salary_categories");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_SALARY_CATEGORIES;
}

function formatCurrency(val: string | number | null | undefined): string {
  const n = Number(val || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function DashboardTab({ profiles, loans, payrollRuns, salaries }: {
  profiles: SalaryProfile[];
  loans: SalaryLoan[];
  payrollRuns: PayrollRun[];
  salaries: Salary[];
}) {
  const activeEmployees = profiles.filter(p => p.status === "active").length;
  const totalBaseSalary = profiles.filter(p => p.status === "active").reduce((sum, p) => sum + Number(p.baseSalary || 0), 0);
  const totalAllowances = profiles.filter(p => p.status === "active").reduce((sum, p) =>
    sum + Number(p.housingAllowance || 0) + Number(p.transportAllowance || 0) + Number(p.mealAllowance || 0) + Number(p.otherAllowance || 0), 0);
  const totalGross = totalBaseSalary + totalAllowances;
  const activeLoans = loans.filter(l => l.status === "active");
  const outstandingLoanTotal = activeLoans.reduce((sum, l) => sum + Number(l.outstanding || 0), 0);
  const monthlyLoanDeductions = activeLoans.reduce((sum, l) => sum + Number(l.installmentAmount || 0), 0);
  const totalPaidSalaries = salaries.filter(s => s.status === "paid").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  const totalPendingSalaries = salaries.filter(s => s.status === "pending").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  const overdueLoans = activeLoans.filter(l => {
    if (!l.startDate) return false;
    const start = new Date(l.startDate);
    const monthsElapsed = (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth());
    const expectedPaid = monthsElapsed * Number(l.installmentAmount || 0);
    return Number(l.totalPaid || 0) < expectedPaid * 0.9;
  });

  const alerts: { type: "warning" | "danger"; message: string }[] = [];
  if (overdueLoans.length > 0) {
    alerts.push({ type: "danger", message: `${overdueLoans.length} loan(s) with overdue installments` });
  }
  if (totalPendingSalaries > 0) {
    alerts.push({ type: "warning", message: `${formatCurrency(totalPendingSalaries)} in pending salary payments` });
  }

  const kpiCards = [
    { label: "Active Employees", value: activeEmployees, icon: Users, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
    { label: "Monthly Gross Payable", value: formatCurrency(totalGross), icon: CircleDollarSign, color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "Outstanding Loans", value: formatCurrency(outstandingLoanTotal), icon: HandCoins, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
    { label: "Monthly Loan Deductions", value: formatCurrency(monthlyLoanDeductions), icon: ArrowUpDown, color: "bg-purple-500", textColor: "text-purple-600 dark:text-purple-400" },
    { label: "Total Paid (All Time)", value: formatCurrency(totalPaidSalaries), icon: CheckCircle2, color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
    { label: "Pending Payments", value: formatCurrency(totalPendingSalaries), icon: Clock, color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-md border ${
              alert.type === "danger"
                ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
            }`} data-testid={`alert-${alert.type}-${i}`}>
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${alert.type === "danger" ? "text-red-500" : "text-amber-500"}`} />
              <span className={`text-sm font-medium ${alert.type === "danger" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
                {alert.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} data-testid={`kpi-card-${kpi.label.replace(/\s+/g, '-').toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className={`text-lg font-bold ${kpi.textColor}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const depts: Record<string, { count: number; total: number }> = {};
              profiles.filter(p => p.status === "active").forEach(p => {
                const dept = p.department || "Unassigned";
                if (!depts[dept]) depts[dept] = { count: 0, total: 0 };
                depts[dept].count++;
                depts[dept].total += Number(p.baseSalary || 0);
              });
              const entries = Object.entries(depts).sort((a, b) => b[1].total - a[1].total);
              if (entries.length === 0) return <p className="text-sm text-muted-foreground">No active profiles</p>;
              const maxTotal = Math.max(...entries.map(([, v]) => v.total));
              return (
                <div className="space-y-3">
                  {entries.map(([dept, val]) => (
                    <div key={dept} data-testid={`dept-breakdown-${dept}`}>
                      <div className="flex items-center justify-between gap-2 text-sm mb-1">
                        <span className="font-medium">{dept}</span>
                        <span className="text-muted-foreground">{val.count} staff &middot; {formatCurrency(val.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all" style={{ width: `${(val.total / maxTotal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Active Loans Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active loans</p>
            ) : (
              <div className="space-y-3">
                {activeLoans.slice(0, 6).map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between gap-2" data-testid={`loan-overview-${loan.id}`}>
                    <div>
                      <p className="text-sm font-medium">{loan.staffName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{loan.type} &middot; {loan.termMonths} months</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(loan.outstanding)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(loan.installmentAmount)}/mo</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfilesTab({ profiles, departments, salaryCategories, onRefresh }: {
  profiles: SalaryProfile[];
  departments: string[];
  salaryCategories: string[];
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SalaryProfile | null>(null);
  const emptyForm = {
    staffName: "", staffId: "", department: "", category: "", role: "",
    baseSalary: "", housingAllowance: "0", transportAllowance: "0",
    mealAllowance: "0", otherAllowance: "0", phone: "", email: "",
    bankName: "", bankAccount: "", joinDate: "", status: "active",
    profileImage: "", paymentSlip: ""
  };
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/salary-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] });
      toast({ title: "Employee profile created" });
      setAddDialog(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/salary-profiles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] });
      toast({ title: "Profile updated" });
      setEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/salary-profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] });
      toast({ title: "Profile deleted" });
    },
  });

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.staffName.toLowerCase().includes(search.toLowerCase()) || p.role?.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || p.department === deptFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const handleSubmit = () => {
    if (!form.staffName || !form.baseSalary) {
      toast({ title: "Please fill staff name and base salary", variant: "destructive" });
      return;
    }
    const data = { ...form, baseSalary: form.baseSalary, housingAllowance: form.housingAllowance, transportAllowance: form.transportAllowance, mealAllowance: form.mealAllowance, otherAllowance: form.otherAllowance };
    if (editDialog && editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (p: SalaryProfile) => {
    setEditingProfile(p);
    setForm({
      staffName: p.staffName, staffId: p.staffId || "", department: p.department || "", category: p.category || "",
      role: p.role || "", baseSalary: p.baseSalary || "0", housingAllowance: p.housingAllowance || "0",
      transportAllowance: p.transportAllowance || "0", mealAllowance: p.mealAllowance || "0",
      otherAllowance: p.otherAllowance || "0", phone: p.phone || "", email: p.email || "",
      bankName: p.bankName || "", bankAccount: p.bankAccount || "", joinDate: p.joinDate || "",
      status: p.status, profileImage: p.profileImage || "", paymentSlip: p.paymentSlip || ""
    });
    setEditDialog(true);
  };

  const getTotalAllowance = (p: SalaryProfile) =>
    Number(p.housingAllowance || 0) + Number(p.transportAllowance || 0) + Number(p.mealAllowance || 0) + Number(p.otherAllowance || 0);

  const formAllowanceTotal = Number(form.housingAllowance || 0) + Number(form.transportAllowance || 0) + Number(form.mealAllowance || 0) + Number(form.otherAllowance || 0);
  const formGrossTotal = Number(form.baseSalary || 0) + formAllowanceTotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-profiles" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-dept-filter-profiles">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter-profiles">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setForm(emptyForm); setAddDialog(true); }} data-testid="button-add-profile">
          <Plus className="h-4 w-4 mr-2" /> Add Employee
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="hover-elevate" data-testid={`card-profile-${p.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  {p.profileImage ? (
                    <img src={p.profileImage} alt={p.staffName} className="w-10 h-10 rounded-full object-cover border" />
                  ) : (
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
                      <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-sm">{p.staffName}</h3>
                    <p className="text-xs text-muted-foreground">{p.role || "Staff"} {p.staffId ? `(${p.staffId})` : ""}</p>
                  </div>
                </div>
                <Badge variant={p.status === "active" ? "default" : "secondary"} className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${p.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}`}>
                  {p.status}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{p.department || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-medium">{formatCurrency(p.baseSalary)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Allowances</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(getTotalAllowance(p))}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t">
                  <span className="font-medium">Gross Pay</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Number(p.baseSalary || 0) + getTotalAllowance(p))}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 mt-3">
                <div className="flex items-center gap-1">
                  {p.paymentSlip && (
                    <a href={p.paymentSlip} target="_blank" rel="noopener noreferrer" data-testid={`link-payment-slip-${p.id}`}>
                      <Badge variant="outline" className="text-[10px] gap-1 no-default-hover-elevate no-default-active-elevate">
                        <FileImage className="h-3 w-3" />
                        Slip
                      </Badge>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-profile-${p.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-profile-${p.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No employee profiles found. Add your first employee to get started.
          </div>
        )}
      </div>

      <Dialog open={addDialog || editDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); setEditDialog(false); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog ? "Edit Employee Profile" : "Add Employee Profile"}</DialogTitle>
            <DialogDescription>Set up salary structure for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Staff Name *</label>
                <Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} data-testid="input-profile-staff-name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Staff ID</label>
                <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} placeholder="e.g. EMP-001" data-testid="input-profile-staff-id" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Doctor, Nurse..." data-testid="input-profile-role" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger data-testid="select-profile-department">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-profile-category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {salaryCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Base Salary *</label>
                <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} data-testid="input-profile-base-salary" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Join Date</label>
                <Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} data-testid="input-profile-join-date" />
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/50 space-y-3">
              <p className="text-sm font-medium">Allowances</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Housing</label>
                  <Input type="number" value={form.housingAllowance} onChange={(e) => setForm({ ...form, housingAllowance: e.target.value })} data-testid="input-housing-allowance" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Transport</label>
                  <Input type="number" value={form.transportAllowance} onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })} data-testid="input-transport-allowance" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Meal</label>
                  <Input type="number" value={form.mealAllowance} onChange={(e) => setForm({ ...form, mealAllowance: e.target.value })} data-testid="input-meal-allowance" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Other</label>
                  <Input type="number" value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: e.target.value })} data-testid="input-other-allowance" />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Gross Monthly Pay</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(formGrossTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base: {formatCurrency(form.baseSalary)} + Allowances: {formatCurrency(formAllowanceTotal)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-profile-phone" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-profile-email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Bank Name</label>
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} data-testid="input-profile-bank-name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account No</label>
                <Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} data-testid="input-profile-bank-account" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Profile Image</label>
                <div className="space-y-2">
                  {form.profileImage && (
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                      <img src={form.profileImage} alt="Profile" className="w-full h-full object-cover" />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-0 right-0 h-5 w-5 bg-background/80"
                        onClick={() => setForm({ ...form, profileImage: "" })}
                        data-testid="button-remove-profile-image"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {editDialog && editingProfile && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        data-testid="input-upload-profile-image"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !editingProfile) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          try {
                            const res = await fetch(`/api/salary-profiles/${editingProfile.id}/upload-image`, { method: "POST", body: fd });
                            const data = await res.json();
                            setForm(f => ({ ...f, profileImage: data.profileImage || "" }));
                            queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] });
                            toast({ title: "Profile image uploaded" });
                          } catch { toast({ title: "Upload failed", variant: "destructive" }); }
                        }}
                      />
                      <Button variant="outline" size="sm" type="button" asChild>
                        <span><Upload className="h-3 w-3 mr-1" />Upload Image</span>
                      </Button>
                    </label>
                  )}
                  {!editDialog && (
                    <p className="text-xs text-muted-foreground">Save profile first, then edit to upload image</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Slip</label>
                <div className="space-y-2">
                  {form.paymentSlip && (
                    <div className="flex items-center gap-2">
                      <a href={form.paymentSlip} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 underline flex items-center gap-1">
                        <FileImage className="h-4 w-4" />
                        View Slip
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => setForm({ ...form, paymentSlip: "" })}
                        data-testid="button-remove-payment-slip"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {editDialog && editingProfile && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        data-testid="input-upload-payment-slip"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !editingProfile) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          try {
                            const res = await fetch(`/api/salary-profiles/${editingProfile.id}/upload-payment-slip`, { method: "POST", body: fd });
                            const data = await res.json();
                            setForm(f => ({ ...f, paymentSlip: data.paymentSlip || "" }));
                            queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] });
                            toast({ title: "Payment slip uploaded" });
                          } catch { toast({ title: "Upload failed", variant: "destructive" }); }
                        }}
                      />
                      <Button variant="outline" size="sm" type="button" asChild>
                        <span><Upload className="h-3 w-3 mr-1" />Upload Slip</span>
                      </Button>
                    </label>
                  )}
                  {!editDialog && (
                    <p className="text-xs text-muted-foreground">Save profile first, then edit to upload slip</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="select-profile-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(false); setEditDialog(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-profile">
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoansTab({ loans, profiles }: { loans: SalaryLoan[]; profiles: SalaryProfile[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<SalaryLoan | null>(null);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);

  const emptyForm = {
    profileId: "", staffName: "", type: "loan", principal: "", interestRate: "0",
    termMonths: "1", installmentAmount: "", outstanding: "", startDate: "", notes: ""
  };
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/salary-loans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-loans"] });
      toast({ title: "Loan/advance created" });
      setAddDialog(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/salary-loans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-loans"] });
      toast({ title: "Loan deleted" });
    },
  });

  const { data: loanInstallments = [] } = useQuery<LoanInstallment[]>({
    queryKey: ["/api/loan-installments", selectedLoan?.id],
    queryFn: async () => {
      if (!selectedLoan) return [];
      const res = await fetch(`/api/loan-installments/${selectedLoan.id}`);
      return res.json();
    },
    enabled: !!selectedLoan,
  });

  const filtered = loans.filter(l => {
    const matchSearch = !search || l.staffName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || l.type === typeFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const calculateInstallment = () => {
    const principal = Number(form.principal) || 0;
    const rate = Number(form.interestRate) || 0;
    const months = Number(form.termMonths) || 1;
    const totalWithInterest = principal + (principal * rate / 100);
    return (totalWithInterest / months).toFixed(2);
  };

  const handleProfileSelect = (profileId: string) => {
    const profile = profiles.find(p => p.id === Number(profileId));
    if (profile) {
      setForm({ ...form, profileId, staffName: profile.staffName });
    }
  };

  const handleSubmit = () => {
    if (!form.staffName || !form.principal) {
      toast({ title: "Please fill staff name and amount", variant: "destructive" });
      return;
    }
    const installment = calculateInstallment();
    const data = {
      ...form,
      profileId: form.profileId ? Number(form.profileId) : null,
      termMonths: Number(form.termMonths),
      installmentAmount: installment,
      outstanding: String(Number(form.principal) + (Number(form.principal) * Number(form.interestRate || 0) / 100)),
      totalPaid: "0"
    };
    createMutation.mutate(data);
  };

  const viewDetails = (loan: SalaryLoan) => {
    setSelectedLoan(loan);
    setDetailDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by staff name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-loans" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-type-filter-loans">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="loan">Loan</SelectItem>
            <SelectItem value="advance">Advance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter-loans">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setForm(emptyForm); setAddDialog(true); }} data-testid="button-add-loan">
          <Plus className="h-4 w-4 mr-2" /> New Loan/Advance
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-blue-500"><HandCoins className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{loans.length}</p>
            <p className="text-xs text-muted-foreground">Total Loans/Advances</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-green-500"><CheckCircle2 className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{loans.filter(l => l.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-amber-500"><CircleDollarSign className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{formatCurrency(loans.reduce((s, l) => s + Number(l.principal || 0), 0))}</p>
            <p className="text-xs text-muted-foreground">Total Disbursed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-red-500"><AlertTriangle className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{formatCurrency(loans.filter(l => l.status === "active").reduce((s, l) => s + Number(l.outstanding || 0), 0))}</p>
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No loans or advances found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Staff Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Principal</th>
                    <th className="text-right p-3 font-medium">Interest</th>
                    <th className="text-center p-3 font-medium">Term</th>
                    <th className="text-right p-3 font-medium">Monthly</th>
                    <th className="text-right p-3 font-medium">Paid</th>
                    <th className="text-right p-3 font-medium">Outstanding</th>
                    <th className="text-left p-3 font-medium">Start Date</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(loan => (
                    <tr key={loan.id} className="border-b" data-testid={`row-loan-${loan.id}`}>
                      <td className="p-3 font-medium">{loan.staffName}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`capitalize text-[10px] no-default-hover-elevate no-default-active-elevate ${loan.type === "loan" ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"}`}>
                          {loan.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{formatCurrency(loan.principal)}</td>
                      <td className="p-3 text-right">{loan.interestRate}%</td>
                      <td className="p-3 text-center">{loan.termMonths} mo</td>
                      <td className="p-3 text-right">{formatCurrency(loan.installmentAmount)}</td>
                      <td className="p-3 text-right text-green-600 dark:text-green-400">{formatCurrency(loan.totalPaid)}</td>
                      <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(loan.outstanding)}</td>
                      <td className="p-3">{loan.startDate}</td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate text-[10px] ${loan.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"}`}>
                          {loan.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => viewDetails(loan)} data-testid={`button-view-loan-${loan.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(loan.id)} data-testid={`button-delete-loan-${loan.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Loan / Advance</DialogTitle>
            <DialogDescription>Create a loan or salary advance for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee</label>
              <Select value={form.profileId} onValueChange={handleProfileSelect}>
                <SelectTrigger data-testid="select-loan-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.filter(p => p.status === "active").map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.staffName} ({p.role || "Staff"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.profileId && (
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Or enter name manually</label>
                  <Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} placeholder="Staff name" data-testid="input-loan-staff-name" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-loan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} data-testid="input-loan-start-date" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Principal *</label>
                <Input type="number" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} data-testid="input-loan-principal" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Interest %</label>
                <Input type="number" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} data-testid="input-loan-interest" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Term (months)</label>
                <Input type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} min="1" data-testid="input-loan-term" />
              </div>
            </div>
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Monthly Installment</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(calculateInstallment())}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatCurrency(Number(form.principal || 0) + (Number(form.principal || 0) * Number(form.interestRate || 0) / 100))} over {form.termMonths || 1} months
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-loan-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-loan">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Loan Details - {selectedLoan?.staffName}</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium capitalize">{selectedLoan.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="ml-2">{selectedLoan.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedLoan.principal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Interest:</span>
                  <span className="ml-2 font-medium">{selectedLoan.interestRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Term:</span>
                  <span className="ml-2 font-medium">{selectedLoan.termMonths} months</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monthly:</span>
                  <span className="ml-2 font-medium">{formatCurrency(selectedLoan.installmentAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Paid:</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">{formatCurrency(selectedLoan.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="ml-2 font-medium text-red-600 dark:text-red-400">{formatCurrency(selectedLoan.outstanding)}</span>
                </div>
              </div>
              {selectedLoan.notes && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-muted-foreground">{selectedLoan.notes}</p>
                </div>
              )}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, (Number(selectedLoan.totalPaid || 0) / (Number(selectedLoan.principal || 1) + Number(selectedLoan.principal || 0) * Number(selectedLoan.interestRate || 0) / 100)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {Math.round((Number(selectedLoan.totalPaid || 0) / (Number(selectedLoan.principal || 1) + Number(selectedLoan.principal || 0) * Number(selectedLoan.interestRate || 0) / 100)) * 100)}% repaid
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayrollTab({ payrollRuns, profiles, loans }: { payrollRuns: PayrollRun[]; profiles: SalaryProfile[]; loans: SalaryLoan[] }) {
  const { toast } = useToast();
  const [runDialog, setRunDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [payslipsList, setPayslipsList] = useState<Payslip[]>([]);
  const [runForm, setRunForm] = useState({
    month: months[new Date().getMonth()],
    year: String(currentYear),
    notes: ""
  });

  const createRunMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/payroll-runs", data),
    onSuccess: async (res: any) => {
      const run = await res.json();
      await apiRequest("POST", `/api/payroll-runs/${run.id}/generate`);
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
      toast({ title: "Payroll run created and payslips generated" });
      setRunDialog(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteRunMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/payroll-runs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
      toast({ title: "Payroll run deleted" });
    },
  });

  const finalizeRunMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("PUT", `/api/payroll-runs/${id}`, { status: "finalized" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
      toast({ title: "Payroll run finalized" });
    },
  });

  const handleCreateRun = () => {
    if (!runForm.month || !runForm.year) {
      toast({ title: "Select month and year", variant: "destructive" });
      return;
    }
    createRunMutation.mutate({
      month: runForm.month,
      year: runForm.year,
      runDate: new Date().toISOString().split("T")[0],
      notes: runForm.notes,
      status: "draft"
    });
  };

  const viewPayslips = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      const res = await fetch(`/api/payslips/${run.id}`);
      const data = await res.json();
      setPayslipsList(data);
    } catch {
      setPayslipsList([]);
    }
    setPreviewDialog(true);
  };

  const exportPayrollCSV = (run: PayrollRun) => {
    if (payslipsList.length === 0) return;
    const headers = ["Staff Name", "Department", "Base Salary", "Allowances", "Loan Deductions", "Other Deductions", "Gross Pay", "Net Pay", "Status"];
    const rows = payslipsList.map(p => [
      p.staffName, p.department || "", p.baseSalary, p.allowances, p.loanDeductions, p.otherDeductions, p.grossPay, p.netPay, p.status
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${run.month}-${run.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Payroll Runs</h2>
          <p className="text-sm text-muted-foreground">Generate and manage monthly payroll</p>
        </div>
        <Button onClick={() => setRunDialog(true)} data-testid="button-new-payroll-run">
          <Play className="h-4 w-4 mr-2" /> New Payroll Run
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-blue-500"><FileText className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{payrollRuns.length}</p>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-amber-500"><Clock className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{payrollRuns.filter(r => r.status === "draft").length}</p>
            <p className="text-xs text-muted-foreground">Draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-green-500"><CheckCircle2 className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{payrollRuns.filter(r => r.status === "finalized").length}</p>
            <p className="text-xs text-muted-foreground">Finalized</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-emerald-500"><DollarSign className="h-4 w-4 text-white" /></div>
            </div>
            <p className="text-lg font-bold">{formatCurrency(payrollRuns.reduce((s, r) => s + Number(r.totalNet || 0), 0))}</p>
            <p className="text-xs text-muted-foreground">Total Net Paid</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {payrollRuns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No payroll runs yet. Create your first payroll run to generate payslips.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-left p-3 font-medium">Run Date</th>
                    <th className="text-center p-3 font-medium">Employees</th>
                    <th className="text-right p-3 font-medium">Total Gross</th>
                    <th className="text-right p-3 font-medium">Total Deductions</th>
                    <th className="text-right p-3 font-medium">Total Net</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map(run => (
                    <tr key={run.id} className="border-b" data-testid={`row-payroll-${run.id}`}>
                      <td className="p-3 font-medium">{run.month} {run.year}</td>
                      <td className="p-3">{run.runDate}</td>
                      <td className="p-3 text-center">{run.employeeCount || 0}</td>
                      <td className="p-3 text-right">{formatCurrency(run.totalGross)}</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">{formatCurrency(run.totalDeductions)}</td>
                      <td className="p-3 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(run.totalNet)}</td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate text-[10px] ${
                          run.status === "finalized" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                          "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        }`}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => viewPayslips(run)} data-testid={`button-view-payroll-${run.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {run.status === "draft" && (
                            <Button size="icon" variant="ghost" onClick={() => finalizeRunMutation.mutate(run.id)} data-testid={`button-finalize-payroll-${run.id}`}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => deleteRunMutation.mutate(run.id)} data-testid={`button-delete-payroll-${run.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={runDialog} onOpenChange={setRunDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
            <DialogDescription>Generate payslips for all active employees for the selected period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Month</label>
                <Select value={runForm.month} onValueChange={(v) => setRunForm({ ...runForm, month: v })}>
                  <SelectTrigger data-testid="select-payroll-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <Select value={runForm.year} onValueChange={(v) => setRunForm({ ...runForm, year: v })}>
                  <SelectTrigger data-testid="select-payroll-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea value={runForm.notes} onChange={(e) => setRunForm({ ...runForm, notes: e.target.value })} placeholder="Optional notes..." data-testid="input-payroll-notes" />
            </div>
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">This will generate payslips for {profiles.filter(p => p.status === "active").length} active employee(s)</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Loan deductions will be calculated automatically from active loans</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRun} disabled={createRunMutation.isPending} data-testid="button-generate-payroll">
              {createRunMutation.isPending ? "Generating..." : "Generate Payroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslips - {selectedRun?.month} {selectedRun?.year}</DialogTitle>
            <DialogDescription>
              {payslipsList.length} payslip(s) generated &middot; Status: {selectedRun?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={() => selectedRun && exportPayrollCSV(selectedRun)} data-testid="button-export-payroll-csv">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
          {payslipsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payslips generated for this run.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Staff Name</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-right p-3 font-medium">Base Salary</th>
                    <th className="text-right p-3 font-medium">Allowances</th>
                    <th className="text-right p-3 font-medium">Gross</th>
                    <th className="text-right p-3 font-medium">Loan Ded.</th>
                    <th className="text-right p-3 font-medium">Other Ded.</th>
                    <th className="text-right p-3 font-medium">Net Pay</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslipsList.map(slip => (
                    <tr key={slip.id} className="border-b" data-testid={`row-payslip-${slip.id}`}>
                      <td className="p-3 font-medium">{slip.staffName}</td>
                      <td className="p-3">{slip.department || "-"}</td>
                      <td className="p-3 text-right">{formatCurrency(slip.baseSalary)}</td>
                      <td className="p-3 text-right text-green-600 dark:text-green-400">+{formatCurrency(slip.allowances)}</td>
                      <td className="p-3 text-right">{formatCurrency(slip.grossPay)}</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">-{formatCurrency(slip.loanDeductions)}</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">-{formatCurrency(slip.otherDeductions)}</td>
                      <td className="p-3 text-right font-bold">{formatCurrency(slip.netPay)}</td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate text-[10px] ${
                          slip.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                          "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                        }`}>
                          {slip.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30">
                    <td className="p-3 font-bold" colSpan={2}>Totals</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.baseSalary || 0), 0))}</td>
                    <td className="p-3 text-right font-bold text-green-600 dark:text-green-400">+{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.allowances || 0), 0))}</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.grossPay || 0), 0))}</td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">-{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.loanDeductions || 0), 0))}</td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">-{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.otherDeductions || 0), 0))}</td>
                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(payslipsList.reduce((s, p) => s + Number(p.netPay || 0), 0))}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LedgerTab({ salaries, payrollRuns }: { salaries: Salary[]; payrollRuns: PayrollRun[] }) {
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: salaryList = [] } = useQuery<Salary[]>({ queryKey: ["/api/salaries"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/salaries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Salary record created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/salaries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/salaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Record deleted" });
    },
  });

  const filtered = salaryList.filter(s => {
    const matchSearch = !search || s.staffName.toLowerCase().includes(search.toLowerCase());
    const matchMonth = monthFilter === "all" || s.month === monthFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchMonth && matchStatus;
  });

  const totalPaid = filtered.filter(s => s.status === "paid").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  const totalPending = filtered.filter(s => s.status === "pending").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);

  const exportCSV = () => {
    const headers = ["Staff Name", "Role", "Department", "Base Salary", "Allowances", "Deductions", "Net Salary", "Month", "Year", "Status", "Payment Date"];
    const rows = filtered.map(s => [
      s.staffName, s.role || "", s.department || "", s.baseSalary, s.allowances || "0", s.deductions || "0", s.netSalary, s.month, s.year, s.status, s.paymentDate || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by staff name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-ledger" />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-month-filter-ledger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter-ledger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} data-testid="button-export-ledger">
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-lg font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid Records</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{filtered.filter(s => s.status === "paid").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pending</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No salary records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Staff Name</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-right p-3 font-medium">Base</th>
                    <th className="text-right p-3 font-medium">Allowances</th>
                    <th className="text-right p-3 font-medium">Deductions</th>
                    <th className="text-right p-3 font-medium">Net</th>
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sal => (
                    <tr key={sal.id} className="border-b" data-testid={`row-ledger-${sal.id}`}>
                      <td className="p-3 font-medium">{sal.staffName}</td>
                      <td className="p-3">{sal.role || "-"}</td>
                      <td className="p-3">{sal.department || "-"}</td>
                      <td className="p-3 text-right">{formatCurrency(sal.baseSalary)}</td>
                      <td className="p-3 text-right text-green-600 dark:text-green-400">+{formatCurrency(sal.allowances)}</td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">-{formatCurrency(sal.deductions)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(sal.netSalary)}</td>
                      <td className="p-3">{sal.month} {sal.year}</td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate text-[10px] ${
                          sal.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                          sal.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" :
                          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}>
                          {sal.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sal.status === "pending" && (
                            <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: sal.id, data: { status: "paid", paymentDate: new Date().toISOString().split("T")[0] } })} data-testid={`button-mark-paid-${sal.id}`}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(sal.id)} data-testid={`button-delete-ledger-${sal.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default function SalaryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [departments, setDepartments] = useState<string[]>(loadDepartments);
  const [salaryCategories, setSalaryCategories] = useState<string[]>(loadSalaryCategories);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newSalaryCategory, setNewSalaryCategory] = useState("");

  useEffect(() => {
    localStorage.setItem("salary_departments", JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem("salary_categories", JSON.stringify(salaryCategories));
  }, [salaryCategories]);

  const addDepartment = () => {
    const trimmed = newDepartment.trim();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Department already exists", variant: "destructive" });
      return;
    }
    setDepartments([...departments, trimmed]);
    setNewDepartment("");
    toast({ title: `Department "${trimmed}" added` });
  };

  const removeDepartment = (dept: string) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const addSalaryCategory = () => {
    const trimmed = newSalaryCategory.trim();
    if (!trimmed) return;
    if (salaryCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Category already exists", variant: "destructive" });
      return;
    }
    setSalaryCategories([...salaryCategories, trimmed]);
    setNewSalaryCategory("");
    toast({ title: `Category "${trimmed}" added` });
  };

  const removeSalaryCategory = (cat: string) => {
    setSalaryCategories(salaryCategories.filter(c => c !== cat));
  };

  const { data: salaries = [] } = useQuery<Salary[]>({ queryKey: ["/api/salaries"] });
  const { data: profiles = [] } = useQuery<SalaryProfile[]>({ queryKey: ["/api/salary-profiles"] });
  const { data: loans = [] } = useQuery<SalaryLoan[]>({ queryKey: ["/api/salary-loans"] });
  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({ queryKey: ["/api/payroll-runs"] });

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Salary Management</h1>
          <p className="text-sm text-muted-foreground">Payroll, loans, advances, and employee compensation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <Button variant="outline" onClick={() => setCatDialogOpen(true)} data-testid="button-manage-categories">
              <Tag className="h-4 w-4 mr-1" /> + Category
            </Button>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
                <DialogDescription>Add or remove salary categories</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New category name..."
                    value={newSalaryCategory}
                    onChange={(e) => setNewSalaryCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSalaryCategory())}
                    data-testid="input-new-category"
                  />
                  <Button onClick={addSalaryCategory} disabled={!newSalaryCategory.trim()} data-testid="button-add-category">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {salaryCategories.map(cat => (
                    <Badge key={cat} variant="secondary" className="gap-1 pr-1" data-testid={`badge-category-${cat}`}>
                      {cat}
                      <button type="button" onClick={() => removeSalaryCategory(cat)} className="ml-0.5 rounded-full p-0.5 hover-elevate" data-testid={`button-remove-category-${cat}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
            <Button variant="outline" onClick={() => setDeptDialogOpen(true)} data-testid="button-manage-departments">
              <Building2 className="h-4 w-4 mr-1" /> + Department
            </Button>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Manage Departments</DialogTitle>
                <DialogDescription>Add or remove salary departments</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New department name..."
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDepartment())}
                    data-testid="input-new-department"
                  />
                  <Button onClick={addDepartment} disabled={!newDepartment.trim()} data-testid="button-add-department">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {departments.map(dept => (
                    <Badge key={dept} variant="secondary" className="gap-1 pr-1" data-testid={`badge-department-${dept}`}>
                      {dept}
                      <button type="button" onClick={() => removeDepartment(dept)} className="ml-0.5 rounded-full p-0.5 hover-elevate" data-testid={`button-remove-department-${dept}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start flex-wrap" data-testid="tabs-salary">
          <TabsTrigger value="dashboard" className="gap-1.5" data-testid="tab-dashboard">
            <TrendingUp className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-1.5" data-testid="tab-profiles">
            <Users className="h-4 w-4" /> Employee Profiles
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5" data-testid="tab-loans">
            <HandCoins className="h-4 w-4" /> Loans & Advances
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5" data-testid="tab-payroll">
            <Banknote className="h-4 w-4" /> Payroll
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5" data-testid="tab-ledger">
            <Receipt className="h-4 w-4" /> Salary Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab profiles={profiles} loans={loans} payrollRuns={payrollRuns} salaries={salaries} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          <ProfilesTab profiles={profiles} departments={departments} salaryCategories={salaryCategories} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/salary-profiles"] })} />
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <LoansTab loans={loans} profiles={profiles} />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PayrollTab payrollRuns={payrollRuns} profiles={profiles} loans={loans} />
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <LedgerTab salaries={salaries} payrollRuns={payrollRuns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
