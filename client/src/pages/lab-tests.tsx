import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, QrCode, FlaskConical, TestTubes, DollarSign, CheckCircle } from "lucide-react";
import type { LabTest } from "@shared/schema";

const LAB_CATEGORIES = [
  "Hematology", "Biochemistry", "Microbiology", "Immunology",
  "Pathology", "Radiology", "Cardiology", "Endocrinology",
  "Urology", "Gastroenterology", "Neurology", "Other"
];

const SAMPLE_TYPES = [
  "Blood", "Urine", "Stool", "Sputum", "Swab",
  "Tissue", "CSF", "Saliva", "Serum", "Plasma", "Other"
];

const defaultForm = {
  testName: "", category: "", sampleType: "", price: "",
  description: "", turnaroundTime: "", isActive: true,
};

export default function LabTestsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTest, setEditTest] = useState<LabTest | null>(null);
  const [viewTest, setViewTest] = useState<LabTest | null>(null);
  const [barcodeTest, setBarcodeTest] = useState<LabTest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState(defaultForm);

  const { data: labTests = [], isLoading } = useQuery<LabTest[]>({
    queryKey: ["/api/lab-tests"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/lab-tests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: "Lab test created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/lab-tests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      setEditTest(null);
      setForm(defaultForm);
      toast({ title: "Lab test updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lab-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-tests"] });
      toast({ title: "Lab test deleted" });
    },
  });

  const handleSubmit = () => {
    if (!form.testName || !form.category || !form.sampleType || !form.price) {
      return toast({ title: "Please fill in all required fields", variant: "destructive" });
    }
    const payload = {
      testName: form.testName,
      category: form.category,
      sampleType: form.sampleType,
      price: form.price,
      description: form.description || null,
      turnaroundTime: form.turnaroundTime || null,
      isActive: form.isActive,
    };
    if (editTest) {
      updateMutation.mutate({ id: editTest.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (test: LabTest) => {
    setForm({
      testName: test.testName,
      category: test.category,
      sampleType: test.sampleType,
      price: test.price,
      description: test.description || "",
      turnaroundTime: test.turnaroundTime || "",
      isActive: test.isActive,
    });
    setEditTest(test);
  };

  const filtered = labTests.filter(t => {
    const matchSearch = searchTerm === "" ||
      t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sampleType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const activeCount = labTests.filter(t => t.isActive).length;
  const uniqueCategories = Array.from(new Set(labTests.map(t => t.category)));

  const columns = [
    { header: "Test Name", accessor: (row: LabTest) => (
      <span className="font-medium" data-testid={`text-test-name-${row.id}`}>{row.testName}</span>
    )},
    { header: "Category", accessor: (row: LabTest) => (
      <Badge variant="outline" data-testid={`badge-category-${row.id}`}>{row.category}</Badge>
    )},
    { header: "Sample Type", accessor: (row: LabTest) => (
      <Badge variant="secondary" data-testid={`badge-sample-${row.id}`}>{row.sampleType}</Badge>
    )},
    { header: "Price", accessor: (row: LabTest) => (
      <span className="font-medium" data-testid={`text-price-${row.id}`}>${row.price}</span>
    )},
    { header: "Status", accessor: (row: LabTest) => (
      <Badge variant={row.isActive ? "default" : "secondary"} data-testid={`badge-status-${row.id}`}>
        {row.isActive ? "active" : "inactive"}
      </Badge>
    )},
    { header: "Actions", accessor: (row: LabTest) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewTest(row); }} className="gap-2" data-testid={`action-view-${row.id}`}>
            <Eye className="h-4 w-4 text-blue-500" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2" data-testid={`action-edit-${row.id}`}>
            <Pencil className="h-4 w-4 text-amber-500" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setBarcodeTest(row); }} className="gap-2" data-testid={`action-barcode-${row.id}`}>
            <QrCode className="h-4 w-4 text-purple-500" /> Barcode
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lab test?")) deleteMutation.mutate(row.id); }}
            className="text-red-600 gap-2"
            data-testid={`action-delete-${row.id}`}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <Label htmlFor="test-name">Test Name *</Label>
          <Input id="test-name" value={form.testName} onChange={e => setForm(f => ({ ...f, testName: e.target.value }))} data-testid="input-test-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-test-category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {LAB_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sample Type *</Label>
            <Select value={form.sampleType} onValueChange={v => setForm(f => ({ ...f, sampleType: v }))}>
              <SelectTrigger data-testid="select-sample-type"><SelectValue placeholder="Select sample" /></SelectTrigger>
              <SelectContent>
                {SAMPLE_TYPES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="test-price">Price ($) *</Label>
            <Input id="test-price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} data-testid="input-test-price" />
          </div>
          <div>
            <Label htmlFor="test-tat">Turnaround Time</Label>
            <Input id="test-tat" placeholder="e.g. 2 hours, 1 day" value={form.turnaroundTime} onChange={e => setForm(f => ({ ...f, turnaroundTime: e.target.value }))} data-testid="input-test-tat" />
          </div>
        </div>
        <div>
          <Label htmlFor="test-desc">Description</Label>
          <Textarea id="test-desc" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-test-description" />
        </div>
        {editTest && (
          <div>
            <Label>Status</Label>
            <Select value={form.isActive ? "active" : "inactive"} onValueChange={v => setForm(f => ({ ...f, isActive: v === "active" }))}>
              <SelectTrigger data-testid="select-test-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Lab Test Management"
        description="Manage laboratory tests, pricing, and categories"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(defaultForm); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lab-test">
                <Plus className="h-4 w-4 mr-1" /> Add Lab Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Lab Test</DialogTitle>
              </DialogHeader>
              {formContent}
              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-lab-test">
                {createMutation.isPending ? "Creating..." : "Add Lab Test"}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {viewTest && (
        <Dialog open={!!viewTest} onOpenChange={(open) => { if (!open) setViewTest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Lab Test Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Test Name</p>
                  <p className="font-semibold" data-testid="text-view-test-name">{viewTest.testName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="outline">{viewTest.category}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sample Type</p>
                  <Badge variant="secondary">{viewTest.sampleType}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-bold text-green-600 dark:text-green-400">${viewTest.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Turnaround Time</p>
                  <p className="text-sm">{viewTest.turnaroundTime || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={viewTest.isActive ? "default" : "secondary"}>
                    {viewTest.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{viewTest.description || "-"}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editTest && (
        <Dialog open={!!editTest} onOpenChange={(open) => { if (!open) { setEditTest(null); setForm(defaultForm); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Lab Test</DialogTitle>
            </DialogHeader>
            {formContent}
            <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-lab-test">
              {updateMutation.isPending ? "Updating..." : "Update Lab Test"}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {barcodeTest && (
        <Dialog open={!!barcodeTest} onOpenChange={(open) => { if (!open) setBarcodeTest(null); }}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-500" />
                Barcode
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-4 bg-white rounded-md border">
                <svg viewBox="0 0 200 200" width="180" height="180" data-testid="img-barcode-qr">
                  {(() => {
                    const data = `LAB-TEST|${barcodeTest.id}|${barcodeTest.testName}|${barcodeTest.category}|$${barcodeTest.price}`;
                    const cells: JSX.Element[] = [];
                    let seed = 0;
                    for (let i = 0; i < data.length; i++) seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;
                    for (let y = 0; y < 20; y++) {
                      for (let x = 0; x < 20; x++) {
                        seed = (seed * 16807 + 0) % 2147483647;
                        const isBorder = x === 0 || x === 19 || y === 0 || y === 19;
                        const isCorner = (x < 4 && y < 4) || (x > 15 && y < 4) || (x < 4 && y > 15);
                        if (isCorner || isBorder || seed % 3 === 0) {
                          cells.push(<rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" fill="black" />);
                        }
                      }
                    }
                    return cells;
                  })()}
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-sm">{barcodeTest.testName}</p>
                <p className="text-xs text-muted-foreground">{barcodeTest.category} | {barcodeTest.sampleType}</p>
                <p className="text-xs font-mono text-muted-foreground">ID: LAB-{String(barcodeTest.id).padStart(4, "0")}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tests</p>
                <p className="text-xl font-bold" data-testid="text-total-tests">{labTests.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Tests</p>
                <p className="text-xl font-bold" data-testid="text-active-tests">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <TestTubes className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-xl font-bold" data-testid="text-categories-count">{uniqueCategories.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Price</p>
                <p className="text-xl font-bold" data-testid="text-avg-price">
                  ${labTests.length > 0 ? (labTests.reduce((a, t) => a + Number(t.price), 0) / labTests.length).toFixed(2) : "0.00"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Lab Tests</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-filter-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  className="pl-8 h-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-lab-tests"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No lab tests yet. Click 'Add Lab Test' to create one." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
