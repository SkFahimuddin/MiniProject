import { useParams, useNavigate } from 'react-router-dom'
import { useSensor } from '../context/SensorContext.jsx'
import Topbar from '../components/Topbar.jsx'
import styles from './BedDetailPage.module.css'

export default function BedDetailPage() {
  const { bedId }  = useParams()
  const navigate   = useNavigate()
  const { beds }   = useSensor()
  const bed        = beds.find(b => b.id === bedId)

  if (!bed) {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.notFound}>
          <h2>Bed not found</h2>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to dashboard</button>
        </div>
      </div>
    )
  }

  const irCrit    = bed.ir    === 'crit'
  const irWarn    = bed.ir    === 'warn'
  const colorCrit = bed.color === 'crit'
  const allOk     = bed.ivActive && !irCrit && !irWarn && !colorCrit

  return (
    <div className={styles.page}>
      <Topbar />

      <main className={styles.main}>
        {/* Back */}
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to dashboard
        </button>

        {/* Patient header */}
        <div className={styles.patientCard}>
          <div className={styles.patientTop}>
            <div>
              <h1 className={styles.patientName}>{bed.patient ?? 'Vacant Bed'}</h1>
              <div className={styles.patientMeta}>
                {bed.doctor  && <span><b>Doctor:</b> {bed.doctor}</span>}
                {bed.age     && <span><b>Age:</b> {bed.age}</span>}
                {bed.diagnosis && <span><b>Diagnosis:</b> {bed.diagnosis}</span>}
                {bed.ivStarted && <span><b>IV Started:</b> {bed.ivStarted}</span>}
              </div>
            </div>
            <div className={styles.bedIdBadge}>{bed.id}</div>
          </div>
        </div>

        {/* ── Alerts section ── */}
        {bed.ivActive && (
          <>
            {colorCrit && (
              <AlertBox
                type="crit"
                icon="🔴"
                title="Blood Backflow Detected"
                desc="The colour sensor in the saline pipe has detected red — blood is flowing back into the IV line. This is a critical condition. Clamp the IV line immediately and call the attending doctor."
                time="Last triggered today"
                sensor="Colour Sensor (Saline Pipe)"
              />
            )}
            {(irWarn || irCrit) && (
              <AlertBox
                type="warn"
                icon="⚠"
                title="Irregular Drip Detected"
                desc="The IR sensor in the drip chamber is detecting an abnormal drip pattern. The flow rate may be too fast, too slow, or intermittent. Please inspect the IV line and drip clamp."
                time="Last triggered today"
                sensor="IR Sensor (Drip Chamber)"
              />
            )}
            {allOk && (
              <AlertBox
                type="ok"
                icon="✓"
                title="All Systems Normal"
                desc="Both IR and colour sensors are reporting normal readings. IV flow is stable and the saline line is clear."
                time=""
                sensor=""
              />
            )}
          </>
        )}

        {!bed.ivActive && (
          <div className={styles.vacantBox}>
            This bed is currently vacant. No IV is active and sensors are offline.
          </div>
        )}

        {/* ── Sensor cards ── */}
        {bed.ivActive && (
          <>
            <div className={styles.sectionTitle}>Live Sensor Readings</div>
            <div className={styles.sensorsGrid}>
              <SensorCard
                title="IR Sensor"
                subtitle="Drip Chamber"
                value={bed.ir === 'warn' ? 'IRREGULAR' : bed.ir === 'crit' ? 'CRITICAL' : 'NORMAL'}
                status={bed.ir}
                desc={
                  bed.ir === 'warn' ? 'Abnormal drip pattern detected. Check IV line and clamp.' :
                  bed.ir === 'crit' ? 'Critical drip issue — immediate attention required.' :
                  'Drip rate is within normal range. No action needed.'
                }
                icon={<IrIcon />}
              />
              <SensorCard
                title="Colour Sensor"
                subtitle="Saline Pipe"
                value={bed.color === 'crit' ? 'RED DETECTED' : 'CLEAR'}
                status={bed.color}
                desc={
                  bed.color === 'crit'
                    ? 'Red colour detected — blood is flowing back. Immediate action required.'
                    : 'Saline is flowing correctly. No blood or discolouration detected.'
                }
                icon={<ColorIcon />}
              />
            </div>
          </>
        )}

        {/* ── Event log ── */}
        <div className={styles.sectionTitle} style={{ marginTop: 24 }}>Event Log</div>
        <div className={styles.eventTable}>
          <div className={styles.eventHeader}>
            <span>Time</span>
            <span>Event</span>
          </div>
          {bed.events.length === 0 && (
            <div className={styles.eventEmpty}>No events recorded yet.</div>
          )}
          {[...bed.events].reverse().map((ev, i) => (
            <div className={`${styles.eventRow} ${styles[`ev_${ev.type}`]}`} key={i}>
              <span className={styles.eventTime}>{ev.time}</span>
              <span className={styles.eventMsg}>{ev.msg}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/* ── Sub-components ── */

function AlertBox({ type, icon, title, desc, time, sensor }) {
  const cls = type === 'crit' ? styles.alertCrit
            : type === 'warn' ? styles.alertWarn
            :                   styles.alertOk
  return (
    <div className={`${styles.alertBox} ${cls}`}>
      <div className={styles.alertIcon}>{icon}</div>
      <div className={styles.alertBody}>
        <div className={styles.alertTitle}>{title}</div>
        <div className={styles.alertDesc}>{desc}</div>
        {sensor && <div className={styles.alertMeta}>{sensor}{time ? ` · ${time}` : ''}</div>}
      </div>
    </div>
  )
}

function SensorCard({ title, subtitle, value, status, desc, icon }) {
  const valCls = status === 'crit' ? styles.valCrit
               : status === 'warn' ? styles.valWarn
               :                     styles.valOk
  return (
    <div className={styles.sensorCard}>
      <div className={styles.sensorCardTop}>
        <div className={styles.sensorIcon}>{icon}</div>
        <div>
          <div className={styles.sensorTitle}>{title}</div>
          <div className={styles.sensorSubtitle}>{subtitle}</div>
        </div>
      </div>
      <div className={`${styles.sensorVal} ${valCls}`}>{value}</div>
      <div className={styles.sensorDesc}>{desc}</div>
    </div>
  )
}

function IrIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  )
}

function ColorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  )
}
