import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Activity, Thermometer, Wind, Gauge, RefreshCw, Monitor, Wifi, WifiOff, Circle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

type Device = {
  id: number;
  name: string;
  deviceModel: string;
  deviceSerial?: string | null;
  deviceIdentifier: string;
  lastReadingAt?: string | null;
  isOnline?: boolean;
};

function isDeviceOnline(device: Device): boolean {
  if (device.isOnline !== undefined) return device.isOnline;
  if (!device.lastReadingAt) return false;
  return Date.now() - new Date(device.lastReadingAt).getTime() < ONLINE_THRESHOLD_MS;
}

function lastSeenLabel(lastReadingAt: string | null | undefined): string {
  if (!lastReadingAt) return "Never";
  const ms = Date.now() - new Date(lastReadingAt).getTime();
  if (ms < 60000) return "Just now";
  const min = Math.floor(ms / 60000);
  if (min < 60) return min + " min ago";
  const h = Math.floor(min / 60);
  return h === 1 ? "1 hour ago" : h + " hours ago";
}

type Reading = {
  id: number;
  deviceId: number;
  patientId?: number | null;
  visitId?: number | null;
  heartRate?: number | null;
  spo2?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  temperature?: string | null;
  respiratoryRate?: number | null;
  recordedAt: string;
  device?: Device;
};

function VitalCard({
  label,
  value,
  unit,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: number | string | null | undefined;
  unit: string;
  icon: React.ElementType;
  className?: string;
}) {
  const hasValue = value != null && String(value).trim() !== "";
  const display = hasValue ? String(value) + unit : "-";
  const testId = "vital-" + label.replace(/\s/g, "-").toLowerCase();
  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground" data-testid={testId}>
          {display}
        </p>
      </CardContent>
    </Card>
  );
}

export default function PatientMonitorPage() {
  const { t } = useTranslation();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [liveByDevice, setLiveByDevice] = useState<Record<number, Reading>>({});
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/patient-monitor/devices"],
    refetchInterval: 10000,
  });

  const { data: latestList = [], isLoading: latestLoading } = useQuery<Reading[]>({
    queryKey: ["/api/patient-monitor/latest"],
    refetchInterval: 5000,
  });

  const onVitals = useCallback((payload: Reading) => {
    const deviceId = payload.deviceId ?? (payload as any).device?.id;
    if (deviceId != null) {
      setLiveByDevice((prev) => ({ ...prev, [deviceId]: payload }));
      queryClient.invalidateQueries({ queryKey: ["/api/patient-monitor/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient-monitor/devices"] });
    }
  }, []);

  // WebSocket for real-time vitals (connects to pos.primepos.com when deployed)
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = protocol + "://" + window.location.host + "/ws/patient-monitor";

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      setWsStatus("connecting");
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setWsStatus("connected");
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg?.type === "vitals" && msg.payload) onVitals(msg.payload);
          } catch {
            // ignore
          }
        };
        ws.onclose = () => {
          setWsStatus("disconnected");
          wsRef.current = null;
          reconnectRef.current = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsStatus("disconnected");
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };

    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [onVitals]);

  const firstLiveDeviceId = Object.keys(liveByDevice).length > 0 ? Number(Object.keys(liveByDevice)[0]) : null;
  const effectiveDeviceId = selectedDeviceId ?? devices[0]?.id ?? firstLiveDeviceId ?? null;
  const liveReading = effectiveDeviceId != null ? liveByDevice[effectiveDeviceId] ?? null : null;
  const displayReading: Reading | null =
    liveReading ??
    (effectiveDeviceId != null
      ? latestList.find((r) => r.deviceId === effectiveDeviceId || (r as any).device?.id === effectiveDeviceId) ?? null
      : latestList[0] ?? null);

  const selectedDevice = selectedDeviceId
    ? devices.find((d) => d.id === selectedDeviceId) ?? (displayReading as any)?.device
    : devices[0] ?? (displayReading as any)?.device;

  const isLive = liveReading != null && (displayReading?.id === liveReading?.id || (displayReading as any)?.deviceId === liveReading?.deviceId);
  const deviceOnline = selectedDevice ? isDeviceOnline(selectedDevice) : false;

  if (devicesLoading || latestLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("patientMonitor.title") ?? "Patient Monitor"}
          description={t("patientMonitor.description") ?? "Real-time vitals from MEDEX Smart View-Pro 12B and other monitors"}
        />
        <div className="flex-1 overflow-auto p-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("patientMonitor.title") ?? "Patient Monitor"}
        description={t("patientMonitor.description") ?? "Real-time vitals from MEDEX Smart View-Pro 12B and other monitors"}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={wsStatus === "connected" ? "default" : "secondary"}
              className={wsStatus === "connected" ? "bg-emerald-600" : ""}
              data-testid="badge-ws-status"
            >
              {wsStatus === "connected" && <Wifi className="h-3 w-3 mr-1" />}
              {wsStatus === "disconnected" && <WifiOff className="h-3 w-3 mr-1" />}
              {wsStatus === "connecting" && <Circle className="h-3 w-3 mr-1 animate-pulse" />}
              {wsStatus === "connected"
                ? (t("patientMonitor.realTimeConnected") ?? "Real-time: Connected")
                : wsStatus === "connecting"
                  ? (t("patientMonitor.realTimeConnecting") ?? "Connecting...")
                  : (t("patientMonitor.realTimeDisconnected") ?? "Reconnecting...")}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/patient-monitor/latest"] });
                queryClient.invalidateQueries({ queryKey: ["/api/patient-monitor/devices"] });
              }}
              data-testid="button-refresh-vitals"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {t("common.refresh") ?? "Refresh"}
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {devices.length === 0 && latestList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No monitor data yet</p>
              <p className="text-sm mt-1">
                Connect your MEDEX Smart View-Pro 12B (or other device) to the network and send vitals to{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">POST /api/patient-monitor/ingest</code>.
              </p>
              <p className="text-xs mt-2">
                Use the device Ethernet port and a gateway script or integration to push readings (deviceIdentifier, heartRate, spo2, sbp, dbp, temperature, respiratoryRate).
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              {devices.map((dev) => {
                const online = isDeviceOnline(dev);
                const selected = selectedDeviceId === dev.id || (!selectedDeviceId && dev.id === devices[0]?.id);
                return (
                  <div key={dev.id} className="flex items-center gap-1.5">
                    <Button
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDeviceId(dev.id)}
                      data-testid={"button-device-" + dev.id}
                    >
                      <Monitor className="h-3.5 w-3.5 mr-1.5" />
                      {dev.name}
                    </Button>
                    <Badge
                      variant="outline"
                      className={online ? "text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" : "text-[10px] bg-muted text-muted-foreground"}
                      data-testid={"badge-device-" + dev.id + "-" + (online ? "online" : "offline")}
                    >
                      {online ? (
                        <>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
                          {t("patientMonitor.online") ?? "Online"}
                        </>
                      ) : (
                        <>
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground mr-1" />
                          {t("patientMonitor.offline") ?? "Offline"}
                        </>
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {displayReading && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      {selectedDevice?.name ?? "Monitor"}
                      {selectedDevice?.deviceModel && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {selectedDevice.deviceModel}
                        </Badge>
                      )}
                      {deviceOnline && (
                        <Badge className="bg-emerald-600 text-xs flex items-center gap-1" data-testid="badge-device-online-card">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                          {t("patientMonitor.online") ?? "Online"}
                        </Badge>
                      )}
                      {!deviceOnline && selectedDevice?.lastReadingAt && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t("patientMonitor.lastSeen") ?? "Last seen"}: {lastSeenLabel(selectedDevice.lastReadingAt)}
                        </Badge>
                      )}
                      {isLive && (
                        <Badge className="bg-blue-600 text-xs flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          {t("patientMonitor.live") ?? "Live"}
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {displayReading.recordedAt ? new Date(displayReading.recordedAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <VitalCard
                      label={t("patientMonitor.heartRate") ?? "Heart Rate"}
                      value={displayReading.heartRate}
                      unit=" bpm"
                      icon={Heart}
                    />
                    <VitalCard
                      label={t("patientMonitor.spo2") ?? "SpO₂"}
                      value={displayReading.spo2}
                      unit="%"
                      icon={Activity}
                    />
                    <VitalCard
                      label={t("patientMonitor.nibp") ?? "NIBP"}
                      value={
                        displayReading.sbp != null && displayReading.dbp != null
                          ? displayReading.sbp + "/" + displayReading.dbp
                          : displayReading.sbp ?? displayReading.dbp
                      }
                      unit={displayReading.sbp != null && displayReading.dbp != null ? "" : " mmHg"}
                      icon={Gauge}
                    />
                    <VitalCard
                      label={t("patientMonitor.temperature") ?? "Temp"}
                      value={displayReading.temperature}
                      unit=" °C"
                      icon={Thermometer}
                    />
                    <VitalCard
                      label={t("patientMonitor.respiratoryRate") ?? "Resp. Rate"}
                      value={displayReading.respiratoryRate}
                      unit=" /min"
                      icon={Wind}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
