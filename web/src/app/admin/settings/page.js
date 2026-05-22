'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { Save, User, Bell, Shield, Database, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'CropDiagnostic',
    adminEmail: 'admin@example.com',
    notifications: true,
    emailAlerts: true,
    autoBackup: true,
  })

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <>
      <Navbar title="Settings" />
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Settings
          </h2>
          <p className="text-ink-secondary">
            Manage your application settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* General Settings */}
          <div className="rounded-xl border border-outline bg-surface-elevated p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-ink">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">General</h3>
                <p className="text-sm text-ink-secondary">Basic application settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-secondary">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full rounded-lg border-2 border-outline px-4 py-2 text-ink transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink-secondary">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  className="w-full rounded-lg border-2 border-outline px-4 py-2 text-ink transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline bg-surface-elevated p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-warning">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Notifications</h3>
                <p className="text-sm text-ink-secondary">Manage notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">Push Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                  className="h-5 w-5 rounded border-outline-strong text-brand focus:ring-brand"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">Email Alerts</span>
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                  className="h-5 w-5 rounded border-outline-strong text-brand focus:ring-brand"
                />
              </label>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl border border-outline bg-surface-elevated p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-error">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Security</h3>
                <p className="text-sm text-ink-secondary">Security and access settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <button type="button" className="w-full rounded-lg border border-outline px-4 py-2 text-left text-sm text-ink-secondary transition hover:bg-surface-muted">
                Change Password
              </button>
              <button type="button" className="w-full rounded-lg border border-outline px-4 py-2 text-left text-sm text-ink-secondary transition hover:bg-surface-muted">
                Two-Factor Authentication
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="rounded-xl border border-outline bg-surface-elevated p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-ink">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">Data Management</h3>
                <p className="text-sm text-ink-secondary">Backup and data settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink-secondary">Auto Backup</span>
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                  className="h-5 w-5 rounded border-outline-strong text-brand focus:ring-brand"
                />
              </label>

              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-outline px-4 py-2 text-sm text-ink-secondary transition hover:bg-surface-muted">
                <RefreshCw className="h-4 w-4" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>
    </>
  )
}