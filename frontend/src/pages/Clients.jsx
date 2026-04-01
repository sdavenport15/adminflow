import { useState } from 'react'
import Layout from '../components/Layout'

const SEED_CLIENTS = [
  { id: 1, name: 'Meridian Consulting',  contact: 'James Park',     email: 'james@meridian.co',    status: 'Active',   since: 'Jan 2025' },
  { id: 2, name: 'Apex Partners',        contact: 'Rita Alvarez',   email: 'rita@apexpartners.io', status: 'Active',   since: 'Mar 2025' },
  { id: 3, name: 'DataBridge LLC',       contact: 'Tom Weston',     email: 'tom@databridge.ai',    status: 'Inactive', since: 'Nov 2024' },
  { id: 4, name: 'Sarah Chen',           contact: 'Sarah Chen',     email: 'sarah@chen.me',        status: 'Active',   since: 'Mar 2025' },
]

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function statusBadge(status) {
  return status === 'Active'
    ? <span className="badge badge-green">Active</span>
    : <span className="badge badge-gray">Inactive</span>
}

export default function Clients() {
  const [clients, setClients] = useState(SEED_CLIENTS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', email: '' })
  const [toast, setToast] = useState(null)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!form.name || !form.email) return
    const newClient = {
      id: Date.now(),
      name: form.name,
      contact: form.contact || form.name,
      email: form.email,
      status: 'Active',
      since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    }
    setClients(prev => [newClient, ...prev])
    setForm({ name: '', contact: '', email: '' })
    setShowModal(false)
    showToast('Client added successfully')
  }

  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Clients</div>
          <div className="section-subtitle">{clients.length} total clients</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Client
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No clients found</h3>
            <p>Add your first client to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Client Since</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar sm">{initials(c.name)}</div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{c.contact}</td>
                    <td className="text-muted">{c.email}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td className="text-muted text-sm">{c.since}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => showToast('Onboarding email triggered')}
                      >
                        Onboard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Client</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Company / Client Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Acme Corp"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Primary Contact</label>
                <input
                  className="form-input"
                  placeholder="e.g. Jane Smith"
                  value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="contact@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </Layout>
  )
}
