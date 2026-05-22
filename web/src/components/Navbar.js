'use client'

import { useState } from 'react'
import { Bell, Menu, User, HelpCircle } from 'lucide-react'
import SearchInput from '@/components/SearchInput'

export default function Navbar({ title, subtitle, onMenuClick }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  function logout() {
    window.location.href = '/login'
  }

  const dateLine =
    subtitle ||
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  return (
    <header className="sticky top-0 z-40 -mx-4 border-b border-outline bg-surface-elevated/95 px-4 shadow-sm backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-ink-secondary transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">
              {title}
            </h1>
            <p className="hidden text-sm text-ink-tertiary sm:block">{dateLine}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden min-w-0 max-w-xs flex-1 sm:block sm:max-w-md">
            <SearchInput
              type="search"
              placeholder="Search reports, farmers, or findings…"
              aria-label="Search"
              className="w-full"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-full p-2 text-ink-secondary transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-expanded={showNotifications}
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-outline bg-surface-elevated py-2 shadow-lg">
                <div className="border-b border-outline px-4 py-2">
                  <h3 className="text-sm font-semibold text-ink">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="cursor-pointer px-4 py-3 hover:bg-surface-muted">
                      <p className="text-sm text-ink">New farmer registered</p>
                      <p className="mt-1 text-xs text-ink-tertiary">5 minutes ago</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-outline px-4 py-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-brand-ink hover:text-brand-dark"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="hidden rounded-full p-2 text-ink-secondary transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30 sm:inline-flex"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 rounded-lg p-1.5 pl-2 transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-expanded={showProfile}
              aria-haspopup="true"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-strong bg-surface-muted">
                <User className="h-4 w-4 text-ink-secondary" />
              </div>
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink sm:inline">
                Admin
              </span>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-outline bg-surface-elevated py-1 shadow-lg">
                <a
                  href="/admin/settings"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-muted"
                >
                  Settings
                </a>
                <hr className="border-outline" />
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-error hover:bg-red-50"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
