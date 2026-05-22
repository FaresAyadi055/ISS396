'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Sprout, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      })

      if (response.data.user.role !== 'admin') {
        setError('You do not have admin access')
        setLoading(false)
        return
      }

      // Store token for API calls
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token)
      }

      // Redirect to dashboard
      router.push('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col bg-surface-elevated px-4 sm:px-6 md:flex-row md:px-8 lg:px-10">
      {/* Form column */}
      <main className="relative flex w-full flex-1 items-center justify-center overflow-y-auto p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-white shadow-md ring-1 ring-black/5">
              <Sprout className="h-10 w-10" aria-hidden />
            </div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-ink">Crop Diagnostic</h1>
            <p className="text-sm font-medium text-ink-tertiary">Admin Dashboard Login</p>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-ink">Welcome back!</h2>
            <p className="mt-1 text-sm text-ink-tertiary">
              Please enter your credentials to access the admin panel
            </p>
          </div>

          {/* Error Alert - Better spacing */}
          {error && (
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-error" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-red-900">Login failed</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-ink-secondary" htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-2 border-outline bg-surface-elevated px-4 py-3 text-ink transition placeholder:text-ink-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-ink-tertiary"
                placeholder="admin@example.com"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-ink-secondary" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-2 border-outline bg-surface-elevated px-4 py-3 pr-12 text-ink transition placeholder:text-ink-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-ink-tertiary"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-tertiary transition hover:bg-surface-muted hover:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-brand/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-strong text-brand focus:ring-brand"
                />
                <span className="text-ink-secondary">Remember me for 30 days</span>
              </label>
              <button type="button" className="font-semibold text-brand hover:text-brand-dark transition">
                Forgot password?
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-200/80 transition duration-200 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  'Login to Dashboard'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 overflow-hidden rounded-xl border border-outline bg-surface-elevated">
            <div className="flex items-center border-b border-outline bg-gray-50 px-4 py-2">
              <span className="mr-2 h-2 w-2 rounded-full bg-brand" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Demo Credentials
              </span>
            </div>
            <div className="space-y-2 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-tertiary">Email:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">admin@example.com</span>
                  <button
                    type="button"
                    onClick={() => setEmail('admin@example.com')}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    Fill
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-tertiary">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">password123</span>
                  <button
                    type="button"
                    onClick={() => setPassword('password123')}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    Fill
                  </button>
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-12 text-center text-xs text-ink-tertiary">
            © {new Date().getFullYear()} Crop Diagnostic. All rights reserved.
          </footer>
        </div>
      </main>

      <aside
        className="relative hidden min-h-[420px] w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-brand-900 p-12 text-white lg:flex lg:w-1/2 lg:min-h-screen lg:p-16"
        aria-hidden
      >
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="animate-blob absolute -left-4 top-0 h-72 w-72 rounded-full bg-white mix-blend-soft-light blur-3xl" />
          <div className="animate-blob animation-delay-2000 absolute -right-4 top-24 h-72 w-72 rounded-full bg-emerald-300/40 blur-3xl" />
          <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <Sprout className="mb-6 h-24 w-24 text-white/90 drop-shadow-md" aria-hidden />
          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Crop Diagnostic Admin Panel
          </h2>
          <p className="mb-10 max-w-md text-lg leading-relaxed text-emerald-50/90">
            Monitor and manage your agricultural diagnostic system with our comprehensive admin dashboard
          </p>

          <ul className="w-full space-y-4 text-left">
            {[
              'Real-time crop health monitoring',
              'Manage farmer profiles and records',
              'Generate detailed diagnostic reports',
              'Track system performance metrics',
              'Multi-language support coming soon',
            ].map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="font-medium text-white">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}