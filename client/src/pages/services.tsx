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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, ImagePlus, X, FolderPlus } from "lucide-react";
import type { Service } from "@shared/schema";

const DEFAULT_SERVICE_CATEGORIES = [
  "General", "Emergency", "Preventive", "Cardiology", "Therapy",
  "Consultation", "Laboratory", "Radiology", "Ultrasound",
  "ECG", "Physiotherapy", "Dental", "Ophthalmology",
  "Surgery", "Other"
];

function getServiceCategories(): string[] {
  const stored = localStorage.getItem("service_categories");
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_SERVICE_CATEGORIES; }
  }
  return DEFAULT_SERVICE_CATEGORIES;
}

function saveServiceCategories(cats: string[]) {
  localStorage.setItem("service_categories", JSON.stringify(cats));
}

const defaultForm = {
  name: "", category: "", price: "", description: "", imageUrl: "",
};

export default function ServicesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [viewService, setViewService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(getServiceCategories());
  const [newCategory, setNewCategory] = useState("");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      setForm(defaultForm);
      toast({ title: "Service created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditService(null);
      setForm(defaultForm);
      toast({ title: "Service updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted" });
    },
  });

  const handleSubmit = () => {
    if (!form.name || !form.category || !form.price) {
      return toast({ title: "Please fill in all required fields", variant: "destructive" });
    }
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      isActive: true,
    };
    if (editService) {
      updateMutation.mutate({ id: editService.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      description: svc.description || "",
      imageUrl: svc.imageUrl || "",
    });
    setEditService(svc);
  };

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: "Service Name", accessor: (row: Service) => (
      <div className="flex items-center gap-2">
        {row.imageUrl && (
          <img src={row.imageUrl} alt={row.name} className="w-8 h-8 rounded-md object-cover border" />
        )}
        <span className="font-medium">{row.name}</span>
      </div>
    )},
    { header: "Category", accessor: (row: Service) => <Badge variant="outline">{row.category}</Badge> },
    { header: "Description", accessor: (row: Service) => (
      <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{row.description || "-"}</span>
    )},
    { header: "Price", accessor: (row: Service) => <span className="font-medium">${row.price}</span> },
    { header: "Status", accessor: (row: Service) => (
      <Badge variant={row.isActive ? "default" : "secondary"}>
        {row.isActive ? "active" : "inactive"}
      </Badge>
    )},
    { header: "Actions", accessor: (row: Service) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid={`button-actions-${row.id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewService(row); }} className="gap-2" data-testid={`action-view-${row.id}`}>
            <Eye className="h-4 w-4 text-blue-500" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="gap-2" data-testid={`action-edit-${row.id}`}>
            <Pencil className="h-4 w-4 text-amber-500" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this service?")) deleteMutation.mutate(row.id); }}
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
          <Label htmlFor="svc-name">Service Name *</Label>
          <Input id="svc-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-service-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-service-category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="svc-price">Price ($) *</Label>
            <Input id="svc-price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} data-testid="input-service-price" />
          </div>
        </div>
        <div>
          <Label htmlFor="svc-description">Description</Label>
          <Textarea id="svc-description" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-service-description" />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
          <ImagePlus className="h-4 w-4" />
          Service Image <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
        </div>
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            <div className="relative group">
              <img
                src={form.imageUrl}
                alt="Service"
                className="w-20 h-20 object-cover rounded-md border"
                data-testid="img-service-preview"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ visibility: form.imageUrl ? "visible" : "hidden" }}
                onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                data-testid="button-remove-image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 cursor-pointer hover-elevate"
              data-testid="label-upload-image"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-service-image"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: "Image too large", description: "Maximum size is 2MB", variant: "destructive" });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setForm(f => ({ ...f, imageUrl: ev.target?.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Upload a photo of the service</p>
            <p>Max size: 2MB (JPG, PNG)</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Service Management"
        description="Manage consultation fees, test costs, and other services"
        actions={
          <>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-category-manage">
                  <FolderPlus className="h-4 w-4 mr-1" /> Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Manage Service Categories</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New category name"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newCategory.trim()) {
                          if (categories.includes(newCategory.trim())) {
                            toast({ title: "Category already exists", variant: "destructive" });
                            return;
                          }
                          const updated = [...categories, newCategory.trim()].sort();
                          setCategories(updated);
                          saveServiceCategories(updated);
                          setNewCategory("");
                          toast({ title: "Category added" });
                        }
                      }}
                      data-testid="input-new-category"
                    />
                    <Button
                      onClick={() => {
                        if (!newCategory.trim()) return;
                        if (categories.includes(newCategory.trim())) {
                          toast({ title: "Category already exists", variant: "destructive" });
                          return;
                        }
                        const updated = [...categories, newCategory.trim()].sort();
                        setCategories(updated);
                        saveServiceCategories(updated);
                        setNewCategory("");
                        toast({ title: "Category added" });
                      }}
                      data-testid="button-add-category"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                        <span className="text-sm">{cat}</span>
                        {!DEFAULT_SERVICE_CATEGORIES.includes(cat) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              const updated = categories.filter(c => c !== cat);
                              setCategories(updated);
                              saveServiceCategories(updated);
                              toast({ title: "Category removed" });
                            }}
                            data-testid={`button-remove-category-${cat}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(defaultForm); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-service">
                  <Plus className="h-4 w-4 mr-1" /> New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                {formContent}
                <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-service">
                  {createMutation.isPending ? "Creating..." : "Add Service"}
                </Button>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {viewService && (
        <Dialog open={!!viewService} onOpenChange={(open) => { if (!open) setViewService(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                Service Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {viewService.imageUrl && (
                <div className="w-full h-40 rounded-md overflow-hidden">
                  <img src={viewService.imageUrl} alt={viewService.name} className="w-full h-full object-cover" data-testid="img-service-detail" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Service Name</p>
                  <p className="font-semibold">{viewService.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="outline">{viewService.category}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-bold text-green-600 dark:text-green-400">${viewService.price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={viewService.isActive ? "default" : "secondary"}>
                    {viewService.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{viewService.description || "-"}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editService && (
        <Dialog open={!!editService} onOpenChange={(open) => { if (!open) { setEditService(null); setForm(defaultForm); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
            </DialogHeader>
            {formContent}
            <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-service">
              {updateMutation.isPending ? "Updating..." : "Update Service"}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2">
            <CardTitle className="text-sm font-semibold">All Services</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-services"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No services yet" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
