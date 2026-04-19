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
  BarChart3,
  Bell,
  Image as ImageIcon
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
    //{ path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    //{ path: '/admin/notifications', icon: Bell, label: 'Notifications', badge: 3 },
  ]

  const bottomMenuItems = [
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen sticky top-0 transition-all duration-300 flex flex-col ${
      isCollapsed ? 'w-0 overflow-hidden' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between overflow-hidden">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">CropDiagnostic</h1>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        )}
        {/* ChevronLeft - visible when expanded */}
        {!isCollapsed && (
          <button
            onClick={onCollapse}
            className="p-1 hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition group relative ${
                  active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-green-400' : ''}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Bottom Menu Items */}
        <div className={`absolute bottom-4 ${isCollapsed ? 'left-0 right-0 px-1' : 'left-4 right-4'}`}>
          <div className="space-y-1">
            {bottomMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition text-gray-300 hover:bg-gray-700/50`}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              )
            })}
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg transition text-gray-300 hover:bg-red-600/20 hover:text-red-400 disabled:opacity-50`}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && (
                <span className="text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </aside>
  )
}