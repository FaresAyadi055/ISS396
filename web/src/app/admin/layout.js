'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { ChevronRight } from 'lucide-react'

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Toggle button - visible only when collapsed, pushes content right */}
      {collapsed === true && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition text-white flex-shrink-0 z-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300`}>
        {children}
      </div>
    </div>
  )
}