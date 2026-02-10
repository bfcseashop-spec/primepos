import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Search, MoreVertical, Eye, Pencil, Trash2, ImagePlus, X,
  FolderPlus, Activity, CheckCircle2, XCircle, DollarSign, Layers,
  RefreshCw, Grid3X3, List, Stethoscope, Tag, FileText,
} from "lucide-react";
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

const avatarGradients = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-pink-500 to-rose-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
];

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  General: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  Emergency: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  Preventive: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  Cardiology: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  Therapy: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  Consultation: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  Laboratory: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  Radiology: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  Surgery: { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

const defaultCategoryColor = { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" };

const defaultForm = {
  name: "", category: "", price: "", description: "", imageUrl: "",
};

export default function ServicesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [viewService, setViewService] = useState<Service | null>(null);
  const [deleteService, setDeleteService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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
      toast({ title: t("services.createdSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
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
      toast({ title: t("services.updatedSuccess") });
    },
    onError: (err: Error) => {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: t("services.deleted") });
      setDeleteService(null);
    },
  });

  const handleSubmit = () => {
    if (!form.name || !form.category || !form.price) {
      return toast({ title: t("common.fillRequired"), variant: "destructive" });
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    toast({ title: t("common.dataRefreshed") });
  };

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const activeCount = services.filter(s => s.isActive).length;
  const inactiveCount = services.filter(s => !s.isActive).length;
  const uniqueCategories = Array.from(new Set(services.map(s => s.category)));
  const totalValue = services.reduce((sum, s) => sum + parseFloat(s.price || "0"), 0);

  const getAvatarGradient = (id: number) => avatarGradients[id % avatarGradients.length];
  const getCatColor = (cat: string) => categoryColors[cat] || defaultCategoryColor;
  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const statCards = [
    { label: t("services.totalServices"), value: services.length, gradient: "from-blue-500 to-blue-600", icon: Activity },
    { label: t("common.active"), value: activeCount, gradient: "from-emerald-500 to-emerald-600", icon: CheckCircle2 },
    { label: t("common.inactive"), value: inactiveCount, gradient: "from-red-500 to-red-600", icon: XCircle },
    { label: t("services.categories"), value: uniqueCategories.length, gradient: "from-violet-500 to-violet-600", icon: Layers },
    { label: t("common.total"), value: `$${totalValue.toFixed(0)}`, gradient: "from-amber-500 to-amber-600", icon: DollarSign },
  ];

  const cardTopGradients = [
    "from-blue-500 to-cyan-500",
    "from-violet-500 to-purple-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-amber-500 to-orange-500",
    "from-indigo-500 to-blue-500",
  ];

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-3">
        <div>
          <Label htmlFor="svc-name">{t("services.serviceName")} *</Label>
          <Input id="svc-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-service-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("common.category")} *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger data-testid="select-service-category"><SelectValue placeholder={t("common.category")} /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="svc-price">{t("common.price")} ($) *</Label>
            <Input id="svc-price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} data-testid="input-service-price" />
          </div>
        </div>
        <div>
          <Label htmlFor="svc-description">{t("common.description")}</Label>
          <Textarea id="svc-description" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-service-description" />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
          <ImagePlus className="h-4 w-4" />
          {t("services.uploadImage")} <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
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
                className="absolute -top-2 -right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ visibility: form.imageUrl ? "visible" : "hidden" }}
                onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                data-testid="button-remove-image"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label
              className="flex flex-col items-center justify-center w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 cursor-pointer hover-elevate"
              data-testid="label-upload-image"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">{t("common.upload")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-service-image"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: t("common.imageTooLarge"), description: t("common.maxSize2MB"), variant: "destructive" });
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
            <p>{t("services.uploadServicePhoto")}</p>
            <p>{t("common.maxSizeHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServiceCard = (svc: Service) => {
    const catColor = getCatColor(svc.category);
    const topGrad = cardTopGradients[svc.id % cardTopGradients.length];

    return (
      <Card key={svc.id} className="overflow-visible hover-elevate" data-testid={`card-service-${svc.id}`}>
        <CardContent className="p-0">
          <div className={`h-1.5 rounded-t-md bg-gradient-to-r ${topGrad}`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                {svc.imageUrl ? (
                  <img src={svc.imageUrl} alt={svc.name} className="w-10 h-10 rounded-md object-cover border" data-testid={`img-service-thumb-${svc.id}`} />
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(svc.id)} text-white`}>
                      {getInitials(svc.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate" data-testid={`text-service-name-${svc.id}`}>{svc.name}</h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] mt-0.5 no-default-hover-elevate no-default-active-elevate ${catColor.bg} ${catColor.text}`}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${catColor.dot}`} />
                    {svc.category}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${svc.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewService(svc)} className="gap-2" data-testid={`action-view-${svc.id}`}>
                    <Eye className="h-3.5 w-3.5 text-blue-500" /> {t("services.viewDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(svc)} className="gap-2" data-testid={`action-edit-${svc.id}`}>
                    <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteService(svc)} className="text-destructive gap-2" data-testid={`action-delete-${svc.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {svc.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                  <DollarSign className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400" data-testid={`text-service-price-${svc.id}`}>${svc.price}</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                  svc.isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                }`}
                data-testid={`badge-status-${svc.id}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${svc.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {svc.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderServiceListItem = (svc: Service) => {
    const catColor = getCatColor(svc.category);

    return (
      <Card key={svc.id} className="overflow-visible hover-elevate" data-testid={`card-service-${svc.id}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {svc.imageUrl ? (
              <img src={svc.imageUrl} alt={svc.name} className="w-10 h-10 rounded-md object-cover border shrink-0" />
            ) : (
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className={`text-xs font-bold bg-gradient-to-br ${getAvatarGradient(svc.id)} text-white`}>
                  {getInitials(svc.name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold truncate" data-testid={`text-service-name-${svc.id}`}>{svc.name}</h4>
                <Badge variant="outline" className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${catColor.bg} ${catColor.text}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${catColor.dot}`} />
                  {svc.category}
                </Badge>
              </div>
              {svc.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{svc.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${svc.price}</span>
              <Badge
                variant="outline"
                className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                  svc.isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${svc.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                {svc.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-actions-${svc.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewService(svc)} className="gap-2" data-testid={`action-view-${svc.id}`}>
                    <Eye className="h-3.5 w-3.5 text-blue-500" /> {t("services.viewDetails")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(svc)} className="gap-2" data-testid={`action-edit-${svc.id}`}>
                    <Pencil className="h-3.5 w-3.5 text-amber-500" /> {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteService(svc)} className="text-destructive gap-2" data-testid={`action-delete-${svc.id}`}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("services.title")}
        description={t("services.subtitle")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-category-manage">
                  <FolderPlus className="h-4 w-4 mr-1" /> {t("common.category")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("services.manageCategories")}</DialogTitle>
                  <DialogDescription>{t("services.manageCategoriesDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("services.newCategoryPlaceholder")}
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newCategory.trim()) {
                          if (categories.includes(newCategory.trim())) {
                            toast({ title: t("common.categoryExists"), variant: "destructive" });
                            return;
                          }
                          const updated = [...categories, newCategory.trim()].sort();
                          setCategories(updated);
                          saveServiceCategories(updated);
                          setNewCategory("");
                          toast({ title: t("common.categoryAdded") });
                        }
                      }}
                      data-testid="input-new-category"
                    />
                    <Button
                      onClick={() => {
                        if (!newCategory.trim()) return;
                        if (categories.includes(newCategory.trim())) {
                          toast({ title: t("common.categoryExists"), variant: "destructive" });
                          return;
                        }
                        const updated = [...categories, newCategory.trim()].sort();
                        setCategories(updated);
                        saveServiceCategories(updated);
                        setNewCategory("");
                        toast({ title: t("common.categoryAdded") });
                      }}
                      data-testid="button-add-category"
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {categories.map(cat => {
                      const cc = getCatColor(cat);
                      return (
                        <div key={cat} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${cc.dot}`} />
                            <span className="text-sm">{cat}</span>
                          </div>
                          {!DEFAULT_SERVICE_CATEGORIES.includes(cat) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = categories.filter(c => c !== cat);
                                setCategories(updated);
                                saveServiceCategories(updated);
                                toast({ title: t("common.categoryRemoved") });
                              }}
                              data-testid={`button-remove-category-${cat}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(defaultForm); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-service">
                  <Plus className="h-4 w-4 mr-1" /> {t("services.addService")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("services.addService")}</DialogTitle>
                  <DialogDescription>{t("services.subtitle")}</DialogDescription>
                </DialogHeader>
                {formContent}
                <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-service">
                  {createMutation.isPending ? t("common.creating") : t("services.addService")}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s, i) => (
            <Card key={i} data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
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

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("services.searchServices")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-services"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")} {t("services.categories")}</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`toggle-elevate ${viewMode === "grid" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`toggle-elevate ${viewMode === "list" ? "toggle-elevated" : ""}`}
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("common.showing")} <span className="font-semibold text-foreground">{filtered.length}</span> {t("common.of")} {services.length} {t("sidebar.services")}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Stethoscope className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t("common.noData")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("services.addFirstService")}</p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(renderServiceCard)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(renderServiceListItem)}
          </div>
        )}
      </div>

      <Dialog open={!!viewService} onOpenChange={(open) => { if (!open) setViewService(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-view-service-title">{t("services.viewDetails")}</DialogTitle>
            <DialogDescription>{t("services.subtitle")}</DialogDescription>
          </DialogHeader>
          {viewService && (() => {
            const catColor = getCatColor(viewService.category);
            return (
              <div className="space-y-4">
                {viewService.imageUrl && (
                  <div className="w-full h-40 rounded-md overflow-hidden">
                    <img src={viewService.imageUrl} alt={viewService.name} className="w-full h-full object-cover" data-testid="img-service-detail" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {!viewService.imageUrl && (
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`text-sm font-bold bg-gradient-to-br ${getAvatarGradient(viewService.id)} text-white`}>
                        {getInitials(viewService.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <h3 className="font-semibold">{viewService.name}</h3>
                    <Badge variant="outline" className={`text-[10px] mt-1 no-default-hover-elevate no-default-active-elevate ${catColor.bg} ${catColor.text}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${catColor.dot}`} />
                      {viewService.category}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                      <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.price")}</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${viewService.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 shrink-0">
                      <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.status")}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] no-default-hover-elevate no-default-active-elevate ${
                          viewService.isActive
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                        }`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${viewService.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {viewService.isActive ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 shrink-0">
                      <Tag className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("common.category")}</p>
                      <p className="text-sm font-medium">{viewService.category}</p>
                    </div>
                  </div>
                </div>
                {viewService.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("common.description")}</p>
                    </div>
                    <p className="text-sm bg-muted/50 rounded-md p-2.5">{viewService.description}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => {
                    setViewService(null);
                    openEdit(viewService);
                  }} data-testid="button-view-to-edit">
                    <Pencil className="h-4 w-4 mr-1 text-amber-500" /> {t("common.edit")}
                  </Button>
                  <Button variant="outline" onClick={() => setViewService(null)} data-testid="button-close-view">
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editService} onOpenChange={(open) => { if (!open) { setEditService(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-service-title">{t("services.editService")}</DialogTitle>
            <DialogDescription>{t("services.subtitle")}</DialogDescription>
          </DialogHeader>
          {formContent}
          <Button className="w-full" onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-update-service">
            {updateMutation.isPending ? t("common.updating") : t("common.update")}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteService} onOpenChange={(open) => { if (!open) setDeleteService(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">{t("services.deleteService")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmPrefix")} <span className="font-semibold">{deleteService?.name}</span>? {t("common.cannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteService && deleteMutation.mutate(deleteService.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
