import { useParams, useNavigate } from 'react-router-dom'
import { useSensor } from '../context/SensorContext.jsx'
import Topbar from '../components/Topbar.jsx'
import styles from './BedDetailPage.module.css'

export default function BedDetailPage() {
  const { bedId }  = useParams()
  const navigate   = useNavigate()
  const { beds }   = useSensor()
  const bed        = beds.find(b => b.bedId === bedId)

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

  const irWarn    = bed.ir    === 'warn'
  const colorCrit = bed.color === 'crit'
  const allOk     = bed.ivActive && !irWarn && !colorCrit

  return (
    <div className={styles.page}>
      <Topbar />
      <main className={styles.main}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to dashboard</button>

        <div className={styles.patientCard}>
          <div className={styles.patientTop}>
            <div>
              <h1 className={styles.patientName}>{bed.patientName || 'Vacant Bed'}</h1>
              <div className={styles.patientMeta}>
                {bed.doctorName  && <span><b>Doctor:</b> {bed.doctorName}</span>}
                {bed.diagnosis   && <span><b>Diagnosis:</b> {bed.diagnosis}</span>}
                {bed.ward        && <span><b>Ward:</b> {bed.ward}</span>}
                {bed.ivStarted   && <span><b>IV Started:</b> {bed.ivStarted}</span>}
              </div>
              {(bed.espIdIR || bed.espIdColor) && (
                <div className={styles.espInfo}>
                  {bed.espIdIR    && <span>ESP-IR: <code>{bed.espIdIR}</code></span>}
                  {bed.espIdColor && <span>ESP-Color: <code>{bed.espIdColor}</code></span>}
                </div>
              )}
            </div>
            <div className={styles.bedIdBadge}>{bed.bedId}</div>
          </div>
        </div>

        {bed.ivActive && (
          <>
            {colorCrit && <AlertBox type="crit" icon="🔴" title="Blood Backflow Detected" desc="The colour sensor in the saline pipe has detected red — blood is flowing back into the IV line. Clamp the IV line immediately and call the attending doctor." sensor="Colour Sensor (Saline Pipe)" />}
            {irWarn    && <AlertBox type="warn" icon="⚠" title="Irregular Drip Detected" desc="The IR sensor in the drip chamber is detecting an abnormal drip pattern. Please inspect the IV line and drip clamp." sensor="IR Sensor (Drip Chamber)" />}
            {allOk     && <AlertBox type="ok"   icon="✓" title="All Systems Normal" desc="Both IR and colour sensors are reporting normal readings. IV flow is stable and the saline line is clear." sensor="" />}
          </>
        )}

        {!bed.ivActive && (
          <div className={styles.vacantBox}>This bed is currently vacant. No IV is active and sensors are offline.</div>
        )}

        {bed.ivActive && (
          <>
            <div className={styles.sectionTitle}>Live Sensor Readings</div>
            <div className={styles.sensorsGrid}>
              <SensorCard title="IR Sensor" subtitle="Drip Chamber"
                value={bed.ir === 'warn' ? 'IRREGULAR' : 'NORMAL'} status={bed.ir}
                desc={bed.ir === 'warn' ? 'Abnormal drip pattern detected. Check IV line and clamp.' : 'Drip rate is within normal range. No action needed.'}
                icon={<IrIcon />} />
              <SensorCard title="Colour Sensor" subtitle="Saline Pipe"
                value={bed.color === 'crit' ? 'RED DETECTED' : 'CLEAR'} status={bed.color}
                desc={bed.color === 'crit' ? 'Red colour detected — blood is flowing back. Immediate action required.' : 'Saline is flowing correctly. No blood or discolouration detected.'}
                icon={<ColorIcon />} />
            </div>
          </>
        )}

        <div className={styles.sectionTitle} style={{ marginTop: 24 }}>Event Log</div>
        <div className={styles.eventTable}>
          <div className={styles.eventHeader}><span>Time</span><span>Event</span></div>
          {(!bed.events || bed.events.length === 0) && <div className={styles.eventEmpty}>No events recorded yet.</div>}
          {bed.events && [...bed.events].reverse().map((ev, i) => (
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

function AlertBox({ type, icon, title, desc, sensor }) {
  const cls = type === 'crit' ? styles.alertCrit : type === 'warn' ? styles.alertWarn : styles.alertOk
  return (
    <div className={`${styles.alertBox} ${cls}`}>
      <div className={styles.alertIcon}>{icon}</div>
      <div className={styles.alertBody}>
        <div className={styles.alertTitle}>{title}</div>
        <div className={styles.alertDesc}>{desc}</div>
        {sensor && <div className={styles.alertMeta}>{sensor}</div>}
      </div>
    </div>
  )
}

function SensorCard({ title, subtitle, value, status, desc, icon }) {
  const valCls = status === 'crit' ? styles.valCrit : status === 'warn' ? styles.valWarn : styles.valOk
  return (
    <div className={styles.sensorCard}>
      <div className={styles.sensorCardTop}>
        <div className={styles.sensorIcon}>{icon}</div>
        <div><div className={styles.sensorTitle}>{title}</div><div className={styles.sensorSubtitle}>{subtitle}</div></div>
      </div>
      <div className={`${styles.sensorVal} ${valCls}`}>{value}</div>
      <div className={styles.sensorDesc}>{desc}</div>
    </div>
  )
}

function IrIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
}
function ColorIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
}
