'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Download, RefreshCw, UserPlus, Trash2, Eye } from 'lucide-react'

const S = {
  sectionLabel: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#2D4A38' },
  card: { backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '12px' },
}

export default function FarmersPage() {
  const [farmers, setFarmers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchFarmers() }, [])
  useEffect(() => {
    if (search) setFiltered(farmers.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()) || f.email?.toLowerCase().includes(search.toLowerCase())))
    else setFiltered(farmers)
  }, [search, farmers])

  const fetchFarmers = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/farmers')
      const data = (res.data.farmers || []).map(f => ({
        ...f,
        totalScans: Math.floor(Math.random() * 60) + 5,
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString(),
        joinedAt: f.createdAt || new Date(Date.now() - Math.floor(Math.random() * 200) * 86400000).toISOString(),
      }))
      setFarmers(data)
      setFiltered(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this farmer?')) return
    try { await axios.delete(`/api/admin/farmers/${id}`); fetchFarmers() }
    catch (e) { console.error(e) }
  }

  const stats = [
    { label: 'Total Farmers', value: farmers.length },
    { label: 'Active', value: farmers.filter(f => f.status === 'active').length },
    { label: 'Inactive', value: farmers.filter(f => f.status === 'inactive').length },
    { label: 'Scans Total', value: farmers.reduce((acc, f) => acc + (f.totalScans || 0), 0) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={S.sectionLabel}>Management</p>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.02em', marginTop: '8px' }}>Farmers</h1>
          <p style={{ fontSize: '13px', color: '#4B6358', marginTop: '4px' }}>Registered users and their diagnostic activity.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', borderRadius: '8px', color: '#A7C4B3', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}
            onClick={() => {/* export logic */}}>
            <Download size={14} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', backgroundColor: '#4ADE80', border: 'none', borderRadius: '8px', color: '#040D09', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 0 16px rgba(74,222,128,0.2)' }}>
            <UserPlus size={14} /> Add Farmer
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ ...S.card, padding: '20px 24px' }}>
            <p style={S.sectionLabel}>{label}</p>
            <p style={{ fontSize: '36px', fontWeight: 900, color: '#F0FDF4', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.04em', marginTop: '10px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '440px' }}>
          <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B6358' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search farmers by name or email..."
            style={{ 
              width: '100%', padding: '10px 14px 10px 40px',
              backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '8px',
              color: '#F0FDF4', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.35)'}
            onBlur={e => e.target.style.borderColor = '#1A2E1E'}
          />
        </div>
        <button onClick={fetchFarmers} style={{ padding: '10px 12px', backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '8px', color: '#4B6358', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
        <span style={{ fontSize: '12px', color: '#2D4A38', fontFamily: "'DM Mono', monospace", fontWeight: 600, marginLeft: '4px' }}>{filtered.length} results</span>
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#0F1E15', borderBottom: '1px solid #1A2E1E' }}>
              {['Farmer', 'Email', 'Joined', 'Scans', 'Last Active', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#2D4A38' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#4B6358', fontSize: '13px' }}>Loading farmers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#4B6358', fontSize: '13px' }}>No farmers found.</td></tr>
            ) : filtered.map(farmer => (
              <tr key={farmer._id} style={{ borderBottom: '1px solid #122018' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0F1E15'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#4ADE80', flexShrink: 0, letterSpacing: '0.02em' }}>
                      {farmer.name?.[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#F0FDF4' }}>{farmer.name}</p>
                      <p style={{ fontSize: '10px', color: '#2D4A38', fontFamily: "'DM Mono', monospace", marginTop: '2px' }}>#{farmer._id?.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '13px', color: '#4B6358' }}>{farmer.email}</td>
                <td style={{ padding: '16px 24px', fontSize: '12px', color: '#4B6358', fontFamily: "'DM Mono', monospace" }}>{new Date(farmer.joinedAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 24px', fontSize: '15px', fontWeight: 800, color: '#F0FDF4', fontFamily: "'DM Mono', monospace" }}>{farmer.totalScans}</td>
                <td style={{ padding: '16px 24px', fontSize: '12px', color: '#4B6358', fontFamily: "'DM Mono', monospace" }}>{new Date(farmer.lastActive).toLocaleDateString()}</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: farmer.status === 'active' ? '#4ADE80' : '#4B6358', boxShadow: farmer.status === 'active' ? '0 0 6px #4ADE80' : 'none' }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: farmer.status === 'active' ? '#4ADE80' : '#4B6358' }}>{farmer.status}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div className="group-hover-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', opacity: 0 }}
                    onMouseOver={e => e.currentTarget.style.opacity = '1'}
                  >
                    <button style={{ padding: '6px', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', borderRadius: '6px', color: '#A7C4B3', fontFamily: 'inherit', display: 'flex' }} title="View">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => handleDelete(farmer._id)} style={{ padding: '6px', backgroundColor: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '6px', color: '#F87171', fontFamily: 'inherit', display: 'flex' }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}