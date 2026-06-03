import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate        = useNavigate()
  const [email, setEmail]       = useState('nurse@hospital.com')
  const [password, setPassword] = useState('1234')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  if (user) {
    navigate('/', { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 400)) // simulate network
    const result = login(email.trim(), password)
    setLoading(false)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <CrossIcon />
          </div>
          <div>
            <div className={styles.logoName}>SalineWatch</div>
            <div className={styles.logoSub}>IV Monitoring System</div>
          </div>
        </div>

        <h1 className={styles.title}>Staff Login</h1>
        <p className={styles.subtitle}>Sign in with your hospital credentials to access the monitoring dashboard.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Staff Email / ID</label>
            <input
              className={styles.input}
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="staff@hospital.com"
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className={styles.demoBox}>
          <div className={styles.demoTitle}>Demo credentials</div>
          <div className={styles.demoRow}><span>nurse@hospital.com</span><span>/ 1234</span></div>
          <div className={styles.demoRow}><span>doctor@hospital.com</span><span>/ 1234</span></div>
          <div className={styles.demoRow}><span>admin@hospital.com</span><span>/ 1234</span></div>
        </div>
      </div>
    </div>
  )
}

function CrossIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
