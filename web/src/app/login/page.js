'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@smartcrop.dev')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/auth/login', { email, password })
      router.push('/admin/dashboard')
      router.refresh()
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#040D09',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Dot grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(74,222,128,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Left decorative panel */}
      <div style={{
        width: '50%',
        background: 'linear-gradient(135deg, #040D09 0%, #061409 50%, #060F0A 100%)',
        borderRight: '1px solid #1A2E1E',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '20%', left: '10%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.34C3.27 20.22 4.41 21.17 5.14 20.42C5.14 20.42 8.35 17 12 17C15.65 17 18 15 18 12C18 10 17 8 17 8Z" fill="#4ADE80"/>
              <path d="M21 3C12 3 8 7 8 12" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#F0FDF4', letterSpacing: '0.02em' }}>SmartCrop</span>
        </div>

        {/* Hero Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.3em', fontWeight: 700, color: '#4ADE80', marginBottom: '20px', textTransform: 'uppercase' }}>
            AI-Powered Diagnostics
          </p>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#F0FDF4', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: '20px' }}>
            Field-grade<br />
            <span style={{ color: '#4ADE80' }}>intelligence</span><br />
            for your crops.
          </h1>
          <p style={{ fontSize: '15px', color: '#4B6358', lineHeight: 1.7, maxWidth: '380px' }}>
            Monitor 38 disease classes across tomato, apple, corn, potato and grape — powered by MobileNet V2 and enriched with real weather data.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '40px', position: 'relative', zIndex: 1 }}>
          {[
            { value: '38', label: 'Disease Classes' },
            { value: '99%', label: 'Model Accuracy' },
            { value: '24/7', label: 'Live Monitoring' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#F0FDF4', letterSpacing: '-0.03em', fontFamily: "'DM Mono', monospace" }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#4B6358', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '14px', color: '#4B6358' }}>Sign in to access the admin platform.</p>
          </div>

          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '24px',
              backgroundColor: 'rgba(248,113,113,0.07)',
              border: '1px solid rgba(248,113,113,0.2)',
              color: '#F87171', fontSize: '13px', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#4B6358', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 14px',
                  backgroundColor: '#0A1510', borderRadius: '8px',
                  border: '1px solid #1A2E1E',
                  color: '#F0FDF4', fontSize: '14px',
                  outline: 'none', transition: 'border-color 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'}
                onBlur={e => e.target.style.borderColor = '#1A2E1E'}
                placeholder="admin@smartcrop.dev"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#4B6358', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px',
                    backgroundColor: '#0A1510', borderRadius: '8px',
                    border: '1px solid #1A2E1E',
                    color: '#F0FDF4', fontSize: '14px',
                    outline: 'none', transition: 'border-color 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'}
                  onBlur={e => e.target.style.borderColor = '#1A2E1E'}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#4B6358', cursor: 'pointer', fontSize: '12px',
                  fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.05em',
                }}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4B6358' }}>
                <input type="checkbox" style={{ accentColor: '#4ADE80' }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: '13px', color: '#4ADE80', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                backgroundColor: loading ? '#166534' : '#4ADE80',
                color: '#0A1510', borderRadius: '8px',
                fontSize: '14px', fontWeight: 700, letterSpacing: '0.03em',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', marginTop: '8px',
                boxShadow: loading ? 'none' : '0 0 20px rgba(74,222,128,0.25)',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.backgroundColor = '#6EE7B7'; e.currentTarget.style.boxShadow = '0 0 28px rgba(74,222,128,0.4)'; }}}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.backgroundColor = '#4ADE80'; e.currentTarget.style.boxShadow = '0 0 20px rgba(74,222,128,0.25)'; }}}
            >
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #1A2E1E', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#2D4A38', textTransform: 'uppercase', letterSpacing: '0.25em', fontWeight: 600 }}>
              Demo Environment · Credentials Pre-filled
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}