import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Agricultural diagnostic admin dashboard',
}

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
