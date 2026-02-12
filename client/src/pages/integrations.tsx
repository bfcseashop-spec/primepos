import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Cable, Monitor, Printer, Radio,
  Wifi, WifiOff, Scan, Heart
} from "lucide-react";
import type { Integration } from "@shared/schema";
import { useTranslation } from "@/i18n";

const DEVICE_TYPES = [
  { value: "ultrasound", label: "Ultrasound", icon: Monitor },
  { value: "xray", label: "X-Ray Machine", icon: Scan },
  { value: "ecg", label: "ECG Machine", icon: Heart },
  { value: "printer", label: "Printer", icon: Printer },
  { value: "lab_analyzer", label: "Lab Analyzer", icon: Radio },
  { value: "other", label: "Other Device", icon: Cable },
];

const CONNECTION_TYPES = ["USB", "TCP/IP", "Serial", "Bluetooth", "WiFi", "DICOM"];

export default function IntegrationsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/integrations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      setDialogOpen(false);
      toast({ title: "Device integration added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/integrations/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: "Device status updated" });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      deviceName: form.get("deviceName"),
      deviceType: form.get("deviceType"),
      connectionType: form.get("connectionType"),
      port: form.get("port") || null,
      ipAddress: form.get("ipAddress") || null,
      status: "disconnected",
      config: {},
    });
  };

  const getDeviceIcon = (type: string) => {
    const dt = DEVICE_TYPES.find(d => d.value === type);
    return dt?.icon || Cable;
  };

  const getDeviceIconGradient = (type: string) => {
    switch (type) {
      case "ultrasound": return "from-blue-500 to-blue-600";
      case "xray": return "from-violet-500 to-violet-600";
      case "ecg": return "from-emerald-500 to-emerald-600";
      case "printer": return "from-amber-500 to-amber-600";
      case "lab_analyzer": return "from-cyan-500 to-cyan-600";
      default: return "from-slate-500 to-slate-600";
    }
  };

  const statCards = [
    { key: "total", label: t("integrations.totalDevices"), gradient: "from-blue-500 to-blue-600", value: integrations.length, icon: Cable },
    { key: "connected", label: t("integrations.connected"), gradient: "from-emerald-500 to-emerald-600", value: integrations.filter(d => d.status === "connected").length, icon: Wifi },
    { key: "offline", label: t("integrations.offline"), gradient: "from-red-500 to-red-600", value: integrations.filter(d => d.status !== "connected").length, icon: WifiOff },
    { key: "types", label: t("integrations.deviceTypes"), gradient: "from-violet-500 to-violet-600", value: new Set(integrations.map(d => d.deviceType)).size, icon: Monitor },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("integrations.title")}
        description={t("integrations.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-integration">
                <Plus className="h-4 w-4 mr-1" /> {t("integrations.addDevice")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{t("integrations.addDevice")}</DialogTitle>
                <DialogDescription className="sr-only">Configure a new device integration</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label htmlFor="deviceName">{t("integrations.deviceName")} *</Label>
                  <Input id="deviceName" name="deviceName" required data-testid="input-device-name" />
                </div>
                <div>
                  <Label>{t("integrations.deviceType")} *</Label>
                  <Select name="deviceType" required>
                    <SelectTrigger data-testid="select-device-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Connection Type *</Label>
                  <Select name="connectionType" required>
                    <SelectTrigger data-testid="select-connection-type"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CONNECTION_TYPES.map(ct => (
                        <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="port">{t("integrations.port")}</Label>
                    <Input id="port" name="port" placeholder="e.g. COM3 or 8080" data-testid="input-device-port" />
                  </div>
                  <div>
                    <Label htmlFor="ipAddress">{t("integrations.ipAddress")}</Label>
                    <Input id="ipAddress" name="ipAddress" placeholder="e.g. 192.168.1.100" data-testid="input-device-ip" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-integration">
                  {createMutation.isPending ? "Adding..." : t("integrations.addDevice")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {statCards.map((s) => (
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

        {integrations.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 mb-4">
              <Cable className="h-8 w-8 text-blue-500/40" />
            </div>
            <p className="text-lg font-medium mb-1">{t("integrations.noDevices")}</p>
            <p className="text-sm">{t("integrations.addDevicesHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map((device) => {
              const DeviceIcon = getDeviceIcon(device.deviceType);
              return (
                <Card key={device.id} className={`overflow-visible hover-elevate ${device.status === "connected" ? "border-emerald-500/30" : ""}`}>
                  <CardContent className="p-0">
                    <div className={`h-1 rounded-t-md bg-gradient-to-r ${device.status === "connected" ? "from-emerald-500 to-teal-400" : "from-slate-400 to-slate-500"}`} />
                    <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${getDeviceIconGradient(device.deviceType)} shrink-0`}>
                          <DeviceIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{device.deviceName}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{device.deviceType.replace("_", " ")}</p>
                        </div>
                      </div>
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${device.status === "connected" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"}`}>
                        {device.status === "connected" ? (
                          <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> {t("integrations.connected")}</span>
                        ) : (
                          <span className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> {t("integrations.offline")}</span>
                        )}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div className="flex justify-between">
                        <span>Connection</span>
                        <span className="font-medium text-foreground">{device.connectionType}</span>
                      </div>
                      {device.port && (
                        <div className="flex justify-between">
                          <span>{t("integrations.port")}</span>
                          <span className="font-medium text-foreground">{device.port}</span>
                        </div>
                      )}
                      {device.ipAddress && (
                        <div className="flex justify-between">
                          <span>{t("integrations.ipAddress")}</span>
                          <span className="font-medium text-foreground">{device.ipAddress}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant={device.status === "connected" ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                      onClick={() => toggleStatusMutation.mutate({
                        id: device.id,
                        status: device.status === "connected" ? "disconnected" : "connected"
                      })}
                      data-testid={`button-toggle-device-${device.id}`}
                    >
                      {device.status === "connected" ? t("integrations.disconnect") : t("integrations.connect")}
                    </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
