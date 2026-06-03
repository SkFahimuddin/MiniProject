import { useState, useEffect } from 'react'
import axios from 'axios'
import { getToken } from '../context/AuthContext.jsx'
import Topbar from '../components/Topbar.jsx'
import styles from './AdminPage.module.css'

function api(method, url, data) {
  const token = getToken()
  return axios({ method, url, data, headers: { Authorization: `Bearer ${token}` } })
}

// ─── BED FORM ─────────────────────────────────────────────────────────────
const EMPTY_BED = { bedId: '', espIdIR: '', espIdColor: '', doctorName: '', patientName: '', diagnosis: '', ward: 'General Ward', ivActive: false }

function BedForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_BED)
  const [err, setErr]   = useState('')
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    setErr('')
    setSaving(true)
    try {
      if (initial?._id) {
        const { data } = await api('put', `/api/admin/beds/${initial._id}`, form)
        onSave(data)
      } else {
        const { data } = await api('post', '/api/admin/beds', form)
        onSave(data)
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Error saving bed.')
    }
    setSaving(false)
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{initial?._id ? 'Edit Bed' : 'Add New Bed'}</h3>
      <div className={styles.formGrid}>
        <Field label="Bed ID *" placeholder="e.g. B-101" value={form.bedId} onChange={v => set('bedId', v)} />
        <Field label="Ward" placeholder="General Ward" value={form.ward} onChange={v => set('ward', v)} />
        <Field label="Doctor Name" placeholder="Dr. Full Name" value={form.doctorName} onChange={v => set('doctorName', v)} />
        <Field label="Patient Name" placeholder="Patient full name" value={form.patientName} onChange={v => set('patientName', v)} />
        <Field label="Diagnosis" placeholder="e.g. Post-surgery recovery" value={form.diagnosis} onChange={v => set('diagnosis', v)} />
        <Field label="ESP ID — IR Sensor" placeholder="e.g. ESP_IR_01" value={form.espIdIR} onChange={v => set('espIdIR', v)} />
        <Field label="ESP ID — Colour Sensor" placeholder="e.g. ESP_COLOR_01" value={form.espIdColor} onChange={v => set('espIdColor', v)} />
        <div className={styles.checkRow}>
          <input type="checkbox" id="ivActive" checked={form.ivActive} onChange={e => set('ivActive', e.target.checked)} />
          <label htmlFor="ivActive">IV Active</label>
        </div>
      </div>
      {err && <div className={styles.errMsg}>{err}</div>}
      <div className={styles.formActions}>
        <button className={styles.btnSave} onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Bed'}</button>
        <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── NURSE FORM ────────────────────────────────────────────────────────────
const EMPTY_NURSE = { name: '', email: '', password: '', ward: 'General Ward' }

function NurseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, password: '' } : EMPTY_NURSE)
  const [err, setErr]   = useState('')
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    setErr('')
    if (!initial && !form.password) { setErr('Password is required for new nurse.'); return }
    setSaving(true)
    try {
      if (initial?._id) {
        const payload = { name: form.name, email: form.email, ward: form.ward }
        if (form.password) payload.password = form.password
        const { data } = await api('put', `/api/admin/nurses/${initial._id}`, payload)
        onSave(data)
      } else {
        const { data } = await api('post', '/api/admin/nurses', form)
        onSave(data)
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Error saving nurse.')
    }
    setSaving(false)
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{initial?._id ? 'Edit Nurse' : 'Add Nurse Account'}</h3>
      <div className={styles.formGrid}>
        <Field label="Full Name *" placeholder="Nurse Name" value={form.name} onChange={v => set('name', v)} />
        <Field label="Email / Login ID *" placeholder="nurse@hospital.com" value={form.email} onChange={v => set('email', v)} />
        <Field label={initial ? 'New Password (leave blank to keep)' : 'Password *'} type="password" placeholder="••••••••" value={form.password} onChange={v => set('password', v)} />
        <Field label="Ward" placeholder="General Ward" value={form.ward} onChange={v => set('ward', v)} />
      </div>
      {err && <div className={styles.errMsg}>{err}</div>}
      <div className={styles.formActions}>
        <button className={styles.btnSave} onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save Nurse'}</button>
        <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, type = 'text' }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// ─── MAIN ADMIN PAGE ───────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab]         = useState('beds') // 'beds' | 'nurses'
  const [beds, setBeds]       = useState([])
  const [nurses, setNurses]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [bRes, nRes] = await Promise.all([
        api('get', '/api/beds'),
        api('get', '/api/admin/nurses'),
      ])
      setBeds(bRes.data)
      setNurses(nRes.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function openAdd()       { setEditItem(null); setShowForm(true) }
  function openEdit(item)  { setEditItem(item); setShowForm(true) }
  function closeForm()     { setShowForm(false); setEditItem(null) }

  function handleSavedBed(bed) {
    setBeds(prev => {
      const idx = prev.findIndex(b => b._id === bed._id)
      return idx >= 0 ? prev.map(b => b._id === bed._id ? bed : b) : [...prev, bed]
    })
    closeForm()
  }

  function handleSavedNurse(nurse) {
    setNurses(prev => {
      const idx = prev.findIndex(n => n._id === nurse._id)
      return idx >= 0 ? prev.map(n => n._id === nurse._id ? nurse : n) : [...prev, nurse]
    })
    closeForm()
  }

  async function doDelete() {
    if (!deleteConfirm) return
    try {
      if (tab === 'beds')   { await api('delete', `/api/admin/beds/${deleteConfirm._id}`);   setBeds(prev => prev.filter(b => b._id !== deleteConfirm._id)) }
      if (tab === 'nurses') { await api('delete', `/api/admin/nurses/${deleteConfirm._id}`); setNurses(prev => prev.filter(n => n._id !== deleteConfirm._id)) }
    } catch (e) { alert(e.response?.data?.error || 'Delete failed.') }
    setDeleteConfirm(null)
  }

  return (
    <div className={styles.page}>
      <Topbar />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Admin Panel</h1>
            <p className={styles.pageSub}>Manage beds, ESP assignments, doctors, and nurse accounts</p>
          </div>
          {!showForm && (
            <button className={styles.btnAdd} onClick={openAdd}>
              + {tab === 'beds' ? 'Add Bed' : 'Add Nurse'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={tab === 'beds'   ? styles.tabActive : styles.tab} onClick={() => { setTab('beds');   closeForm() }}>🛏 Beds ({beds.length})</button>
          <button className={tab === 'nurses' ? styles.tabActive : styles.tab} onClick={() => { setTab('nurses'); closeForm() }}>👩‍⚕️ Nurses ({nurses.length})</button>
        </div>

        {/* Form */}
        {showForm && (
          tab === 'beds'
            ? <BedForm   initial={editItem} onSave={handleSavedBed}   onCancel={closeForm} />
            : <NurseForm initial={editItem} onSave={handleSavedNurse} onCancel={closeForm} />
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className={styles.deleteModal}>
            <div className={styles.deleteBox}>
              <div className={styles.deleteTitle}>Confirm Delete</div>
              <div className={styles.deleteSub}>
                Delete <strong>{deleteConfirm.bedId || deleteConfirm.name}</strong>? This cannot be undone.
              </div>
              <div className={styles.deleteActions}>
                <button className={styles.btnDelete} onClick={doDelete}>Yes, Delete</button>
                <button className={styles.btnCancel} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : tab === 'beds' ? (
          <div className={styles.tableWrap}>
            {beds.length === 0 ? (
              <div className={styles.empty}>No beds yet. Click "Add Bed" to create one.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Bed ID</th>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Diagnosis</th>
                    <th>Ward</th>
                    <th>ESP — IR</th>
                    <th>ESP — Colour</th>
                    <th>IV</th>
                    <th>IR</th>
                    <th>Colour</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map(bed => (
                    <tr key={bed._id}>
                      <td><strong>{bed.bedId}</strong></td>
                      <td>{bed.doctorName || <span className={styles.na}>—</span>}</td>
                      <td>{bed.patientName || <span className={styles.na}>Vacant</span>}</td>
                      <td>{bed.diagnosis || <span className={styles.na}>—</span>}</td>
                      <td>{bed.ward}</td>
                      <td><code className={styles.esp}>{bed.espIdIR || '—'}</code></td>
                      <td><code className={styles.esp}>{bed.espIdColor || '—'}</code></td>
                      <td><span className={bed.ivActive ? styles.ivOn : styles.ivOff}>{bed.ivActive ? 'ON' : 'OFF'}</span></td>
                      <td><SensorBadge value={bed.ir} /></td>
                      <td><SensorBadge value={bed.color} /></td>
                      <td className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => openEdit(bed)}>Edit</button>
                        <button className={styles.btnDel}  onClick={() => setDeleteConfirm(bed)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            {nurses.length === 0 ? (
              <div className={styles.empty}>No nurse accounts yet. Click "Add Nurse" to create one.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email / Login ID</th>
                    <th>Ward</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nurses.map(nurse => (
                    <tr key={nurse._id}>
                      <td><strong>{nurse.name}</strong></td>
                      <td>{nurse.email}</td>
                      <td>{nurse.ward}</td>
                      <td>{new Date(nurse.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => openEdit(nurse)}>Edit</button>
                        <button className={styles.btnDel}  onClick={() => setDeleteConfirm(nurse)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SensorBadge({ value }) {
  const map = {
    crit:   { cls: 'badgeCrit',   text: 'CRIT'  },
    warn:   { cls: 'badgeWarn',   text: 'WARN'  },
    normal: { cls: 'badgeOk',     text: 'OK'    },
    off:    { cls: 'badgeOff',    text: 'OFF'   },
  }
  const { cls, text } = map[value] || map.off
  return <span className={styles[cls]}>{text}</span>
}
