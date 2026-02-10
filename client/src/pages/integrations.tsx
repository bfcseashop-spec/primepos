import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const getDeviceIconColor = (type: string) => {
    switch (type) {
      case "ultrasound": return { text: "text-blue-500", bg: "bg-blue-500/10" };
      case "xray": return { text: "text-violet-500", bg: "bg-violet-500/10" };
      case "ecg": return { text: "text-emerald-500", bg: "bg-emerald-500/10" };
      case "printer": return { text: "text-amber-500", bg: "bg-amber-500/10" };
      case "lab_analyzer": return { text: "text-cyan-500", bg: "bg-cyan-500/10" };
      default: return { text: "text-slate-500", bg: "bg-slate-500/10" };
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Device Integrations"
        description="Connect medical devices and equipment"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-integration">
                <Plus className="h-4 w-4 mr-1" /> Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Device Integration</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label htmlFor="deviceName">Device Name *</Label>
                  <Input id="deviceName" name="deviceName" required data-testid="input-device-name" />
                </div>
                <div>
                  <Label>Device Type *</Label>
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
                    <Label htmlFor="port">Port</Label>
                    <Input id="port" name="port" placeholder="e.g. COM3 or 8080" data-testid="input-device-port" />
                  </div>
                  <div>
                    <Label htmlFor="ipAddress">IP Address</Label>
                    <Input id="ipAddress" name="ipAddress" placeholder="e.g. 192.168.1.100" data-testid="input-device-ip" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-integration">
                  {createMutation.isPending ? "Adding..." : "Add Device"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 overflow-auto p-4">
        {integrations.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Cable className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">No devices connected</p>
            <p className="text-sm">Add your medical devices to integrate them with the system</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map((device) => {
              const DeviceIcon = getDeviceIcon(device.deviceType);
              const iconColor = getDeviceIconColor(device.deviceType);
              return (
                <Card key={device.id} className={device.status === "connected" ? "border-emerald-500/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${iconColor.bg}`}>
                          <DeviceIcon className={`h-5 w-5 ${iconColor.text}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{device.deviceName}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{device.deviceType.replace("_", " ")}</p>
                        </div>
                      </div>
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${device.status === "connected" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20"}`}>
                        {device.status === "connected" ? (
                          <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Connected</span>
                        ) : (
                          <span className="flex items-center gap-1"><WifiOff className="h-3 w-3" /> Offline</span>
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
                          <span>Port</span>
                          <span className="font-medium text-foreground">{device.port}</span>
                        </div>
                      )}
                      {device.ipAddress && (
                        <div className="flex justify-between">
                          <span>IP</span>
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
                      {device.status === "connected" ? "Disconnect" : "Connect"}
                    </Button>
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
