import { useAuth } from '../context/AuthContext.jsx'
import { useSensor } from '../context/SensorContext.jsx'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Topbar.module.css'

export default function Topbar() {
  const { user, logout }   = useAuth()
  const { stats, connected } = useSensor()
  const navigate  = useNavigate()
  const location  = useLocation()
  const totalAlerts = stats.irAlerts + stats.bloodAlerts

  function handleLogout() { logout(); navigate('/login', { replace: true }) }

  const isAdmin = location.pathname === '/admin'

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.logo} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className={styles.logoIcon}><CrossIcon /></div>
          <span className={styles.logoText}>SalineWatch</span>
        </div>
        <div className={styles.divider} />
        <span className={styles.ward}>{user?.ward}</span>
      </div>

      <div className={styles.right}>
        <div className={connected ? styles.liveOn : styles.liveOff}>
          <span className={connected ? styles.dotOn : styles.dotOff} />
          {connected ? 'Live' : 'Connecting…'}
        </div>

        {totalAlerts > 0 && (
          <div className={styles.alertBadge}>{totalAlerts} alert{totalAlerts > 1 ? 's' : ''}</div>
        )}

        {user?.role === 'admin' && (
          <button
            className={isAdmin ? styles.adminBtnActive : styles.adminBtn}
            onClick={() => navigate(isAdmin ? '/' : '/admin')}
          >
            {isAdmin ? '← Dashboard' : '⚙ Admin'}
          </button>
        )}

        <span className={styles.userName}>{user?.name}</span>
        <span className={styles.userRole}>{user?.role}</span>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
