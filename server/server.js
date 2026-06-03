/**
 * SalineWatch — Backend Server
 * Node.js + Express + Socket.io
 *
 * HOW IT WORKS:
 *  1. ESP8266 sends HTTP POST to /api/sensor  with JSON body
 *  2. Server validates and emits a socket event to all connected browsers
 *  3. React webapp receives the event in real-time and updates the UI
 *
 * RUN LOCALLY:
 *   cd server
 *   npm install
 *   node server.js
 *
 * DEPLOY TO RENDER:
 *   - Push to GitHub
 *   - Create new Web Service on render.com
 *   - Root directory: server
 *   - Build command: npm install
 *   - Start command: node server.js
 */

const express   = require('express')
const http      = require('http')
const { Server } = require('socket.io')
const cors      = require('cors')

const app    = express()
const server = http.createServer(app)

// ── CORS ───────────────────────────────────────────────────────────────────
// In production, replace '*' with your Vercel frontend URL
// e.g.  origin: 'https://salinewatch.vercel.app'
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.use(cors())
app.use(express.json())

// ── In-memory state ────────────────────────────────────────────────────────
// Maps bedId → { ir, color, lastSeen }
const bedState = {}

// ── Health check ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'SalineWatch API', time: new Date() })
})

// ── ESP8266 sends sensor data here ─────────────────────────────────────────
//
//  Expected JSON body:
//  {
//    "bedId":  "B-102",         ← which bed the ESP is assigned to
//    "sensor": "ir",            ← "ir" or "color"
//    "value":  "warn"           ← see value map below
//  }
//
//  IR sensor values:
//    "normal"  → drip is flowing correctly
//    "warn"    → irregular / unexpected drip detected
//
//  Color sensor values:
//    "normal"  → saline is clear (no blood)
//    "crit"    → red detected (blood backflow!)
//
app.post('/api/sensor', (req, res) => {
  const { bedId, sensor, value } = req.body

  // ── Validation ──
  if (!bedId || !sensor || !value) {
    return res.status(400).json({ error: 'bedId, sensor, and value are required.' })
  }

  const validSensors = ['ir', 'color']
  const validValues  = ['normal', 'warn', 'crit']

  if (!validSensors.includes(sensor)) {
    return res.status(400).json({ error: `sensor must be one of: ${validSensors.join(', ')}` })
  }
  if (!validValues.includes(value)) {
    return res.status(400).json({ error: `value must be one of: ${validValues.join(', ')}` })
  }

  // ── Update in-memory state ──
  if (!bedState[bedId]) bedState[bedId] = {}
  bedState[bedId][sensor]   = value
  bedState[bedId].lastSeen  = new Date()

  console.log(`[SalineWatch] Sensor update → bed:${bedId} sensor:${sensor} value:${value}`)

  // ── Broadcast to all connected browsers ──
  // Your React app listens for this event in SensorContext.jsx
  io.emit('sensor_update', { bedId, sensor, value })

  res.json({ ok: true, bedId, sensor, value })
})

// ── Get current state of all beds (optional REST endpoint) ─────────────────
app.get('/api/state', (req, res) => {
  res.json(bedState)
})

// ── Socket.io connection events ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SalineWatch] Browser connected: ${socket.id}`)

  // Send current state to newly connected browser
  socket.emit('initial_state', bedState)

  socket.on('disconnect', () => {
    console.log(`[SalineWatch] Browser disconnected: ${socket.id}`)
  })
})

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`[SalineWatch] Server running on http://localhost:${PORT}`)
  console.log(`[SalineWatch] ESP8266 should POST to http://localhost:${PORT}/api/sensor`)
})
