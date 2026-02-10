import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreVertical, Trash2, Edit, DollarSign, Calendar, Filter, Download, X, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Salary } from "@shared/schema";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const DEFAULT_DEPARTMENTS = [
  "General Medicine", "Radiology", "Cardiology", "Orthopedics",
  "Pediatrics", "Pharmacy", "Laboratory", "Administration", "Nursing", "Other"
];

function loadDepartments(): string[] {
  try {
    const stored = localStorage.getItem("salary_departments");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_DEPARTMENTS;
}

export default function SalaryPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>(loadDepartments);
  const [newDepartment, setNewDepartment] = useState("");
  const [form, setForm] = useState({
    staffName: "", role: "", department: "", baseSalary: "", allowances: "0",
    deductions: "0", netSalary: "", paymentMethod: "cash",
    paymentDate: "", month: months[new Date().getMonth()], year: String(currentYear),
    status: "pending", notes: "",
  });

  useEffect(() => {
    localStorage.setItem("salary_departments", JSON.stringify(departments));
  }, [departments]);

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
    toast({ title: `Department "${dept}" removed` });
  };

  const { data: salaries = [], isLoading } = useQuery<Salary[]>({ queryKey: ["/api/salaries"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/salaries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Salary record created" });
      setAddDialog(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/salaries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Salary updated" });
      setEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/salaries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Salary record deleted" });
    },
  });

  const resetForm = () => {
    setForm({ staffName: "", role: "", department: "", baseSalary: "", allowances: "0", deductions: "0", netSalary: "", paymentMethod: "cash", paymentDate: "", month: months[new Date().getMonth()], year: String(currentYear), status: "pending", notes: "" });
  };

  const calculateNet = () => {
    const base = Number(form.baseSalary) || 0;
    const allow = Number(form.allowances) || 0;
    const deduct = Number(form.deductions) || 0;
    return String((base + allow - deduct).toFixed(2));
  };

  const filtered = salaries.filter((s) => {
    const matchSearch = !search || s.staffName.toLowerCase().includes(search.toLowerCase()) ||
      s.role?.toLowerCase().includes(search.toLowerCase()) || s.department?.toLowerCase().includes(search.toLowerCase());
    const matchMonth = monthFilter === "all" || s.month === monthFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchMonth && matchStatus;
  });

  const totalPaid = salaries.filter(s => s.status === "paid").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  const totalPending = salaries.filter(s => s.status === "pending").reduce((sum, s) => sum + Number(s.netSalary || 0), 0);

  const stats = {
    total: salaries.length,
    paid: salaries.filter(s => s.status === "paid").length,
    pending: salaries.filter(s => s.status === "pending").length,
    totalPaid: totalPaid.toFixed(2),
    totalPending: totalPending.toFixed(2),
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Salary Management</h1>
          <p className="text-sm text-muted-foreground">Track and manage staff salaries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept)}
                        className="ml-0.5 rounded-full p-0.5 hover-elevate"
                        data-testid={`button-remove-department-${dept}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-salary">
            <Plus className="h-4 w-4 mr-2" /> Add Salary Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Records</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-green-600">${stats.totalPaid}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Pending</p><p className="text-2xl font-bold text-orange-600">${stats.totalPending}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, role, department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-salaries" />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-month-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading salary records...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No salary records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Staff Name</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-right p-3 font-medium">Base Salary</th>
                    <th className="text-right p-3 font-medium">Allowances</th>
                    <th className="text-right p-3 font-medium">Deductions</th>
                    <th className="text-right p-3 font-medium">Net Salary</th>
                    <th className="text-left p-3 font-medium">Month/Year</th>
                    <th className="text-left p-3 font-medium">Payment</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sal) => (
                    <tr key={sal.id} className="border-b" data-testid={`row-salary-${sal.id}`}>
                      <td className="p-3 font-medium">{sal.staffName}</td>
                      <td className="p-3">{sal.role || "-"}</td>
                      <td className="p-3">{sal.department || "-"}</td>
                      <td className="p-3 text-right">${sal.baseSalary}</td>
                      <td className="p-3 text-right text-green-600">+${sal.allowances || "0"}</td>
                      <td className="p-3 text-right text-red-600">-${sal.deductions || "0"}</td>
                      <td className="p-3 text-right font-semibold">${sal.netSalary}</td>
                      <td className="p-3">{sal.month} {sal.year}</td>
                      <td className="p-3">{sal.paymentMethod?.replace("_", " ") || "-"}</td>
                      <td className="p-3">
                        <Badge className={`no-default-hover-elevate no-default-active-elevate ${sal.status === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : sal.status === "pending" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                          {sal.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-actions-${sal.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingSalary(sal);
                              setForm({
                                staffName: sal.staffName, role: sal.role || "", department: sal.department || "",
                                baseSalary: sal.baseSalary, allowances: sal.allowances || "0",
                                deductions: sal.deductions || "0", netSalary: sal.netSalary,
                                paymentMethod: sal.paymentMethod || "cash",
                                paymentDate: sal.paymentDate, month: sal.month, year: sal.year,
                                status: sal.status, notes: sal.notes || "",
                              });
                              setEditDialog(true);
                            }} data-testid={`button-edit-${sal.id}`}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {sal.status === "pending" && (
                              <DropdownMenuItem onClick={() => updateMutation.mutate({ id: sal.id, data: { status: "paid", paymentDate: new Date().toISOString().split("T")[0] } })} data-testid={`button-mark-paid-${sal.id}`}>
                                <DollarSign className="h-4 w-4 mr-2" /> Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(sal.id)} data-testid={`button-delete-${sal.id}`}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(addDialog || editDialog) && (
        <Dialog open={addDialog || editDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); setEditDialog(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editDialog ? "Edit Salary Record" : "Add Salary Record"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Staff Name *</label>
                  <Input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} data-testid="input-staff-name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Role</label>
                  <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Doctor, Nurse, etc." data-testid="input-role" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept} data-testid={`option-department-${dept}`}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Base Salary *</label>
                  <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} data-testid="input-base-salary" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Allowances</label>
                  <Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} data-testid="input-allowances" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Deductions</label>
                  <Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} data-testid="input-deductions" />
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted">
                <span className="text-sm font-medium">Net Salary: </span>
                <span className="text-lg font-bold">${calculateNet()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Month *</label>
                  <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                    <SelectTrigger data-testid="select-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Year *</label>
                  <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                    <SelectTrigger data-testid="select-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash Pay</SelectItem>
                      <SelectItem value="aba">ABA</SelectItem>
                      <SelectItem value="acleda">Acleda</SelectItem>
                      <SelectItem value="other_bank">Other Bank</SelectItem>
                      <SelectItem value="card">Card Pay</SelectItem>
                      <SelectItem value="wechat">WeChat Pay</SelectItem>
                      <SelectItem value="gpay">GPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Date</label>
                  <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} data-testid="input-payment-date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-salary-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddDialog(false); setEditDialog(false); }} data-testid="button-cancel-salary">Cancel</Button>
              <Button
                disabled={!form.staffName || !form.baseSalary || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  const data = { ...form, netSalary: calculateNet() };
                  if (editDialog && editingSalary) {
                    updateMutation.mutate({ id: editingSalary.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                data-testid="button-save-salary"
              >
                {editDialog ? "Save Changes" : "Add Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
