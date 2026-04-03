import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { scheduleAPI, clientsAPI, gcalAPI } from '../services/api'

const HOURS     = Array.from({ length: 11 }, (_, i) => i + 8) // 8am–6pm
const DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_LABELS = ['Apr 7', 'Apr 8', 'Apr 9', 'Apr 10', 'Apr 11']

export default function Schedule() {
  const [events,    setEvents]    = useState([])
  const [clients,   setClients]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ title: '', client: '', day: 1, hour: 9 })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchEvents()
    fetchClients()
    fetchGcalStatus()

    // Handle redirect back from Google OAuth
    const gcalParam = searchParams.get('gcal')
    if (gcalParam === 'connected') {
      showToast('Google Calendar connected!')
      setGcalConnected(true)
      setSearchParams({})
    } else if (gcalParam === 'error') {
      showToast('Google Calendar connection failed. Try again.')
      setSearchParams({})
    }
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const res  = await scheduleAPI.list()
      const data = Array.isArray(res.data) ? res.data : (res.data.events || res.data.appointments || [])
      setEvents(data)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchClients() {
    try {
      const res  = await clientsAPI.list()
      const data = Array.isArray(res.data) ? res.data : (res.data.clients || [])
      setClients(data.map(c => c.name))
    } catch {
      setClients([])
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function eventsForCell(day, hour) {
    return events.filter(ev => ev.day === day && ev.hour === hour)
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, duration: 1 }
      const res     = await scheduleAPI.create(payload)
      const created = res.data?.event || res.data?.appointment || res.data || { ...payload, id: Date.now() }
      setEvents(prev => [...prev, created])
      setShowModal(false)
      setForm({ title: '', client: '', day: 1, hour: 9 })
      showToast('Appointment scheduled')
    } catch (err) {
      showToast('Failed to schedule appointment')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(ev) {
    try {
      await scheduleAPI.delete(ev.id)
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      showToast('Appointment removed')
    } catch {
      showToast('Failed to delete appointment')
    }
  }

  async function fetchGcalStatus() {
    try {
      const res = await gcalAPI.status()
      setGcalConnected(res.data?.connected === true)
    } catch {
      setGcalConnected(false)
    }
  }

  // ── Google Calendar connect ──────────────────────────────────────────────────
  function handleGcalConnect() {
    window.location.href = '/api/google-calendar/auth'
  }

  async function handleGcalDisconnect() {
    try {
      await gcalAPI.disconnect()
      setGcalConnected(false)
      showToast('Google Calendar disconnected')
    } catch {
      showToast('Failed to disconnect')
    }
  }

  async function handleSyncToGcal(ev) {
    if (!gcalConnected) { showToast('Connect Google Calendar first'); return }
    setSyncing(prev => ({ ...prev, [ev.id]: true }))
    try {
      await gcalAPI.sync(ev.id)
      showToast('Synced to Google Calendar!')
    } catch {
      showToast('Sync failed — try again')
    } finally {
      setSyncing(prev => ({ ...prev, [ev.id]: false }))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Schedule</div>
          <div className="section-subtitle">Week of Apr 7 – 11, 2025</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Google Calendar connect button */}
          {gcalConnected ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              color: '#10b981',
            }}>
              <span style={{ fontSize: 15 }}>✓</span> Google Calendar Connected
              <button
                onClick={handleGcalDisconnect}
                style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#10b981', textDecoration: 'underline' }}
              >Disconnect</button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleGcalConnect}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              title="Sync your sessions with Google Calendar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Connect Google Calendar
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Appointment
          </button>
        </div>
      </div>

      {/* Google Calendar sync note */}
      {!gcalConnected && (
        <div style={{
          marginBottom: 16,
          padding: '10px 14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>📅</span>
          Sync your sessions with Google Calendar — click "Connect Google Calendar" above to get started.
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Loading schedule…
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th style={{ width: 64, padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--color-text-faint)', borderBottom: '1px solid var(--color-border)', fontWeight: 500 }}>
                    Time
                  </th>
                  {DAYS.map((d, i) => (
                    <th key={d} style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 13 }}>
                      <div>{d}</div>
                      <div style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>{DAY_LABELS[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td style={{ padding: '0 10px', textAlign: 'right', fontSize: 12, color: 'var(--color-text-faint)', verticalAlign: 'top', paddingTop: 6, borderBottom: '1px solid var(--color-border)', width: 64 }}>
                      {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                    </td>
                    {DAYS.map((_, di) => {
                      const cell = eventsForCell(di + 1, hour)
                      return (
                        <td key={di} style={{ borderBottom: '1px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', verticalAlign: 'top', padding: '4px', minHeight: 48, height: 52 }}>
                          {cell.map(ev => (
                            <div
                              key={ev.id}
                              style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginBottom: 3, cursor: 'default', position: 'relative' }}
                              title="Click × to delete"
                            >
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1.3, paddingRight: 16 }}>{ev.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{ev.client}</div>
                              {gcalConnected && !ev.google_event_id && (
                                <button
                                  onClick={() => handleSyncToGcal(ev)}
                                  disabled={syncing[ev.id]}
                                  style={{ fontSize: 10, marginTop: 3, background: 'none', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 3, padding: '1px 5px', cursor: 'pointer', color: 'var(--color-primary)' }}
                                  title="Add to Google Calendar"
                                >
                                  {syncing[ev.id] ? '…' : '+ GCal'}
                                </button>
                              )}
                              {ev.google_event_id && (
                                <div style={{ fontSize: 10, marginTop: 3, color: '#10b981' }}>✓ In GCal</div>
                              )}
                              <button
                                onClick={() => handleDelete(ev)}
                                style={{
                                  position: 'absolute',
                                  top: 3, right: 4,
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  color: 'var(--color-text-faint)',
                                  lineHeight: 1,
                                  padding: '1px 2px',
                                }}
                                title="Delete appointment"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Appointment</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Strategy Review"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client</label>
                <select className="form-input" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select className="form-input" value={form.day} onChange={e => setForm(f => ({ ...f, day: +e.target.value }))}>
                    {DAYS.map((d, i) => <option key={d} value={i + 1}>{d} ({DAY_LABELS[i]})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <select className="form-input" value={form.hour} onChange={e => setForm(f => ({ ...f, hour: +e.target.value }))}>
                    {HOURS.map(h => (
                      <option key={h} value={h}>
                        {h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Scheduling…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </Layout>
  )
}
