import { useNavigate } from 'react-router-dom'
import styles from './BedCard.module.css'

export function overallStatus(bed) {
  if (bed.color === 'crit') return 'crit'
  if (bed.ir === 'warn')    return 'warn'
  if (!bed.ivActive)        return 'vacant'
  return 'ok'
}

export default function BedCard({ bed }) {
  const navigate = useNavigate()
  const status   = overallStatus(bed)

  return (
    <div
      className={`${styles.card} ${styles[status]}`}
      onClick={() => navigate(`/bed/${bed.bedId}`)}
    >
      <div className={styles.top}>
        <span className={styles.bedId}>{bed.bedId}</span>
        <StatusPill status={status} />
      </div>

      <div className={styles.patientName}>
        {bed.patientName || 'Vacant'}
      </div>

      {bed.ivActive ? (
        <>
          <div className={styles.meta}>
            {bed.doctorName || '—'} &middot; {bed.diagnosis || '—'}
          </div>
          <div className={styles.sensors}>
            <SensorChip label="IR" value={bed.ir} />
            <SensorChip label="Color" value={bed.color} />
          </div>
        </>
      ) : (
        <div className={styles.vacant}>No IV active · Bed available</div>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    crit:   { cls: styles.pillCrit,   text: 'CRITICAL' },
    warn:   { cls: styles.pillWarn,   text: 'WARNING'  },
    ok:     { cls: styles.pillOk,     text: 'NORMAL'   },
    vacant: { cls: styles.pillVacant, text: 'VACANT'   },
  }
  const { cls, text } = map[status] ?? map.ok
  return <span className={`${styles.pill} ${cls}`}>{text}</span>
}

function SensorChip({ label, value }) {
  const cls = value === 'crit' ? styles.chipCrit : value === 'warn' ? styles.chipWarn : value === 'off' ? styles.chipOff : styles.chipOk
  const dot = value === 'crit' ? styles.dotCrit  : value === 'warn' ? styles.dotWarn  : value === 'off' ? styles.dotOff  : styles.dotOk
  const txt = value === 'crit' ? `${label}: ALERT` : value === 'warn' ? `${label}: Irregular` : value === 'off' ? `${label}: Off` : `${label}: Normal`
  return (
    <div className={`${styles.chip} ${cls}`}>
      <span className={`${styles.dot} ${dot}`} />
      {txt}
    </div>
  )
}
