'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { ChevronRight } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />

      {collapsed ? (
        <div className="flex w-12 shrink-0 flex-col items-center border-r border-gray-800 bg-gradient-to-b from-gray-900 to-gray-800 py-4 shadow-xl">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="ml-3 flex min-h-screen min-w-0 flex-1 flex-col border-l border-gray-200/70 sm:ml-4 sm:border-gray-200/80">
        <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  )
}
