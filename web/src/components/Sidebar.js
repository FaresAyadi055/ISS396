'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import axios from 'axios'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      // Clear token by setting an expired cookie (done on backend)
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isActive = (path) => pathname === path

  return (
    <aside className="w-64 bg-black text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Crop Diagnostic</h1>
        <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Link
            href="/admin/dashboard"
            className={`block px-4 py-2 rounded-lg transition ${
              isActive('/admin/dashboard')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-900'
            }`}
          >
            📊 Dashboard
          </Link>

          <Link
            href="/admin/farmers"
            className={`block px-4 py-2 rounded-lg transition ${
              isActive('/admin/farmers')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-900'
            }`}
          >
            👨‍🌾 Farmers
          </Link>

          <Link
            href="/admin/reports"
            className={`block px-4 py-2 rounded-lg transition ${
              isActive('/admin/reports')
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-900'
            }`}
          >
            📋 Reports
          </Link>
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </aside>
  )
}
