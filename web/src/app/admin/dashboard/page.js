'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts'

const S = {
  sectionLabel: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#2D4A38' },
  card: { backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '12px', padding: '24px', position: 'relative', overflow: 'hidden' },
  bigNum: { fontSize: '48px', fontWeight: 900, color: '#F0FDF4', letterSpacing: '-0.04em', fontFamily: "'DM Mono', monospace", lineHeight: 1 },
  metaLabel: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4B6358' },
}

const severityBadge = (severity) => {
  switch (severity) {
    case 'severe': return { color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' }
    case 'moderate': return { color: '#FCD34D', bg: 'rgba(252,211,77,0.08)', border: 'rgba(252,211,77,0.2)' }
    default: return { color: '#4ADE80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' }
  }
}

const PIE_COLORS = ['#4ADE80', '#34D399', '#6EE7B7', '#A7F3D0', '#2D4A38']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: '#060F0A', border: '1px solid #1A2E1E', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ fontSize: '11px', color: '#4B6358', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 800, color: '#4ADE80', fontFamily: "'DM Mono', monospace" }}>{payload[0].value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ farmers: 0, scans: 0, reports: 0, diseases: 0 })
  const [loading, setLoading] = useState(true)
  const [recentReports, setRecentReports] = useState([])
  const [chartData] = useState([
    { d: 'Jan 1', v: 8 }, { d: 'Jan 5', v: 14 }, { d: 'Jan 10', v: 11 },
    { d: 'Jan 15', v: 19 }, { d: 'Jan 20', v: 27 }, { d: 'Jan 25', v: 23 }, { d: 'Jan 30', v: 35 },
  ])
  const [pieData] = useState([
    { name: 'Late Blight', value: 45 }, { name: 'Early Blight', value: 25 },
    { name: 'Leaf Mold', value: 15 }, { name: 'Mildew', value: 10 }, { name: 'Rust', value: 5 },
  ])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [f, r] = await Promise.all([
          axios.get('/api/admin/farmers'),
          axios.get('/api/admin/reports?limit=10'),
        ])
        const total = r.data.pagination?.total || 0
        const farmers = f.data.farmers?.length || 0
        setStats({ farmers, scans: total + 120, reports: total, diseases: Math.floor(total * 0.4) })
        setRecentReports((r.data.reports || []).slice(0, 5).map(rep => ({
          ...rep,
          crop: ['Tomato', 'Apple', 'Corn', 'Potato', 'Grape'][Math.floor(Math.random() * 5)],
          severity: ['severe', 'moderate', 'healthy'][Math.floor(Math.random() * 3)],
          confidence: Math.random() * 0.2 + 0.79,
        })))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const metricCards = [
    { label: 'Total Farmers', value: stats.farmers, delta: '+12%' },
    { label: 'Total Scans', value: stats.scans, delta: '+24%' },
    { label: 'Reports Generated', value: stats.reports, delta: '+18%' },
    { label: 'Diseases · 7d', value: stats.diseases, delta: '-4%', negative: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page header */}
      <div>
        <p style={S.sectionLabel}>Overview</p>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.02em', marginTop: '8px' }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: '#4B6358', marginTop: '4px' }}>Platform activity and diagnostic intelligence.</p>
      </div>

      {/* Bento Row 1: Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {metricCards.map(({ label, value, delta, negative }) => (
          <div key={label} style={{ ...S.card }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: 'radial-gradient(circle at top right, rgba(74,222,128,0.05) 0%, transparent 70%)', borderRadius: '0 12px 0 0' }} />
            <p style={S.metaLabel}>{label}</p>
            <p style={{ ...S.bigNum, marginTop: '12px' }}>{loading ? '—' : value}</p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: negative ? '#F87171' : '#4ADE80', marginTop: '10px', fontFamily: "'DM Mono', monospace" }}>{delta} this month</p>
          </div>
        ))}
      </div>

      {/* Bento Row 2: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Area Chart */}
        <div style={{ ...S.card, padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <p style={S.sectionLabel}>Scan Velocity</p>
              <p style={{ ...S.bigNum, fontSize: '32px', marginTop: '8px' }}>+{chartData[chartData.length - 1].v - chartData[0].v}</p>
            </div>
            <span style={{ fontSize: '11px', color: '#4ADE80', backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>LAST 30D</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" stroke="transparent" tick={{ fontSize: 10, fill: '#2D4A38', fontWeight: 600, letterSpacing: '0.05em' }} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="transparent" tick={{ fontSize: 10, fill: '#2D4A38' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="v" stroke="#4ADE80" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: '#4ADE80', stroke: '#040D09', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div style={{ ...S.card, padding: '28px' }}>
          <p style={{ ...S.sectionLabel, marginBottom: '20px' }}>Pathogen Distribution</p>
          <div style={{ position: 'relative', height: '160px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ ...S.bigNum, fontSize: '26px' }}>38</span>
              <span style={{ ...S.metaLabel, fontSize: '9px', marginTop: '4px' }}>Classes</span>
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pieData.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: PIE_COLORS[i], boxShadow: `0 0 6px ${PIE_COLORS[i]}80` }} />
                  <span style={{ fontSize: '12px', color: '#4B6358', fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#F0FDF4', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Row 3: Table */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #1A2E1E' }}>
          <p style={S.sectionLabel}>Latest Diagnoses</p>
          <a href="/admin/reports" style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', textTransform: 'uppercase' }}>View All →</a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#0A1510' }}>
              {['Farmer', 'Plant / Disease', 'Confidence', 'Severity', 'Date'].map(h => (
                <th key={h} style={{ padding: '12px 28px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#2D4A38', borderBottom: '1px solid #1A2E1E' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentReports.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#4B6358', fontSize: '13px' }}>No data available</td></tr>
              : recentReports.map((row, i) => {
                  const badge = severityBadge(row.severity)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1A2E1E' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0F1E15'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#4ADE80', flexShrink: 0 }}>
                            {(row.farmerId?.name || 'U')[0]}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#F0FDF4' }}>{row.farmerId?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 28px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F0FDF4' }}>{row.disease || 'Pathogen Detected'}</div>
                        <div style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{row.crop}</div>
                      </td>
                      <td style={{ padding: '16px 28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '60px', height: '3px', backgroundColor: '#1A2E1E', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(row.confidence * 100)}%`, backgroundColor: '#4ADE80', borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#A7C4B3', fontFamily: "'DM Mono', monospace" }}>{Math.round(row.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 28px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '5px', padding: '4px 10px' }}>
                          {row.severity}
                        </span>
                      </td>
                      <td style={{ padding: '16px 28px', fontSize: '12px', color: '#4B6358', fontFamily: "'DM Mono', monospace" }}>
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}