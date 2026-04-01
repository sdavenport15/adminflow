import { useState } from 'react'
import Layout from '../components/Layout'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am–6pm

const SEED_EVENTS = [
  { id: 1, title: 'Strategy Review — Meridian', client: 'Meridian Consulting', day: 2, hour: 10, duration: 1 },
  { id: 2, title: 'Onboarding Call',             client: 'Sarah Chen',          day: 2, hour: 14, duration: 1 },
  { id: 3, title: 'Monthly Retainer Call',        client: 'Apex Partners',       day: 3, hour: 9,  duration: 1 },
  { id: 4, title: 'Check-in',                     client: 'DataBridge LLC',      day: 4, hour: 11, duration: 1 },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const DAY_LABELS = ['Apr 7', 'Apr 8', 'Apr 9', 'Apr 10', 'Apr 11']

const CLIENTS = ['Meridian Consulting', 'Apex Partners', 'DataBridge LLC', 'Sarah Chen']

export default function Schedule() {
  const [events, setEvents] = useState(SEED_EVENTS)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', client: '', day: 1, hour: 9 })
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleCreate(e) {
    e.preventDefault()
    setEvents(prev => [...prev, { ...form, id: Date.now(), duration: 1 }])
    setShowModal(false)
    setForm({ title: '', client: '', day: 1, hour: 9 })
    showToast('Appointment scheduled')
  }

  function eventsForCell(day, hour) {
    return events.filter(ev => ev.day === day && ev.hour === hour)
  }

  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Schedule</div>
          <div className="section-subtitle">Week of Apr 7 – 11, 2025</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Appointment
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                          <div key={ev.id} style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginBottom: 3, cursor: 'default' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1.3 }}>{ev.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{ev.client}</div>
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
      </div>

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
                  {CLIENTS.map(c => <option key={c}>{c}</option>)}
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
                <button type="submit" className="btn btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </Layout>
  )
}
