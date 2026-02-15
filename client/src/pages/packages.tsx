import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Package as PackageType, PackageItem } from "@shared/schema";
import type { Service, Injection, Medicine } from "@shared/schema";

export default function PackagesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<PackageType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<PackageItem[]>([]);
  const [newItemType, setNewItemType] = useState<PackageItem["type"]>("service");
  const [newItemRefId, setNewItemRefId] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState("");

  const { data: packagesList = [] } = useQuery<PackageType[]>({ queryKey: ["/api/packages"] });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const { data: injections = [] } = useQuery<Injection[]>({ queryKey: ["/api/injections"] });
  const { data: medicines = [] } = useQuery<Medicine[]>({ queryKey: ["/api/medicines"] });

  const openCreate = () => {
    setEditPkg(null);
    setName("");
    setDescription("");
    setItems([]);
    setNewItemType("service");
    setNewItemRefId("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrice("");
    setDialogOpen(true);
  };

  const openEdit = (pkg: PackageType) => {
    setEditPkg(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setItems(pkg.items?.length ? [...pkg.items] : []);
    setDialogOpen(true);
  };

  const addItemRow = () => {
    let nameVal = newItemName.trim();
    let unitPrice = Number(newItemPrice) || 0;
    let refId: number | undefined;
    if (newItemType === "service" && newItemRefId) {
      const s = services.find(sv => sv.id === Number(newItemRefId));
      if (s) {
        nameVal = s.name;
        unitPrice = Number(s.price);
        refId = s.id;
      }
    } else if (newItemType === "injection" && newItemRefId) {
      const inj = injections.find(i => i.id === Number(newItemRefId));
      if (inj) {
        nameVal = inj.name;
        unitPrice = Number(inj.price);
        refId = inj.id;
      }
    } else if (newItemType === "medicine" && newItemRefId) {
      const med = medicines.find(m => m.id === Number(newItemRefId));
      if (med) {
        nameVal = med.name;
        const sp = Number(med.sellingPriceLocal) || Number(med.sellingPrice) || 0;
        unitPrice = sp;
        refId = med.id;
      }
    }
    if (!nameVal && newItemType !== "custom") {
      toast({ title: "Select an item or use Custom with name and price", variant: "destructive" });
      return;
    }
    if (newItemType === "custom" && !nameVal) {
      toast({ title: "Enter custom item name and price", variant: "destructive" });
      return;
    }
    setItems(prev => [...prev, {
      type: newItemType,
      refId,
      name: nameVal || "Custom",
      quantity: Math.max(1, newItemQty),
      unitPrice: unitPrice || Number(newItemPrice) || 0,
    }]);
    setNewItemRefId("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrice("");
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null; items: PackageItem[] }) => {
      const res = await apiRequest("POST", "/api/packages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setDialogOpen(false);
      toast({ title: "Package created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description: string | null; items: PackageItem[] } }) => {
      const res = await apiRequest("PUT", `/api/packages/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setDialogOpen(false);
      setEditPkg(null);
      toast({ title: "Package updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setDeleteConfirm(null);
      toast({ title: "Package deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Enter package name", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Add at least one item to the package", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), description: description.trim() || null, items };
    if (editPkg) {
      updateMutation.mutate({ id: editPkg.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const packageTotal = (pkg: PackageType) => {
    const list = (pkg.items || []) as PackageItem[];
    return list.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Packages"
        description="Build packages from services, medicines, injections, or custom items. Add packages when creating bills."
        actions={
          <Button onClick={openCreate} data-testid="button-add-package">
            <Plus className="h-4 w-4 mr-1" /> Add Package
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packagesList.filter(p => p.isActive).map((pkg) => (
            <Card key={pkg.id} data-testid={`card-package-${pkg.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">${packageTotal(pkg)} total · {(pkg.items?.length || 0)} items</p>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{pkg.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)} data-testid={`button-edit-package-${pkg.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(pkg.id)} data-testid={`button-delete-package-${pkg.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {packagesList.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No packages yet. Create a package from services, medicines, injections, or custom items.</p>
              <Button className="mt-4" onClick={openCreate}>Add Package</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPkg ? "Edit Package" : "Add Package"}</DialogTitle>
            <DialogDescription>Build a package from services, medicines, injections, or custom line items.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Health Checkup" required data-testid="input-package-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" rows={2} />
            </div>
            <div>
              <Label>Items</Label>
              <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{item.type}</Badge>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">× {item.quantity} @ ${Number(item.unitPrice).toFixed(2)} = ${(item.quantity * item.unitPrice).toFixed(2)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
                  <Select value={newItemType} onValueChange={(v: PackageItem["type"]) => setNewItemType(v)}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="medicine">Medicine</SelectItem>
                      <SelectItem value="injection">Injection</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {newItemType === "service" && (
                    <Select value={newItemRefId} onValueChange={setNewItemRefId}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.isActive).map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} – ${s.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {newItemType === "injection" && (
                    <Select value={newItemRefId} onValueChange={setNewItemRefId}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select injection" /></SelectTrigger>
                      <SelectContent>
                        {injections.filter(i => i.isActive).map(i => (
                          <SelectItem key={i.id} value={String(i.id)}>{i.name} – ${i.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {newItemType === "medicine" && (
                    <Select value={newItemRefId} onValueChange={setNewItemRefId}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select medicine" /></SelectTrigger>
                      <SelectContent>
                        {medicines.filter(m => m.isActive).map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name} – ${m.sellingPriceLocal || m.sellingPrice}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {newItemType === "custom" && (
                    <>
                      <Input placeholder="Item name" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-[140px]" />
                      <Input type="number" step="0.01" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-[80px]" />
                    </>
                  )}
                  <Input type="number" min={1} value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value) || 1)} className="w-16" />
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>Add item</Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-package">
                {editPkg ? "Update" : "Create"} Package
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete package?"
        description="This package will be removed. Bills already created are not affected."
        onConfirm={() => { if (deleteConfirm != null) deleteMutation.mutate(deleteConfirm); }}
      />
    </div>
  );
}
