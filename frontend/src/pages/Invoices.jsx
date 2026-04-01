import { useState } from 'react'
import Layout from '../components/Layout'

const SEED_INVOICES = [
  { id: 1042, client: 'Meridian Consulting', amount: 2400, status: 'Paid',    date: 'Mar 28, 2025', due: 'Apr 11, 2025' },
  { id: 1043, client: 'Apex Partners',       amount: 3200, status: 'Pending', date: 'Apr 1, 2025',  due: 'Apr 15, 2025' },
  { id: 1044, client: 'Sarah Chen',          amount: 1800, status: 'Pending', date: 'Apr 1, 2025',  due: 'Apr 15, 2025' },
  { id: 1041, client: 'DataBridge LLC',      amount: 950,  status: 'Overdue', date: 'Mar 10, 2025', due: 'Mar 24, 2025' },
]

const CLIENTS = ['Meridian Consulting', 'Apex Partners', 'DataBridge LLC', 'Sarah Chen']

function statusBadge(status) {
  if (status === 'Paid')    return <span className="badge badge-green">Paid</span>
  if (status === 'Pending') return <span className="badge badge-yellow">Pending</span>
  if (status === 'Overdue') return <span className="badge badge-red">Overdue</span>
  return <span className="badge badge-gray">{status}</span>
}

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US')
}

export default function Invoices() {
  const [invoices, setInvoices] = useState(SEED_INVOICES)
  const [filter, setFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ client: '', amount: '', notes: '' })
  const [toast, setToast] = useState(null)

  const statuses = ['All', 'Pending', 'Paid', 'Overdue']

  const filtered = filter === 'All' ? invoices : invoices.filter(i => i.status === filter)

  const totals = invoices.reduce((acc, inv) => {
    acc.total += inv.amount
    if (inv.status === 'Pending' || inv.status === 'Overdue') acc.outstanding += inv.amount
    if (inv.status === 'Paid') acc.paid += inv.amount
    return acc
  }, { total: 0, outstanding: 0, paid: 0 })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleCreate(e) {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!form.client || isNaN(amt)) return
    const nextId = Math.max(...invoices.map(i => i.id)) + 1
    const today = new Date()
    const due = new Date(today)
    due.setDate(due.getDate() + 14)
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    setInvoices(prev => [{
      id: nextId,
      client: form.client,
      amount: amt,
      status: 'Pending',
      date: fmt(today),
      due: fmt(due),
    }, ...prev])
    setForm({ client: '', amount: '', notes: '' })
    setShowModal(false)
    showToast(`Invoice #${nextId} created`)
  }

  function markPaid(id) {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'Paid' } : i))
    showToast(`Invoice #${id} marked as paid`)
  }

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
          { label: 'Total Billed',   value: fmtMoney(totals.total) },
          { label: 'Outstanding',    value: fmtMoney(totals.outstanding) },
          { label: 'Collected',      value: fmtMoney(totals.paid) },
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

        {filtered.length === 0 ? (
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
                    <td className="text-muted text-sm font-mono" style={{ fontFamily: 'var(--font-mono)' }}>#{inv.id}</td>
                    <td className="font-medium">{inv.client}</td>
                    <td className="font-semibold">{fmtMoney(inv.amount)}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td className="text-muted text-sm">{inv.date}</td>
                    <td className="text-muted text-sm">{inv.due}</td>
                    <td>
                      {inv.status !== 'Paid' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => markPaid(inv.id)}>
                          Mark Paid
                        </button>
                      )}
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
                  {CLIENTS.map(c => <option key={c}>{c}</option>)}
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
                <button type="submit" className="btn btn-primary">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </Layout>
  )
}
