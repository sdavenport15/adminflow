import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { clientsAPI, invoicesAPI, scheduleAPI } from '../services/api'

const MOCK_ACTIVITY = [
  { id: 1, type: 'client',   text: 'New client Sarah Chen onboarded',        time: '2m ago'    },
  { id: 2, type: 'invoice',  text: 'Invoice #1042 paid — $2,400',             time: '1h ago'    },
  { id: 3, type: 'schedule', text: 'Kickoff call with Meridian Consulting',   time: '3h ago'    },
  { id: 4, type: 'invoice',  text: 'Invoice #1041 sent to Apex Partners',     time: 'Yesterday' },
  { id: 5, type: 'client',   text: 'Follow-up email sent to DataBridge LLC',  time: 'Yesterday' },
]

function activityIcon(type) {
  if (type === 'client')   return '👤'
  if (type === 'invoice')  return '🧾'
  if (type === 'schedule') return '📅'
  return '📌'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US')
}

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] || user?.email || 'there'

  const [clientCount,    setClientCount]    = useState(null)
  const [invoiceTotal,   setInvoiceTotal]   = useState(null)
  const [upcomingCount,  setUpcomingCount]  = useState(null)
  const [upcomingEvents, setUpcomingEvents] = useState([])

  useEffect(() => {
    // Clients count
    clientsAPI.list()
      .then(r => {
        const data = r.data
        // API may return { count, clients } or an array directly
        if (Array.isArray(data))        setClientCount(data.length)
        else if (data.count != null)    setClientCount(data.count)
        else if (Array.isArray(data.clients)) setClientCount(data.clients.length)
        else                            setClientCount(0)
      })
      .catch(() => setClientCount(0))

    // Invoice total (sum of all amounts)
    invoicesAPI.list()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.invoices || [])
        const total = list.reduce((sum, inv) => sum + (inv.amount || 0), 0)
        setInvoiceTotal(total)
      })
      .catch(() => setInvoiceTotal(0))

    // Upcoming appointments
    scheduleAPI.list()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data.events || r.data.appointments || [])
        setUpcomingCount(list.length)
        // Show the first 3 upcoming items in the sidebar
        setUpcomingEvents(list.slice(0, 3))
      })
      .catch(() => { setUpcomingCount(0); setUpcomingEvents([]) })
  }, [])

  // Format upcoming events for display — handle various field shapes
  function fmtEventDate(ev) {
    if (ev.date) return ev.date
    if (ev.day && ev.hour) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const dayLabel = days[(ev.day - 1) % 5] || `Day ${ev.day}`
      const h = ev.hour
      const label = h > 12 ? `${h - 12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`
      return `${dayLabel} ${label}`
    }
    return ''
  }

  const stats = [
    {
      label: 'Active Clients',
      value: clientCount != null ? clientCount : '—',
      change: '+2 this month',
      up: true,
    },
    {
      label: 'Open Invoices',
      value: invoiceTotal != null ? fmtMoney(invoiceTotal) : '—',
      change: 'Total billed',
      up: false,
    },
    {
      label: 'Sessions This Week',
      value: upcomingCount != null ? upcomingCount : '—',
      change: 'Upcoming',
      up: true,
    },
    {
      label: 'Revenue (Apr)',
      value: '$12,400',
      change: 'On track',
      up: true,
    },
  ]

  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">{greeting()}, {firstName}</div>
          <div className="section-subtitle">Here's what's happening today.</div>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.up ? 'up' : 'down'}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <div>
            {MOCK_ACTIVITY.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{activityIcon(item.type)}</div>
                <div style={{ flex: 1, fontSize: '14px' }}>{item.text}</div>
                <div className="text-muted text-xs" style={{ whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((ev, i) => (
                <div key={ev.id || i} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{ev.title}</div>
                  <div className="text-muted text-sm" style={{ marginTop: '4px' }}>{fmtEventDate(ev)}</div>
                </div>
              ))
            ) : (
              [
                { id: 1, title: 'Strategy review — Meridian',   date: 'Apr 2, 10:00 AM' },
                { id: 2, title: 'Onboarding call — Sarah Chen', date: 'Apr 2,  2:00 PM' },
                { id: 3, title: 'Monthly retainer — Apex',      date: 'Apr 3,  9:00 AM' },
              ].map(item => (
                <div key={item.id} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.title}</div>
                  <div className="text-muted text-sm" style={{ marginTop: '4px' }}>{item.date}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
