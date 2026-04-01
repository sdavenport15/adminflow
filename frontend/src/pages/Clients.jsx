import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { clientsAPI } from '../services/api'
import api from '../services/api'

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function statusBadge(status) {
  return status === 'Active'
    ? <span className="badge badge-green">Active</span>
    : <span className="badge badge-gray">Inactive</span>
}

export default function Clients() {
  const [clients,   setClients]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ name: '', contact: '', email: '' })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    try {
      const res = await clientsAPI.list()
      const data = Array.isArray(res.data) ? res.data : (res.data.clients || [])
      setClients(data)
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const filtered = clients.filter(c =>
    (c.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      const payload = {
        name:    form.name,
        contact: form.contact || form.name,
        email:   form.email,
        status:  'Active',
      }
      const res = await clientsAPI.create(payload)
      const created = res.data?.client || res.data || { ...payload, id: Date.now() }
      setClients(prev => [created, ...prev])
      setForm({ name: '', contact: '', email: '' })
      setShowModal(false)
      showToast('Client added successfully')
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to add client', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(client) {
    if (!window.confirm(`Delete "${client.name}"? This cannot be undone.`)) return
    try {
      await clientsAPI.delete(client.id)
      setClients(prev => prev.filter(c => c.id !== client.id))
      showToast('Client deleted')
    } catch {
      showToast('Failed to delete client', 'error')
    }
  }

  // ── Onboard ─────────────────────────────────────────────────────────────────
  async function handleOnboard(client) {
    try {
      await api.post(`/api/onboard/${client.id}`)
      showToast(`Onboarding email sent to ${client.name}`)
    } catch {
      showToast('Failed to trigger onboarding', 'error')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
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

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
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
                    <td>{statusBadge(c.status || 'Active')}</td>
                    <td className="text-muted text-sm">{c.since || c.created_at || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOnboard(c)}
                        >
                          Onboard
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
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
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </Layout>
  )
}
