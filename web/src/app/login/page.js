'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Mail, Lock, Sprout, Eye, EyeOff, AlertCircle } from 'lucide-react'
import Image from 'next/image'

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
        return
      }

      // Store token if remember me is checked
      if (rememberMe && response.data.token) {
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
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo and Brand - Increased bottom margin */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-8 shadow-lg">
              <Sprout className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Crop Diagnostic
            </h1>
            <p className="text-gray-500 text-lg">Admin Dashboard Login</p>
          </div>

          {/* Welcome Message - Increased spacing */}
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Welcome back!
            </h2>
            <p className="text-gray-500">
              Please enter your credentials to access the admin panel
            </p>
          </div>

          {/* Error Alert - Better spacing */}
          {error && (
            <div className="mb-10 p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-base font-medium text-red-800 mb-1">Login Failed</p>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form - Increased spacing between fields */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field - Fixed icon positioning with more left spacing */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-3">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">

                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-5 py-5 border-2 border-gray-200 rounded-xl text-lg
                           focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100
                           disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  placeholder="admin@example.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password Field - Fixed icon positioning with more left spacing */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-3">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-5 border-2 border-gray-200 rounded-xl text-lg
                           focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100
                           disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password - Increased vertical spacing */}
            <div className="flex items-center justify-between pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 border-2 border-gray-300 rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-base text-gray-600">Remember me for 30 days</span>
              </label>
              <button
                type="button"
                className="text-base text-green-600 hover:text-green-700 font-medium transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button - Increased height and better spacing */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-6 px-6 rounded-xl 
                         text-lg font-semibold
                         hover:from-green-700 hover:to-green-800 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2
                         transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]
                         shadow-lg hover:shadow-xl"
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
              <br/>
            </div>
          </form>

          {/* Demo Credentials Card - Improved spacing and height */}
          <div className="mt-12 p-8 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border-2 border-gray-200">
            <p className="text-base font-medium text-gray-700 mb-5 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Demo Credentials
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-gray-500 min-w-[70px] text-base">Email:</span>
                <code className="flex-1 text-gray-800 font-mono text-base">
                  admin@example.com
                </code>
                <button
                  onClick={() => setEmail('admin@example.com')}
                  className="text-sm bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg font-medium transition"
                >
                  Fill
                </button>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-gray-500 min-w-[70px] text-base">Password:</span>
                <code className="flex-1 text-gray-800 font-mono text-base">
                  password123
                </code>
                <button
                  onClick={() => setPassword('password123')}
                  className="text-sm bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg font-medium transition"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>

                <br/>

          <p className="mt-12 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Crop Diagnostic. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Hero Image / Features */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-green-600 to-green-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Content - Increased spacing */}
        <div className="relative h-full flex flex-col items-center justify-center text-white p-12">
          <div className="max-w-md text-center">
            <div className="mb-12">
              <Sprout className="w-32 h-32 mx-auto text-white/90" />
            </div>
            <h2 className="text-4xl font-bold mb-8 leading-tight">
              Crop Diagnostic Admin Panel
            </h2>
            <p className="text-xl text-white/90 mb-12 leading-relaxed">
              Monitor and manage your agricultural diagnostic system with our comprehensive admin dashboard
            </p>
            
            <div className="space-y-6 text-left bg-white/10 p-8 rounded-2xl backdrop-blur-sm">
              {[
                'Real-time crop health monitoring',
                'Manage farmer profiles and records',
                'Generate detailed diagnostic reports',
                'Track system performance metrics',
                'Multi-language support coming soon'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/90 text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}