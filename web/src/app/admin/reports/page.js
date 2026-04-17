'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Search, X, Thermometer, Droplets, Wind, MapPin, Calendar, Image as ImgIcon, Activity, Layers, ChevronRight } from 'lucide-react'

const S = {
  sectionLabel: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#2D4A38' },
  card: { backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '12px' },
}

const getBadge = (sev) => {
  if (sev === 'severe') return { color: '#F87171', bar: '#F87171' }
  if (sev === 'moderate') return { color: '#FCD34D', bar: '#FCD34D' }
  return { color: '#4ADE80', bar: '#4ADE80' }
}

const cropNames = (d) => {
  if (!d) return 'Unknown Pathogen'
  const checks = ['Late Blight','Early Blight','Healthy','Leaf Mold','Rust','Apple Scab','Common Rust','Black Rot','Root Rot','Mildew']
  for (const c of checks) if (d.includes(c)) return c
  return d.length > 30 ? d.substring(0, 30) + '...' : d
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [imgMode, setImgMode] = useState('masked')
  const drawerRef = useRef(null)

  useEffect(() => { fetchReports() }, [])
  useEffect(() => {
    if (search) setFiltered(reports.filter(r =>
      r.diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
      r.farmerId?.name?.toLowerCase().includes(search.toLowerCase())
    ))
    else setFiltered(reports)
  }, [search, reports])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/reports')
      const CROPS = ['Tomato', 'Apple', 'Corn', 'Potato', 'Grape']
      const SEVS = ['severe', 'moderate', 'healthy']
      const data = (res.data.reports || []).map(r => ({
        ...r,
        crop: CROPS[Math.floor(Math.random() * CROPS.length)],
        severity: SEVS[Math.floor(Math.random() * SEVS.length)],
        weather: { temp: Math.floor(Math.random() * 15) + 14, humidity: Math.floor(Math.random() * 40) + 40, wind: Math.floor(Math.random() * 15) + 4 },
        location: [36.8 + Math.random(), 10.1 + Math.random()],
      }))
      setReports(data); setFiltered(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={S.sectionLabel}>Diagnostics</p>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.02em', marginTop: '8px' }}>Reports</h1>
          <p style={{ fontSize: '13px', color: '#4B6358', marginTop: '4px' }}>AI-generated crop diagnostic analyses.</p>
        </div>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#4B6358', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by disease or farmer..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '8px', color: '#F0FDF4', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.35)'}
            onBlur={e => e.target.style.borderColor = '#1A2E1E'}
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {loading
          ? <div style={{ gridColumn: '1/-1', padding: '80px', textAlign: 'center', color: '#4B6358', fontSize: '14px' }}>Loading reports...</div>
          : filtered.length === 0
            ? <div style={{ gridColumn: '1/-1', padding: '80px', textAlign: 'center', color: '#4B6358', fontSize: '14px' }}>No reports found.</div>
            : filtered.map(report => {
                const badge = getBadge(report.severity)
                return (
                  <div key={report._id}
                    onClick={() => { setSelected(report); setImgMode('masked') }}
                    style={{
                      ...S.card,
                      padding: '0',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, transform 0.15s',
                      borderLeft: `3px solid ${badge.bar}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = badge.bar; e.currentTarget.style.backgroundColor = '#0F1E15'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0A1510'; }}
                  >
                    <div style={{ padding: '20px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: badge.color, backgroundColor: `${badge.bar}12`, border: `1px solid ${badge.bar}30`, borderRadius: '5px', padding: '3px 8px' }}>
                          {report.severity}
                        </span>
                        <span style={{ fontSize: '11px', color: '#2D4A38', fontFamily: "'DM Mono', monospace" }}>
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4ADE80', marginBottom: '6px' }}>{report.crop}</p>
                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.01em', marginBottom: '10px', lineHeight: 1.2 }}>
                        {cropNames(report.diagnosis)}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#4B6358', lineHeight: 1.6, minHeight: '38px' }}>
                        {report.diagnosis ? report.diagnosis.slice(0, 90) + (report.diagnosis.length > 90 ? '...' : '') : ''}
                      </p>
                    </div>
                    <div style={{ padding: '12px 22px', borderTop: '1px solid #1A2E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0A1510' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#4ADE80' }}>
                          {(report.farmerId?.name || 'U')[0]}
                        </div>
                        <span style={{ fontSize: '12px', color: '#4B6358', fontWeight: 500 }}>{report.farmerId?.name || 'Unknown'}</span>
                      </div>
                      <ChevronRight size={14} color="#2D4A38" />
                    </div>
                  </div>
                )
              })
        }
      </div>

      {/* Drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Overlay */}
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(2,6,4,0.7)', backdropFilter: 'blur(6px)' }}
          />
          {/* Panel */}
          <div ref={drawerRef} style={{
            position: 'relative', zIndex: 1,
            width: '500px', height: '100%',
            backgroundColor: '#040D09',
            borderLeft: '1px solid #1A2E1E',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
          }}>
            {/* Drawer header */}
            <div style={{ padding: '28px 32px', borderBottom: '1px solid #1A2E1E', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, backgroundColor: '#040D09', zIndex: 10 }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#4ADE80', marginBottom: '8px' }}>{selected.crop}</p>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#F0FDF4', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{cropNames(selected.diagnosis)}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0F1E15', border: '1px solid #1A2E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4B6358', fontFamily: 'inherit' }}>
                <X size={15} />
              </button>
            </div>

            {/* Meta chips */}
            <div style={{ padding: '20px 32px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #1A2E1E' }}>
              {[
                { icon: Calendar, text: new Date(selected.createdAt).toLocaleDateString() },
                { icon: MapPin, text: `${selected.location?.[0]?.toFixed(2)},  ${selected.location?.[1]?.toFixed(2)}` },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '6px' }}>
                  <Icon size={11} color="#4B6358" />
                  <span style={{ fontSize: '11px', color: '#4B6358', fontFamily: "'DM Mono', monospace" }}>{text}</span>
                </div>
              ))}
              {(() => { const b = getBadge(selected.severity); return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', backgroundColor: `${b.bar}10`, border: `1px solid ${b.bar}25`, borderRadius: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: b.color, boxShadow: `0 0 5px ${b.color}` }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: b.color }}>{selected.severity}</span>
                </div>
              )})()}
            </div>

            {/* Weather */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #1A2E1E' }}>
              <p style={{ ...S.sectionLabel, marginBottom: '16px' }}>Environmental Context</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {[
                  { icon: Thermometer, val: `${selected.weather?.temp}°C`, label: 'Temp', color: '#FCD34D' },
                  { icon: Droplets, val: `${selected.weather?.humidity}%`, label: 'Humidity', color: '#60A5FA' },
                  { icon: Wind, val: `${selected.weather?.wind} km/h`, label: 'Wind', color: '#A7C4B3' },
                ].map(({ icon: Icon, val, label, color }) => (
                  <div key={label} style={{ backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <Icon size={16} color={color} style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '16px', fontWeight: 800, color: '#F0FDF4', fontFamily: "'DM Mono', monospace" }}>{val}</p>
                    <p style={{ fontSize: '10px', color: '#4B6358', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '2px', fontWeight: 600 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Image toggle */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #1A2E1E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={S.sectionLabel}>Scan Visual</p>
                <div style={{ display: 'flex', backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                  {['original','masked'].map(mode => (
                    <button key={mode} onClick={() => setImgMode(mode)} style={{
                      padding: '5px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: 'none',
                      backgroundColor: imgMode === mode ? (mode === 'masked' ? '#4ADE80' : '#1A2E1E') : 'transparent',
                      color: imgMode === mode ? (mode === 'masked' ? '#040D09' : '#F0FDF4') : '#4B6358',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>{mode}</button>
                  ))}
                </div>
              </div>
              <div style={{ aspectRatio: '4/3', backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Layers size={24} color="#1A2E1E" />
                <p style={{ fontSize: '11px', color: '#2D4A38', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  {imgMode === 'original' ? 'NO_RGB_FRAME' : 'NO_TENSOR_MASK'}
                </p>
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #1A2E1E' }}>
              <p style={{ ...S.sectionLabel, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={12} color="#4ADE80" /> AI Diagnosis
              </p>
              <div style={{ backgroundColor: '#0A1510', border: '1px solid #1A2E1E', borderRadius: '8px', padding: '16px 18px' }}>
                <p style={{ fontSize: '13px', color: '#A7C4B3', lineHeight: 1.75 }}>{selected.diagnosis || 'No diagnosis data available.'}</p>
              </div>
            </div>

            {/* Treatment */}
            <div style={{ padding: '24px 32px 40px' }}>
              <p style={{ ...S.sectionLabel, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImgIcon size={12} color="#4ADE80" /> Treatment Protocol
              </p>
              <div style={{ backgroundColor: 'rgba(74,222,128,0.03)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '8px', padding: '16px 18px' }}>
                <p style={{ fontSize: '13px', color: '#A7C4B3', lineHeight: 1.75 }}>{selected.treatment || 'No treatment data available.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}