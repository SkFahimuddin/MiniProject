import Topbar   from '../components/Topbar.jsx'
import BedCard  from '../components/BedCard.jsx'
import { useSensor } from '../context/SensorContext.jsx'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { beds, stats, lastUpdate } = useSensor()

  const now = new Date().toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className={styles.page}>
      <Topbar />

      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Ward Dashboard</h1>
            <p className={styles.sub}>IV Saline monitoring — real-time sensor status per bed &middot; {now}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <StatCard label="Total Beds"     value={stats.total}       color="default" />
          <StatCard label="Active IVs"     value={stats.activeIVs}   color="green" />
          <StatCard label="IR Alerts"      value={stats.irAlerts}    color={stats.irAlerts    > 0 ? 'amber' : 'green'} />
          <StatCard label="Blood Backflow" value={stats.bloodAlerts} color={stats.bloodAlerts > 0 ? 'red'   : 'green'} />
        </div>

        {/* Active alerts banner */}
        {(stats.irAlerts > 0 || stats.bloodAlerts > 0) && (
          <div className={styles.alertBanner}>
            <span className={styles.alertBannerDot} />
            <strong>Active alerts — </strong>
            {stats.bloodAlerts > 0 && `${stats.bloodAlerts} blood backflow`}
            {stats.bloodAlerts > 0 && stats.irAlerts > 0 && ', '}
            {stats.irAlerts > 0 && `${stats.irAlerts} irregular drip`}
            . Please attend immediately.
          </div>
        )}

        {/* Beds grid */}
        <div className={styles.sectionTitle}>Bed Status</div>
        <div className={styles.grid}>
          {beds.map(bed => (
            <BedCard key={bed.id} bed={bed} />
          ))}
        </div>

        {lastUpdate && (
          <div className={styles.lastUpdate}>
            Last update: bed {lastUpdate.bedId} · {lastUpdate.sensor} → {lastUpdate.value} · {lastUpdate.time.toLocaleTimeString()}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statVal} ${styles[`color_${color}`]}`}>{value}</div>
    </div>
  )
}
