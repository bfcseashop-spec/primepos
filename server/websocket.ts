import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { NotificationPayload } from "@shared/notifications";

export type PatientMonitorReadingPayload = {
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
  device?: { id: number; name: string; deviceModel: string; deviceSerial?: string | null; deviceIdentifier: string };
};

type ClientMeta = {
  ws: WebSocket;
  userId?: number;
  role?: string;
  fullName?: string | null;
};

const clients = new Set<ClientMeta>();

function isAdminRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "admin" || r.includes("super admin");
}

function shouldDeliver(meta: ClientMeta, payload: NotificationPayload): boolean {
  // Admins receive everything.
  if (isAdminRole(meta.role)) return true;

  const role = (meta.role || "").toLowerCase();

  switch (payload.audience) {
    case "all":
      return true;
    case "doctor": {
      if (!role.includes("doctor")) return false;
      if (!payload.doctorName) return true;
      const full = (meta.fullName || "").toLowerCase();
      return full.includes(payload.doctorName.toLowerCase());
    }
    case "pharmacist":
      return role.includes("pharmacist");
    case "receptionist":
      return role.includes("receptionist") || role.includes("front desk");
    case "lab_technologist":
      return role.includes("lab") || role.includes("technologist");
    case "manager":
      return role.includes("manager");
    case "staff":
      return !!meta.userId;
    case "admin":
      return isAdminRole(meta.role);
    default:
      return false;
  }
}

export function pushNotification(payload: NotificationPayload): void {
  const json = JSON.stringify({ type: "notification", payload });
  clients.forEach((client) => {
    if (client.ws.readyState !== WebSocket.OPEN) return;
    if (!shouldDeliver(client, payload)) return;
    try {
      client.ws.send(json);
    } catch {
      // Ignore send errors, connection cleanup happens on close/error.
    }
  });
}

const monitorClients = new Set<WebSocket>();

export function broadcastPatientMonitorReading(payload: PatientMonitorReadingPayload): void {
  const json = JSON.stringify({ type: "vitals", payload });
  monitorClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(json);
      } catch {
        // ignore
      }
    }
  });
}

const PATH_PATIENT_MONITOR = "/ws/patient-monitor";
const PATH_NOTIFICATIONS = "/ws/notifications";

function setupPatientMonitorWss(wss: InstanceType<typeof WebSocketServer>): void {
  wss.on("connection", (ws) => {
    monitorClients.add(ws);
    ws.on("close", () => monitorClients.delete(ws));
    ws.on("error", () => monitorClients.delete(ws));
  });
}

function setupNotificationWss(wss: InstanceType<typeof WebSocketServer>): void {
  wss.on("connection", (ws) => {
    const meta: ClientMeta = { ws };
    clients.add(meta);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === "hello") {
          if (typeof msg.userId === "number") meta.userId = msg.userId;
          if (typeof msg.role === "string") meta.role = msg.role;
          if (typeof msg.fullName === "string" || msg.fullName == null) meta.fullName = msg.fullName ?? null;
        }
      } catch {
        // Ignore malformed messages.
      }
    });

    const cleanup = () => {
      clients.delete(meta);
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });
}

/**
 * Attach WebSocket servers to the HTTP server using a single upgrade listener.
 * This ensures upgrade is handled before Express can send a response (e.g. SPA fallback).
 */
export function setupPatientMonitorWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true, path: PATH_PATIENT_MONITOR });
  setupPatientMonitorWss(wss);
  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url || "").split("?")[0];
    if (pathname !== PATH_PATIENT_MONITOR) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
}

export function setupNotificationWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true, path: PATH_NOTIFICATIONS });
  setupNotificationWss(wss);
  server.on("upgrade", (req, socket, head) => {
    const pathname = (req.url || "").split("?")[0];
    if (pathname !== PATH_NOTIFICATIONS) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
}

