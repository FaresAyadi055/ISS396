import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'SmartCrop Admin',
  description: 'Agricultural diagnostic admin platform',
}

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#040D09', position: 'relative', zIndex: 1 }}>
      <Sidebar />
      {/* Main scrollable area */}
      <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          height: '64px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 32px',
          borderBottom: '1px solid #1A2E1E',
          backgroundColor: 'rgba(4,13,9,0.8)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#F0FDF4', lineHeight: 1.2 }}>Admin User</p>
              <p style={{ fontSize: '11px', color: '#4B6358', lineHeight: 1.2, marginTop: '2px' }}>admin@smartcrop.dev</p>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: '#4ADE80'
            }}>A</div>
          </div>
        </header>
        {/* Page content */}
        <div style={{ flex: 1, padding: '36px 40px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
