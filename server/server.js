/**
 * SalineWatch — Backend Server (MongoDB Edition)
 * Node.js + Express + Socket.io + MongoDB
 */

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const mongoose   = require('mongoose')
const bcrypt     = require('bcryptjs')
const jwt        = require('jsonwebtoken')

const app    = express()
const server = http.createServer(app)

const JWT_SECRET  = process.env.JWT_SECRET  || 'salinewatch_secret_change_in_prod'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/salinewatch'
const PORT        = process.env.PORT        || 3001

// ── CORS ──────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
})
app.use(cors())
app.use(express.json())

// ── MongoDB Schemas ────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['admin', 'nurse'], required: true },
  ward:      { type: String, default: 'General Ward' },
  createdAt: { type: Date, default: Date.now },
})

const bedSchema = new mongoose.Schema({
  bedId:      { type: String, required: true, unique: true },  // e.g. B-101
  espIdIR:    { type: String, default: '' },   // ESP8266 board ID for IR sensor
  espIdColor: { type: String, default: '' },   // ESP8266 board ID for colour sensor
  doctorName: { type: String, default: '' },
  patientName:{ type: String, default: '' },
  diagnosis:  { type: String, default: '' },
  ward:       { type: String, default: 'General Ward' },
  ivStarted:  { type: String, default: null },
  ivActive:   { type: Boolean, default: false },
  ir:         { type: String, default: 'off' },
  color:      { type: String, default: 'off' },
  events:     [{ time: String, msg: String, type: String }],
  lastSeen:   { type: Date, default: null },
})

const User = mongoose.model('User', userSchema)
const Bed  = mongoose.model('Bed',  bedSchema)

// ── Middleware: verify JWT ──────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token.' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token.' })
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only.' })
  next()
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'SalineWatch API' }))

// ── AUTH: Login ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' })

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, ward: user.ward },
      JWT_SECRET,
      { expiresIn: '8h' }
    )
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, ward: user.ward } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN: Get all nurses ──────────────────────────────────────────────────
app.get('/api/admin/nurses', auth, adminOnly, async (req, res) => {
  const nurses = await User.find({ role: 'nurse' }, '-password')
  res.json(nurses)
})

// ── ADMIN: Create nurse ────────────────────────────────────────────────────
app.post('/api/admin/nurses', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, ward } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required.' })

    const hashed = await bcrypt.hash(password, 10)
    const nurse  = await User.create({ name, email: email.toLowerCase(), password: hashed, role: 'nurse', ward: ward || 'General Ward' })
    const { password: _, ...safe } = nurse.toObject()
    res.status(201).json(safe)
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists.' })
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN: Update nurse ────────────────────────────────────────────────────
app.put('/api/admin/nurses/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, ward } = req.body
    const update = {}
    if (name)  update.name  = name
    if (email) update.email = email.toLowerCase()
    if (ward)  update.ward  = ward
    if (password) update.password = await bcrypt.hash(password, 10)

    const nurse = await User.findByIdAndUpdate(req.params.id, update, { new: true, select: '-password' })
    if (!nurse) return res.status(404).json({ error: 'Nurse not found.' })
    res.json(nurse)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN: Delete nurse ────────────────────────────────────────────────────
app.delete('/api/admin/nurses/:id', auth, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

// ── BEDS: Get all beds ─────────────────────────────────────────────────────
app.get('/api/beds', auth, async (req, res) => {
  const beds = await Bed.find().sort('bedId')
  res.json(beds)
})

// ── ADMIN: Create bed ──────────────────────────────────────────────────────
app.post('/api/admin/beds', auth, adminOnly, async (req, res) => {
  try {
    const { bedId, espIdIR, espIdColor, doctorName, patientName, diagnosis, ward } = req.body
    if (!bedId) return res.status(400).json({ error: 'bedId required.' })

    const bed = await Bed.create({ bedId, espIdIR, espIdColor, doctorName, patientName, diagnosis, ward })
    res.status(201).json(bed)
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Bed ID already exists.' })
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN: Update bed ──────────────────────────────────────────────────────
app.put('/api/admin/beds/:id', auth, adminOnly, async (req, res) => {
  try {
    const { bedId, espIdIR, espIdColor, doctorName, patientName, diagnosis, ward, ivActive, ivStarted } = req.body
    const update = { bedId, espIdIR, espIdColor, doctorName, patientName, diagnosis, ward }
    if (ivActive  !== undefined) update.ivActive  = ivActive
    if (ivStarted !== undefined) update.ivStarted = ivStarted

    // If activating IV, reset sensor states
    if (ivActive === true) {
      update.ir    = 'normal'
      update.color = 'normal'
    }
    if (ivActive === false) {
      update.ir    = 'off'
      update.color = 'off'
    }

    const bed = await Bed.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!bed) return res.status(404).json({ error: 'Bed not found.' })
    io.emit('beds_updated')
    res.json(bed)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ADMIN: Delete bed ──────────────────────────────────────────────────────
app.delete('/api/admin/beds/:id', auth, adminOnly, async (req, res) => {
  await Bed.findByIdAndDelete(req.params.id)
  io.emit('beds_updated')
  res.json({ ok: true })
})

// ── ESP8266: Send sensor data ──────────────────────────────────────────────
// The ESP posts to this endpoint. We match by espIdIR or espIdColor.
app.post('/api/sensor', async (req, res) => {
  const { bedId, sensor, value } = req.body

  if (!bedId || !sensor || !value)
    return res.status(400).json({ error: 'bedId, sensor, value required.' })

  const validSensors = ['ir', 'color']
  const validValues  = ['normal', 'warn', 'crit']
  if (!validSensors.includes(sensor)) return res.status(400).json({ error: 'Invalid sensor.' })
  if (!validValues.includes(value))   return res.status(400).json({ error: 'Invalid value.' })

  const bed = await Bed.findOne({ bedId })
  if (!bed) return res.status(404).json({ error: `Bed ${bedId} not found.` })

  const now    = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const msgMap = {
    'ir:warn':      'IR: Irregular drip detected',
    'ir:normal':    'IR: Flow back to normal',
    'color:crit':   'COLOR ALERT: Red detected — blood backflow!',
    'color:normal': 'Color: Saline flow clear',
  }
  const typeMap = { 'ir:warn': 'warn', 'ir:normal': 'ok', 'color:crit': 'crit', 'color:normal': 'ok' }
  const key = `${sensor}:${value}`

  bed[sensor]  = value
  bed.lastSeen = new Date()
  bed.events.push({ time: now, msg: msgMap[key] || `${sensor} → ${value}`, type: typeMap[key] || 'info' })
  if (bed.events.length > 100) bed.events = bed.events.slice(-100) // cap log
  await bed.save()

  console.log(`[SalineWatch] ${bedId} | ${sensor} → ${value}`)
  io.emit('sensor_update', { bedId, sensor, value })
  res.json({ ok: true })
})

// ── Socket.io ──────────────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  console.log(`[SalineWatch] Browser connected: ${socket.id}`)
  // Send all bed data on connect
  const beds = await Bed.find().sort('bedId')
  socket.emit('initial_state', beds)
  socket.on('disconnect', () => console.log(`[SalineWatch] Disconnected: ${socket.id}`))
})

// ── Seed admin on first run ─────────────────────────────────────────────────
async function seedAdmin() {
  const exists = await User.findOne({ role: 'admin' })
  if (!exists) {
    const hashed = await bcrypt.hash('admin1234', 10)
    await User.create({ name: 'Admin', email: 'admin@hospital.com', password: hashed, role: 'admin', ward: 'All Wards' })
    console.log('[SalineWatch] Default admin created → admin@hospital.com / admin1234')
  }
}

// ── Connect & Start ─────────────────────────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[SalineWatch] MongoDB connected')
    await seedAdmin()
    server.listen(PORT, () => console.log(`[SalineWatch] Server running on http://localhost:${PORT}`))
  })
  .catch(err => console.error('[SalineWatch] MongoDB error:', err))
