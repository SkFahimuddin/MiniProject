import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { getToken } from './AuthContext.jsx'

const SensorContext = createContext(null)

const BACKEND_URL = '' // Vite proxy in dev; set Render URL in prod

export function SensorProvider({ children }) {
  const [beds, setBeds]             = useState([])
  const [connected, setConnected]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const socketRef = useRef(null)

  // Load initial beds from API
  async function fetchBeds() {
    try {
      const token = getToken()
      const { data } = await axios.get('/api/beds', { headers: { Authorization: `Bearer ${token}` } })
      setBeds(data)
    } catch (err) {
      console.error('[SalineWatch] Failed to fetch beds:', err)
    }
  }

  useEffect(() => {
    fetchBeds()

    const socket = io(BACKEND_URL || window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => { console.log('[SalineWatch] Socket connected'); setConnected(true) })
    socket.on('disconnect', () => { setConnected(false) })

    socket.on('initial_state', (bedsFromServer) => {
      setBeds(bedsFromServer)
    })

    socket.on('sensor_update', ({ bedId, sensor, value }) => {
      setBeds(prev => prev.map(bed => {
        if (bed.bedId !== bedId) return bed
        return { ...bed, [sensor]: value }
      }))
      setLastUpdate({ bedId, sensor, value, time: new Date() })
    })

    // Admin changed bed config — refetch everything
    socket.on('beds_updated', fetchBeds)

    return () => socket.disconnect()
  }, [])

  const stats = {
    total:       beds.length,
    activeIVs:   beds.filter(b => b.ivActive).length,
    irAlerts:    beds.filter(b => b.ir === 'warn').length,
    bloodAlerts: beds.filter(b => b.color === 'crit').length,
  }

  return (
    <SensorContext.Provider value={{ beds, stats, connected, lastUpdate, fetchBeds }}>
      {children}
    </SensorContext.Provider>
  )
}

export function useSensor() { return useContext(SensorContext) }
