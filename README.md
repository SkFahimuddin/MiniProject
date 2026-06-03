# SalineWatch — IV Saline Monitoring System

A real-time hospital IV monitoring webapp that tracks saline drip via two ESP8266 sensors and alerts staff through a live dashboard.

---

## Project Structure

```
salinewatch/
├── src/                        ← React frontend (Vite)
│   ├── context/
│   │   ├── AuthContext.jsx     ← Login state management
│   │   └── SensorContext.jsx   ← Sensor data + Socket.io
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── BedDetailPage.jsx
│   ├── components/
│   │   ├── Topbar.jsx
│   │   └── BedCard.jsx
│   └── main.jsx
├── server/
│   └── server.js               ← Node.js + Express + Socket.io backend
└── esp8266/
    ├── ir_sensor/
    │   └── ir_sensor.ino       ← ESP8266 #1 firmware (IR sensor)
    └── colour_sensor/
        └── colour_sensor.ino   ← ESP8266 #2 firmware (colour sensor)
```

---

## Step 1 — Run the Frontend

```bash
# From the root salinewatch/ folder
npm install
npm run dev
```

Open http://localhost:5173

**Demo login credentials:**
- nurse@hospital.com / 1234
- doctor@hospital.com / 1234
- admin@hospital.com / 1234

---

## Step 2 — Run the Backend Server

```bash
cd server
npm install
node server.js
```

Server runs on http://localhost:3001

Test it with curl:
```bash
curl -X POST http://localhost:3001/api/sensor \
  -H "Content-Type: application/json" \
  -d '{"bedId":"B-102","sensor":"ir","value":"warn"}'
```

You should see the dashboard update instantly in your browser.

---

## Step 3 — Connect to the Frontend

The frontend uses a Vite proxy in development so you don't need to change any URLs.

For production, open `src/context/SensorContext.jsx` and:
1. Set `BACKEND_URL` to your Render server URL
2. Uncomment the Socket.io connection block

---

## Step 4 — Deploy

### Backend (Render.com)
1. Push to GitHub
2. Go to render.com → New Web Service
3. Connect your repo
4. Root directory: `server`
5. Build command: `npm install`
6. Start command: `node server.js`
7. Copy the URL Render gives you (e.g. https://salinewatch.onrender.com)

### Frontend (Vercel)
1. Push to GitHub
2. Go to vercel.com → New Project
3. Root directory: `.` (the root, not server/)
4. Framework: Vite
5. Deploy

---

## Step 5 — Flash ESP8266 Boards

### IR Sensor ESP8266
1. Open `esp8266/ir_sensor/ir_sensor.ino` in Arduino IDE
2. Set your WiFi name, password, server URL, and bed ID
3. Flash to ESP8266 #1

### Colour Sensor ESP8266
1. Open `esp8266/colour_sensor/colour_sensor.ino` in Arduino IDE
2. Set your WiFi name, password, server URL, and bed ID
3. Flash to ESP8266 #2

**Important:** The BED_ID in the firmware must match a bed ID in the webapp (B-101 to B-108).

---

## Sensor Values Reference

| Sensor | Value    | Meaning                        |
|--------|----------|--------------------------------|
| ir     | normal   | Drip flowing correctly         |
| ir     | warn     | Irregular drip detected        |
| color  | normal   | Saline clear, no blood         |
| color  | crit     | Red detected — blood backflow! |

---

## Adding More Beds

Edit the `INITIAL_BEDS` array in `src/context/SensorContext.jsx` to add or modify beds, doctors, and patients.

---

## Tech Stack

- **Frontend:** React 18 + Vite + React Router + CSS Modules
- **Backend:** Node.js + Express + Socket.io
- **Hardware:** ESP8266 + IR sensor (TCRT5000) + TCS3200 colour sensor
- **Deploy:** Vercel (frontend) + Render (backend)
