# SalineWatch v2 — IV Saline Monitoring System

Real-time hospital IV monitoring webapp with MongoDB-backed admin panel.

## Architecture

```
salinewatch/
├── src/                        ← React frontend (Vite)
│   ├── context/
│   │   ├── AuthContext.jsx     ← JWT auth
│   │   └── SensorContext.jsx   ← Beds from DB + Socket.io
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── BedDetailPage.jsx
│   │   └── AdminPage.jsx       ← Admin panel (beds + nurses)
│   └── components/
│       ├── Topbar.jsx
│       └── BedCard.jsx
├── server/
│   └── server.js               ← Node.js + Express + Socket.io + MongoDB
└── esp8266/
    ├── ir_sensor/ir_sensor.ino
    └── colour_sensor/colour_sensor.ino
```

## Roles

| Role  | Can do |
|-------|--------|
| Admin | Login, view dashboard, open Admin Panel to create/edit/delete beds and nurses |
| Nurse | Login, view dashboard, view bed detail — read only |

## Setup

### 1. MongoDB
Install MongoDB locally or use MongoDB Atlas (free tier).

### 2. Backend
```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
npm install
node server.js
```

On first run, a default admin is created:
- **Email:** admin@hospital.com  
- **Password:** admin1234  
⚠️ Change this via the Admin Panel immediately.

### 3. Frontend
```bash
# From root salinewatch/ folder
npm install
npm run dev
```
Open http://localhost:5173

### 4. Admin Workflow
1. Login as admin
2. Click **⚙ Admin** in the topbar
3. **Beds tab** → Add beds. For each bed:
   - Set Bed ID (must match `BED_ID` in ESP firmware, e.g. `B-101`)
   - Set Doctor name, Patient name, Diagnosis
   - Set ESP IDs for reference
   - Toggle IV Active when drip starts
4. **Nurses tab** → Add nurse accounts with email + password

### 5. Flash ESP8266 Boards

Set `BED_ID` in each `.ino` to match a bed you created in the admin panel.

### Sensor API (ESP8266 → Server)
```
POST /api/sensor
{ "bedId": "B-101", "sensor": "ir",    "value": "warn"   }
{ "bedId": "B-101", "sensor": "color", "value": "crit"   }
{ "bedId": "B-101", "sensor": "ir",    "value": "normal" }
```

## Deploy

### Backend → Render.com
- Root directory: `server`
- Build: `npm install`
- Start: `node server.js`
- Add env vars: `MONGODB_URI`, `JWT_SECRET`

### Frontend → Vercel
- Root directory: `.`
- Framework: Vite
- Set backend URL in `src/context/SensorContext.jsx`

## Tech Stack
- **Frontend:** React 18 + Vite + React Router + CSS Modules
- **Backend:** Node.js + Express + Socket.io + Mongoose
- **Database:** MongoDB
- **Auth:** JWT + bcrypt
- **Hardware:** ESP8266 + TCRT5000 IR + TCS3200 Colour sensor
