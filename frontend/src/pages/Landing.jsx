import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { betaApi } from '../services/api'

export default function Landing() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '' })
  const [state, setState] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    if (!form.name || !form.email) return
    setState('loading')
    try {
      await betaApi.signup(form)
      setState('success')
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Something went wrong. Try again.')
      setState('error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18 }}>
          <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>A</div>
          AdminFlow
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
            App Demo
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => document.getElementById('beta-form').scrollIntoView({ behavior: 'smooth' })}>
            Get Early Access
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '96px 48px 80px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)', borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 28 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }}></span>
          Now in Private Beta
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24 }}>
          Run your client business<br />
          <span style={{ color: 'var(--color-primary)' }}>on autopilot.</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--color-text-muted)', lineHeight: 1.7, maxWidth: 620, margin: '0 auto 40px' }}>
          AdminFlow handles the ops work that drains your day — client onboarding, scheduling, invoicing, and follow-ups — so you can focus on the work that actually grows your business.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => document.getElementById('beta-form').scrollIntoView({ behavior: 'smooth' })}>
            Join the Beta &rarr;
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/dashboard')}>
            See it live
          </button>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 48, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { stat: '3 hrs',   label: 'saved per client/week'  },
            { stat: '2x',      label: 'faster invoice turnaround' },
            { stat: '100%',    label: 'of follow-ups automated'   },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--color-text)' }}>{stat}</div>
              <div className="text-muted text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '80px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 14 }}>Everything in one place</h2>
            <p style={{ fontSize: 16, color: 'var(--color-text-muted)', maxWidth: 500, margin: '0 auto' }}>
              Stop juggling five tools. AdminFlow gives you one clean workspace for your entire client operation.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '👤',
                title: 'Client Management',
                desc: 'Add clients, track history, and trigger onboarding workflows in a single click.',
              },
              {
                icon: '📅',
                title: 'Smart Scheduling',
                desc: 'Visual weekly calendar. Schedule and manage sessions without the back-and-forth.',
              },
              {
                icon: '🧾',
                title: 'Invoicing',
                desc: 'Create invoices in seconds. Track paid, pending, and overdue — all in one view.',
              },
              {
                icon: '⚡',
                title: 'Automation',
                desc: 'Auto send onboarding emails, follow-ups, and payment reminders so nothing slips.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px 20px' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 14 }}>Built for solo operators and small teams</h2>
          <p style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 48, lineHeight: 1.7 }}>
            Coaches, consultants, fractional executives, and freelancers — if you manage clients, AdminFlow was made for you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' }}>
            {[
              { step: '01', title: 'Add your clients',      desc: 'Import or manually add clients. One-click onboarding sends a welcome sequence automatically.' },
              { step: '02', title: 'Schedule sessions',     desc: 'Drop appointments onto the calendar. Reminders go out — no separate tool needed.' },
              { step: '03', title: 'Send invoices fast',    desc: 'Create a polished invoice in under 30 seconds. Track everything from one dashboard.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', height: 'fit-content', letterSpacing: '0.05em', flexShrink: 0 }}>
                  {step}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta Signup */}
      <section id="beta-form" style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '80px 48px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12 }}>
            Get early access
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', marginBottom: 36, lineHeight: 1.7 }}>
            We're accepting a small group of beta users. Drop your info below and we'll be in touch when your spot opens up.
          </p>

          {state === 'success' ? (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-lg)', padding: '32px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>You're on the list!</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                We'll reach out to <strong>{form.email}</strong> when your spot is ready.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                className="form-input"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                style={{ padding: '12px 16px', fontSize: 15, background: 'var(--color-surface-2)' }}
              />
              <input
                className="form-input"
                type="email"
                placeholder="Your email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                style={{ padding: '12px 16px', fontSize: 15, background: 'var(--color-surface-2)' }}
              />
              {state === 'error' && (
                <div style={{ fontSize: 13, color: 'var(--color-danger)', textAlign: 'left' }}>{errorMsg}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                disabled={state === 'loading'}
              >
                {state === 'loading' ? 'Submitting…' : 'Request Early Access →'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                No spam. No credit card. Just early access.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 48px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>
          <div style={{ width: 24, height: 24, background: 'var(--color-primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 12 }}>A</div>
          AdminFlow
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} AdminFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
