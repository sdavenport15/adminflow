import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { invoicesAPI, clientsAPI } from '../services/api'

function statusBadge(status) {
  if (status === 'Paid')    return <span className="badge badge-green">Paid</span>
  if (status === 'Pending') return <span className="badge badge-yellow">Pending</span>
  if (status === 'Overdue') return <span className="badge badge-red">Overdue</span>
  return <span className="badge badge-gray">{status}</span>
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US')
}

export default function Invoices() {
  const [invoices,  setInvoices]  = useState([])
  const [clients,   setClients]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ client: '', amount: '', notes: '' })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)

  const statuses = ['All', 'Pending', 'Paid', 'Overdue']

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInvoices()
    fetchClients()
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    try {
      const res  = await invoicesAPI.list()
      const data = Array.isArray(res.data) ? res.data : (res.data.invoices || [])
      setInvoices(data)
    } catch {
      setInvoices([])
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
  const filtered = filter === 'All' ? invoices : invoices.filter(i => i.status === filter)

  const totals = invoices.reduce((acc, inv) => {
    acc.total += inv.amount || 0
    if (inv.status === 'Pending' || inv.status === 'Overdue') acc.outstanding += inv.amount || 0
    if (inv.status === 'Paid')  acc.paid += inv.amount || 0
    return acc
  }, { total: 0, outstanding: 0, paid: 0 })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!form.client || isNaN(amt)) return
    setSaving(true)
    try {
      const today = new Date()
      const due   = new Date(today); due.setDate(due.getDate() + 14)
      const fmt   = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const payload = {
        client: form.client,
        amount: amt,
        notes:  form.notes,
        status: 'Pending',
        date:   fmt(today),
        due:    fmt(due),
      }
      const res     = await invoicesAPI.create(payload)
      const created = res.data?.invoice || res.data || { ...payload, id: Date.now() }
      setInvoices(prev => [created, ...prev])
      setForm({ client: '', amount: '', notes: '' })
      setShowModal(false)
      showToast(`Invoice created`)
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to create invoice', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Get Pay Link ─────────────────────────────────────────────────────────────
  async function handlePayLink(inv) {
    try {
      const res = await invoicesAPI.getPayLink(inv.id)
      const url = res.data?.url || res.data?.pay_link
      if (url) window.open(url, '_blank')
      else     showToast('No pay link returned', 'error')
    } catch {
      showToast('Failed to get pay link', 'error')
    }
  }

  // ── Send Reminder ────────────────────────────────────────────────────────────
  async function handleRemind(inv) {
    try {
      await invoicesAPI.remind(inv.id)
      showToast(`Reminder sent for Invoice #${inv.id}`)
    } catch {
      showToast('Failed to send reminder', 'error')
    }
  }

  // ── Download PDF ─────────────────────────────────────────────────────────────
  function handleDownloadPDF(inv) {
    // Opens the PDF endpoint in a new tab; browser handles the download
    window.open(`/api/invoices/${inv.id}/pdf`, '_blank')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Invoices</div>
          <div className="section-subtitle">{invoices.length} invoices total</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Create Invoice
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Billed',  value: fmtMoney(totals.total) },
          { label: 'Outstanding',   value: fmtMoney(totals.outstanding) },
          { label: 'Collected',     value: fmtMoney(totals.paid) },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 8 }}>
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 99,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: filter === s ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: filter === s ? 'white' : 'var(--color-text-muted)',
                  transition: 'background 0.15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Loading invoices…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>No invoices</h3>
            <p>Create your first invoice to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td className="text-muted text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                      #{inv.id}
                    </td>
                    <td className="font-medium">{inv.client}</td>
                    <td className="font-semibold">{fmtMoney(inv.amount)}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td className="text-muted text-sm">{inv.date}</td>
                    <td className="text-muted text-sm">{inv.due}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePayLink(inv)}
                          title="Get Pay Link"
                        >
                          Pay Link
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDownloadPDF(inv)}
                          title="Download PDF"
                        >
                          PDF
                        </button>
                        {inv.status !== 'Paid' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemind(inv)}
                            title="Send Reminder"
                          >
                            Remind
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Invoice</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select
                  className="form-input"
                  value={form.client}
                  onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  required
                >
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount ($) *</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Services rendered…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Invoice'}
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
