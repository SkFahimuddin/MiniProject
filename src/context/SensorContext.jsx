import { createContext, useContext, useState, useEffect, useRef } from 'react'

const SensorContext = createContext(null)

// ─────────────────────────────────────────────────────────
//  BACKEND URL
//  Development : uses Vite proxy  →  just '/'  works
//  Production  : set your Render URL here
//  e.g.  const BACKEND_URL = 'https://salinewatch.onrender.com'
// ─────────────────────────────────────────────────────────
const BACKEND_URL = ''   // empty = same origin (Vite proxy in dev)

// ─── Initial bed data ────────────────────────────────────
const INITIAL_BEDS = [
  {
    id: 'B-101', patient: 'Ramesh Kumar',  doctor: 'Dr. Anita Sharma',
    age: 54, diagnosis: 'Post-surgery recovery', ward: 'General',
    ivStarted: '08:30', ivActive: true,
    ir: 'normal', color: 'normal',
    events: [
      { time: '08:30', msg: 'IV drip started', type: 'info' },
      { time: '09:15', msg: 'Flow normal', type: 'ok' },
    ],
  },
  {
    id: 'B-102', patient: 'Sunita Devi',   doctor: 'Dr. Vikram Nair',
    age: 42, diagnosis: 'Dehydration treatment', ward: 'General',
    ivStarted: '07:15', ivActive: true,
    ir: 'warn', color: 'normal',
    events: [
      { time: '07:15', msg: 'IV drip started', type: 'info' },
      { time: '09:45', msg: 'IR: Irregular drip detected', type: 'warn' },
      { time: '10:02', msg: 'IR: Still showing irregular pattern', type: 'warn' },
    ],
  },
  {
    id: 'B-103', patient: 'Mohan Patel',   doctor: 'Dr. Anita Sharma',
    age: 67, diagnosis: 'Saline fluid therapy', ward: 'General',
    ivStarted: '06:45', ivActive: true,
    ir: 'normal', color: 'crit',
    events: [
      { time: '06:45', msg: 'IV drip started', type: 'info' },
      { time: '08:55', msg: 'Normal flow confirmed', type: 'ok' },
      { time: '10:10', msg: 'COLOR ALERT: Red detected — blood backflow!', type: 'crit' },
    ],
  },
  {
    id: 'B-104', patient: 'Fatima Sheikh', doctor: 'Dr. Raj Mehta',
    age: 35, diagnosis: 'Post-operative care', ward: 'General',
    ivStarted: '09:00', ivActive: true,
    ir: 'normal', color: 'normal',
    events: [
      { time: '09:00', msg: 'IV drip started', type: 'info' },
      { time: '09:30', msg: 'Flow normal', type: 'ok' },
    ],
  },
  {
    id: 'B-105', patient: 'Arjun Singh',   doctor: 'Dr. Raj Mehta',
    age: 29, diagnosis: 'Saline drip maintenance', ward: 'General',
    ivStarted: '10:00', ivActive: true,
    ir: 'normal', color: 'normal',
    events: [
      { time: '10:00', msg: 'IV drip started', type: 'info' },
    ],
  },
  {
    id: 'B-106', patient: 'Kavya Reddy',   doctor: 'Dr. Vikram Nair',
    age: 51, diagnosis: 'IV antibiotic course', ward: 'General',
    ivStarted: '07:50', ivActive: true,
    ir: 'normal', color: 'normal',
    events: [
      { time: '07:50', msg: 'IV drip started', type: 'info' },
      { time: '09:00', msg: 'Flow normal', type: 'ok' },
    ],
  },
  {
    id: 'B-107', patient: null, doctor: null, age: null,
    diagnosis: 'Vacant', ward: 'General',
    ivStarted: null, ivActive: false,
    ir: 'off', color: 'off', events: [],
  },
  {
    id: 'B-108', patient: null, doctor: null, age: null,
    diagnosis: 'Vacant', ward: 'General',
    ivStarted: null, ivActive: false,
    ir: 'off', color: 'off', events: [],
  },
]

export function SensorProvider({ children }) {
  const [beds, setBeds]           = useState(INITIAL_BEDS)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    // ─────────────────────────────────────────────────────
    //  Socket.io connection
    //  When your backend is ready, uncomment this block.
    //  Until then the app runs fully on mock data above.
    // ─────────────────────────────────────────────────────

    /*
    import { io } from 'socket.io-client'

    const socket = io(BACKEND_URL || window.location.origin, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[SalineWatch] Socket connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[SalineWatch] Socket disconnected')
      setConnected(false)
    })

    // ── This is the event your Node.js server emits ──
    // Format: { bedId: 'B-102', sensor: 'ir', value: 'warn' }
    // or    : { bedId: 'B-103', sensor: 'color', value: 'crit' }
    socket.on('sensor_update', (data) => {
      console.log('[SalineWatch] Sensor update:', data)
      handleSensorUpdate(data)
    })

    return () => socket.disconnect()
    */

    // ── DEMO MODE: socket not connected yet ──
    setConnected(false)
  }, [])

  // ─── Called by Socket.io OR manually for testing ──────
  function handleSensorUpdate({ bedId, sensor, value }) {
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    setBeds(prev => prev.map(bed => {
      if (bed.id !== bedId) return bed

      const msgMap = {
        'ir:warn':    'IR: Irregular drip detected',
        'ir:normal':  'IR: Flow back to normal',
        'color:crit': 'COLOR ALERT: Red detected — blood backflow!',
        'color:normal': 'Color: Saline flow clear',
      }
      const typeMap = {
        'ir:warn': 'warn', 'ir:normal': 'ok',
        'color:crit': 'crit', 'color:normal': 'ok',
      }
      const key = `${sensor}:${value}`

      return {
        ...bed,
        [sensor]: value,
        events: [
          ...bed.events,
          { time: now, msg: msgMap[key] || `${sensor} → ${value}`, type: typeMap[key] || 'info' },
        ],
      }
    }))

    setLastUpdate({ bedId, sensor, value, time: new Date() })
  }

  // ─── Stats derived from bed state ─────────────────────
  const stats = {
    total:       beds.length,
    activeIVs:   beds.filter(b => b.ivActive).length,
    irAlerts:    beds.filter(b => b.ir === 'warn').length,
    bloodAlerts: beds.filter(b => b.color === 'crit').length,
  }

  return (
    <SensorContext.Provider value={{ beds, stats, connected, lastUpdate, handleSensorUpdate }}>
      {children}
    </SensorContext.Provider>
  )
}

export function useSensor() {
  return useContext(SensorContext)
}
