# Patient Monitor Integration (MEDEX Smart View-Pro 12B)

PrimePOS can receive and display real-time vitals from the MEDEX USA Smart View-Pro 12B multi-parameter patient monitor (and compatible devices) over the network. When the device (or gateway) sends data to **pos.primeclinic24.com**, the device appears **Online** and vitals stream in real time on the Patient Monitor page.

## Overview

- **Device**: MEDEX USA Smart View-Pro 12B (Multi-parameter Patient Monitor)
- **Connectivity**: Ethernet (RJ45). The device (or a gateway on the same network) sends data to PrimePOS at **https://pos.primeclinic24.com** (or your deployment URL). After connecting and posting to the ingest API, the device shows **Online** and data appears as the device sends it.

## Backend

### Ingest endpoint (no auth)

The device or a gateway on your network should POST vitals to:

```
POST /api/patient-monitor/ingest
Content-Type: application/json
```

**Body example:**

```json
{
  "deviceIdentifier": "MEDEX-25112410040110",
  "deviceModel": "Smart View-Pro 12B",
  "deviceSerial": "25112410040110",
  "patientId": 1,
  "visitId": 2,
  "heartRate": 72,
  "spo2": 98,
  "sbp": 120,
  "dbp": 80,
  "temperature": 36.6,
  "respiratoryRate": 16
}
```

- `deviceIdentifier` (required): Unique id for this monitor (e.g. serial or MAC).
- `deviceModel`, `deviceSerial`: Optional; default model is "Smart View-Pro 12B".
- `patientId`, `visitId`: Optional; link reading to a PrimePOS patient/OPD visit.
- Vitals: `heartRate`, `spo2`, `sbp`, `dbp`, `temperature`, `respiratoryRate` — all optional.

The server creates a device record on first ingest and stores each reading. It also broadcasts the new reading over the **WebSocket** so the UI updates in real time.

### Authenticated API (session required)

- `GET /api/patient-monitor/devices` — List registered monitors.
- `GET /api/patient-monitor/latest?deviceId=1` — Latest reading per device.
- `GET /api/patient-monitor/readings?deviceId=1&limit=100` — History.

### WebSocket (real-time)

- **URL**: `ws://<host>/ws/patient-monitor` (or `wss://` in production).
- **Messages**: Server sends `{ "type": "vitals", "payload": <reading> }` for each new ingest. The frontend subscribes to this to show live vitals.

## Frontend

- **Route**: `/patient-monitor` (sidebar: **Patient Monitor**, under OPD).
- **Permission**: Same as OPD (view). Users with OPD access can open the page.
- **Device status**: Each device shows **Online** (green) if it has sent data in the last 5 minutes, otherwise **Offline** (gray). "Last seen" is shown when offline.
- **Real-time**: The UI connects to `wss://<host>/ws/patient-monitor`. When the server receives a reading from the ingest API, it broadcasts to all connected clients so the page updates immediately. A "Real-time: Connected" badge in the header confirms the WebSocket is active; vitals show a "Live" badge when the current reading is from the stream.
- The page lists devices with Online/Offline; selecting a device shows its latest vitals and live updates as the device sends data.

## Device setup for pos.primeclinic24.com

Use this base URL for PrimePOS: **https://pos.primeclinic24.com**

| What to configure | URL / value |
|------------------|-------------|
| **Ingest (device/gateway sends vitals)** | `https://pos.primeclinic24.com/api/patient-monitor/ingest` |
| **Open Patient Monitor in browser** | `https://pos.primeclinic24.com/patient-monitor` |
| **WebSocket (used automatically by the page)** | `wss://pos.primeclinic24.com/ws/patient-monitor` |

**On the device or gateway (e.g. monitor-gateway):**

1. Set the **PrimePOS base URL** to `https://pos.primeclinic24.com` (no trailing slash).
2. Ensure it **POST**s each reading to:  
   `https://pos.primeclinic24.com/api/patient-monitor/ingest`  
   with JSON body as in the example above (`deviceIdentifier`, `heartRate`, `spo2`, etc.).
3. No auth is required for the ingest endpoint.

**Server:** Ensure DNS for `pos.primeclinic24.com` points to your server and SSL (HTTPS/WSS) is set up (e.g. Nginx + Let’s Encrypt or Cloudflare).

---

## Connecting the MEDEX device

The Smart View-Pro 12B uses Ethernet. Typical options:

1. **HL7 / TCP**: If the monitor sends HL7 over TCP, run a small bridge (e.g. Node/Python) that listens for HL7 messages, parses vitals, and POSTs to `POST /api/patient-monitor/ingest`.
2. **Vendor gateway**: If MEDEX provides a PC or cloud gateway that can forward data via HTTP, configure it to POST to the ingest URL above.
3. **Manual / test**: Use curl or Postman to POST the JSON body above to `http://<primepos-host>/api/patient-monitor/ingest` to verify the pipeline and see data on the Patient Monitor page.

## Database

After deployment, run:

```bash
npm run db:push
```

This creates (if missing) the `patient_monitor_devices` and `patient_monitor_readings` tables.
