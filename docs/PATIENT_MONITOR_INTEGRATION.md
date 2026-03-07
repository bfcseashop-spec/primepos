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

## MEDEX Smart View-Pro 12B: Device configuration

The Smart View-Pro 12 (Smart View-Pro 12B) pushes data to a **Central Monitoring System (CMS)** or **HL7-compliant server**. PrimePOS does not speak HL7 directly; it accepts **HTTP JSON** at `/api/patient-monitor/ingest`. So you either point the monitor at an **HL7 gateway** (e.g. **monitor-gateway**) that converts HL7 → HTTP and forwards to PrimePOS, or use a vendor CMS that can push to our ingest URL.

### 1. Network configuration (on the monitor)

- **Connection**: Use **Wired (RJ45)** or **Wireless** as per your setup.
- **Access**: Main Menu → **Network Settings** or **System Maintenance**. (Some options may need a service password; common defaults on similar units are `3333` or `0000` — check the unit or manual.)
- **IP settings** (recommended: **Static** for stable data pushing):
  - **IP Address**: Unique address on your LAN.
  - **Subnet Mask** and **Gateway**: Same as your hospital/clinic network.

### 2. CMS / HL7 server settings (on the monitor)

- **Menu**: **CMS Setup** or **Server Settings**.
- **Server IP Address**: Set to the **IP of the machine that receives HL7** from the monitor:
  - If you run **monitor-gateway** on the same network as the monitor, use that machine’s IP.
  - If the gateway runs on your VPS, use the VPS **public IP** only if the monitor can reach it (e.g. over VPN or exposed port); otherwise run the gateway on-site and point the monitor to the on-site server IP.
- **Port**: Must match the HL7 listener (e.g. **8000**, **8080**, or your gateway’s HL7 port). Our ingest is HTTP only; the gateway listens on this port for HL7 and forwards to PrimePOS.

So: **on the MEDEX device**, you configure **Server IP** = gateway (or CMS) IP and **Port** = gateway HL7 port. The gateway then sends data to **https://pos.primeclinic24.com/api/patient-monitor/ingest**.

### 3. Data management (on the monitor)

- **Data Storage / Automatic Export**: Enable pushing of NIBP and alarm events to the server as per the device menu.
- **Patient Management**: Enter patient demographics on the device when possible so the gateway can associate pushed data with the correct patient in PrimePOS (e.g. by MRN or name).

### 4. Troubleshooting

- **Monitoring / Network**: In the device’s **General Properties**, ensure **Monitoring** or **Network** is **enabled** (ticked).
- **Cable**: Confirm the RJ45 cable is firmly connected to the monitor’s Ethernet port.
- **Gateway**: Ensure **monitor-gateway** (or your HL7→HTTP bridge) is running, bound to the IP/port you entered on the monitor, and configured to POST to `https://pos.primeclinic24.com/api/patient-monitor/ingest`. Check gateway logs if the device shows connected but PrimePOS shows no data.

---

## Connecting the MEDEX device to PrimePOS

The Smart View-Pro 12B typically sends **HL7 over TCP** to the IP:port you set in CMS/Server Settings. PrimePOS accepts **HTTP JSON** at `/api/patient-monitor/ingest`. Use one of these approaches:

1. **HL7 gateway (recommended)**: Run an HL7 listener (e.g. **monitor-gateway**) on a server the monitor can reach. Configure the MEDEX **Server IP** and **Port** to that listener. The gateway parses HL7, maps vitals to our JSON format, and POSTs to `https://pos.primeclinic24.com/api/patient-monitor/ingest`.
2. **Vendor CMS**: If MEDEX or a third party provides a CMS that can send HTTP to an external URL, point it to `https://pos.primeclinic24.com/api/patient-monitor/ingest` with the JSON body format above.
3. **Manual / test**: Use curl or Postman to POST the JSON example to `https://pos.primeclinic24.com/api/patient-monitor/ingest` to verify the pipeline; the device will not connect to this URL directly.

## Database

After deployment, run:

```bash
npm run db:push
```

This creates (if missing) the `patient_monitor_devices` and `patient_monitor_readings` tables.
