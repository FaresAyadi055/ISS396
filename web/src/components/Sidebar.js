'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Settings, LogOut } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path) => pathname === path

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/farmers', icon: Users, label: 'Farmers' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
  ]

  const systemItems = [
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside
      className="w-[260px] flex-shrink-0 h-screen sticky top-0 flex flex-col z-50"
      style={{ backgroundColor: '#060F0A', borderRight: '1px solid #1A2E1E' }}
    >
      {/* Logo */}
      <div className="h-[64px] flex items-center px-6" style={{ borderBottom: '1px solid #1A2E1E' }}>
        <div className="flex items-center gap-3">
          {/* Leaf icon made with CSS */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.34C3.27 20.22 4.41 21.17 5.14 20.42C5.14 20.42 8.35 17 12 17C15.65 17 18 15 18 12C18 10 17 8 17 8Z" fill="#4ADE80"/>
              <path d="M21 3C12 3 8 7 8 12" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: '#F0FDF4' }}>SmartCrop</p>
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: '#4B6358' }}>Admin Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold px-3 mb-3" style={{ color: '#2D4A38' }}>Overview</p>
        <div className="space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                href={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
                style={{
                  backgroundColor: active ? 'rgba(74,222,128,0.08)' : 'transparent',
                  color: active ? '#4ADE80' : '#4B6358',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = '#0F1E15'; e.currentTarget.style.color = '#A7C4B3'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#4B6358'; } }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium tracking-wide">{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#4ADE80' }} />}
              </Link>
            )
          })}
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] font-bold px-3 mt-8 mb-3" style={{ color: '#2D4A38' }}>System</p>
        <div className="space-y-0.5">
          {systemItems.map(({ path, icon: Icon, label }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                href={path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: active ? 'rgba(74,222,128,0.08)' : 'transparent',
                  color: active ? '#4ADE80' : '#4B6358',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = '#0F1E15'; e.currentTarget.style.color = '#A7C4B3'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#4B6358'; } }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium tracking-wide">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid #1A2E1E' }}>
        <button
          onClick={() => router.push('/login')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium"
          style={{ color: '#4B6358' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.06)'; e.currentTarget.style.color = '#F87171'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#4B6358'; }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}