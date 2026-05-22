'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Sprout,
  Image as ImageIcon,
} from 'lucide-react'

export default function Sidebar({ collapsed, onCollapse }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  const isActive = (path) => pathname === path
  const isCollapsed = collapsed === true

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/farmers', icon: Users, label: 'Farmers' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
    { path: '/admin/scans', icon: ImageIcon, label: 'Scans' },
  ]

  const bottomMenuItems = [{ path: '/admin/settings', icon: Settings, label: 'Settings' }]

  return (
    <aside
      className={`flex h-screen min-h-0 shrink-0 flex-col overflow-hidden border-r border-gray-800 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl transition-[width] duration-300 ease-out ${
        isCollapsed ? 'w-0 border-0 shadow-none' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-700/80 p-4">
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md ring-1 ring-white/10">
              <Sprout className="h-5 w-5 text-white" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-white">
                CropDiagnostic
              </h1>
              <p className="text-xs font-medium text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        )}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onCollapse}
            className="shrink-0 rounded-lg p-2 text-gray-300 transition hover:bg-gray-700/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-5 sm:px-3">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isCollapsed ? 'justify-center px-2' : 'gap-3'
                } ${
                  active
                    ? 'border-l-4 border-emerald-500 bg-gray-700 text-white shadow-md ring-1 ring-white/5 hover:bg-gray-600/95'
                    : 'border-l-4 border-transparent text-gray-200 hover:translate-x-0.5 hover:border-l-emerald-500/40 hover:bg-gray-800/85 hover:text-white hover:shadow-md'
                }`}
              >
                <Icon
                  className={`h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    active ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-300/90'
                  }`}
                  aria-hidden
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-auto space-y-2 border-t border-gray-700/80 pt-5">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${
                  isCollapsed ? 'justify-center px-2' : 'gap-3'
                } ${
                  active
                    ? 'border-l-4 border-emerald-500/80 bg-gray-700/80 text-white shadow-sm hover:bg-gray-600/90'
                    : 'border-l-4 border-transparent hover:translate-x-0.5 hover:border-l-emerald-500/30 hover:bg-gray-800/85 hover:text-white hover:shadow-md'
                }`}
              >
                <Icon
                  className={`h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    active ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-300/90'
                  }`}
                  aria-hidden
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={`group flex w-full items-center rounded-xl px-4 py-3.5 text-base font-medium text-gray-200 transition-all duration-200 hover:translate-x-0.5 hover:bg-red-950/40 hover:text-red-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 focus:outline-none focus:ring-2 focus:ring-red-400/30 ${
              isCollapsed ? 'justify-center px-2' : 'gap-3'
            }`}
          >
            <LogOut className="h-6 w-6 shrink-0 text-gray-400 transition-transform duration-200 group-hover:scale-105 group-hover:text-red-300" aria-hidden />
            {!isCollapsed && <span>{loggingOut ? 'Logging out…' : 'Logout'}</span>}
          </button>
        </div>
      </nav>
    </aside>
  )
}
