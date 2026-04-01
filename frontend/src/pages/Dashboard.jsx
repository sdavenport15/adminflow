import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { clientsApi } from '../services/api'

const MOCK_ACTIVITY = [
  { id: 1, type: 'client',   text: 'New client Sarah Chen onboarded',          time: '2m ago'  },
  { id: 2, type: 'invoice',  text: 'Invoice #1042 paid — $2,400',               time: '1h ago'  },
  { id: 3, type: 'schedule', text: 'Kickoff call with Meridian Consulting',     time: '3h ago'  },
  { id: 4, type: 'invoice',  text: 'Invoice #1041 sent to Apex Partners',       time: 'Yesterday' },
  { id: 5, type: 'client',   text: 'Follow-up email sent to DataBridge LLC',   time: 'Yesterday' },
]

const MOCK_UPCOMING = [
  { id: 1, title: 'Strategy review — Meridian',   date: 'Apr 2, 10:00 AM' },
  { id: 2, title: 'Onboarding call — Sarah Chen', date: 'Apr 2,  2:00 PM' },
  { id: 3, title: 'Monthly retainer — Apex',      date: 'Apr 3,  9:00 AM' },
]

function activityIcon(type) {
  if (type === 'client')   return '👤'
  if (type === 'invoice')  return '🧾'
  if (type === 'schedule') return '📅'
  return '📌'
}

export default function Dashboard() {
  const [clientCount, setClientCount] = useState(0)

  useEffect(() => {
    clientsApi.list()
      .then(r => setClientCount(r.data.count))
      .catch(() => setClientCount(0))
  }, [])

  return (
    <Layout>
      <div className="section-header">
        <div>
          <div className="section-title">Overview</div>
          <div className="section-subtitle">Welcome back — here's what's happening.</div>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Active Clients',     value: clientCount || 0,    change: '+2 this month', up: true  },
          { label: 'Open Invoices',      value: '$8,200',             change: '3 pending',    up: false },
          { label: 'Sessions This Week', value: 7,                    change: '+1 vs last wk',up: true  },
          { label: 'Revenue (Apr)',       value: '$12,400',            change: 'On track',     up: true  },
        ].map((s, i) => (
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
            {MOCK_UPCOMING.map(item => (
              <div key={item.id} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{item.title}</div>
                <div className="text-muted text-sm" style={{ marginTop: '4px' }}>{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
