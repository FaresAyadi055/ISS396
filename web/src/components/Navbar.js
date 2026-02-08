'use client'

export default function Navbar({ title }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold text-black">{title}</h2>
      </div>
    </nav>
  )
}
