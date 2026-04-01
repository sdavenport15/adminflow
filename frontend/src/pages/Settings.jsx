import { useState } from 'react'
import Layout from '../components/Layout'

export default function Settings() {
  const [profile, setProfile] = useState({
    name: 'Scott Davenport',
    email: 'scott@adminflow.io',
    company: 'AdminFlow',
    timezone: 'America/Los_Angeles',
  })
  const [notifications, setNotifications] = useState({
    invoicePaid: true,
    newClient: true,
    appointmentReminder: true,
    weeklyDigest: false,
  })
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleProfileSave(e) {
    e.preventDefault()
    showToast('Profile saved')
  }

  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Settings</div>
          <div className="section-subtitle">Manage your account and preferences</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, maxWidth: 620 }}>
        {/* Profile */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Profile</span>
          </div>
          <form onSubmit={handleProfileSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input
                  className="form-input"
                  value={profile.company}
                  onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select
                  className="form-input"
                  value={profile.timezone}
                  onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                >
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="submit" className="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Notifications</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'invoicePaid',          label: 'Invoice paid',           desc: 'Get notified when a client pays an invoice' },
              { key: 'newClient',            label: 'New client',             desc: 'Get notified when a new client is added' },
              { key: 'appointmentReminder',  label: 'Appointment reminders',  desc: '24h reminder before scheduled sessions' },
              { key: 'weeklyDigest',         label: 'Weekly digest',          desc: 'Weekly summary of your key metrics' },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                  <div className="text-muted text-sm">{desc}</div>
                </div>
                <button
                  onClick={() => {
                    setNotifications(n => ({ ...n, [key]: !n[key] }))
                    showToast('Preferences updated')
                  }}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 99,
                    border: 'none',
                    background: notifications[key] ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    left: notifications[key] ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--color-danger)' }}>Danger Zone</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Reset all data</div>
              <div className="text-muted text-sm">Permanently deletes all clients, invoices, and appointments.</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => showToast('Action requires confirmation — coming soon', 'error')}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="toast success">{toast}</div>}
    </Layout>
  )
}
