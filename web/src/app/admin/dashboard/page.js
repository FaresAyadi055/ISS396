'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import axios from 'axios'
import {
  Users,
  FileText,
  CheckCircle,
  TrendingUp,
  Clock,
  Bell,
  User,
  MoreVertical,
  PlayCircle,
  CloudUpload,
  Radio,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import SearchInput from '@/components/SearchInput'

const DONUT_R = 80
const DONUT_C = 2 * Math.PI * DONUT_R

function StatusDonut({ segments, centerLabel }) {
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  let acc = 0
  return (
    <div className="relative flex justify-center py-4">
      <svg className="h-48 w-48 -rotate-90" viewBox="0 0 192 192" aria-hidden>
        {segments.map((seg, i) => {
          const len = (seg.value / sum) * DONUT_C
          const dash = `${len} ${DONUT_C}`
          const off = -acc
          acc += len
          return (
            <circle
              key={i}
              cx="96"
              cy="96"
              r={DONUT_R}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="24"
              strokeDasharray={dash}
              strokeDashoffset={off}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold leading-none text-gray-900">{centerLabel}</span>
        <span className="text-xs text-on-surface-variant">Total</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    farmers: 0,
    reports: 0,
    resolvedReports: 0,
    pendingReports: 0,
    weeklyGrowth: 12.5,
    resolutionRate: 70,
  })
  const [loading, setLoading] = useState(true)
  const [recentReports, setRecentReports] = useState([])
  const [chartData, setChartData] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('week')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [farmersRes, reportsRes] = await Promise.all([
          axios.get('/api/admin/farmers'),
          axios.get('/api/admin/reports?limit=100'),
        ])

        const totalReports = reportsRes.data.pagination?.total || 0
        const resolvedCount = Math.floor(totalReports * 0.7)
        const pendingCount = Math.max(0, totalReports - resolvedCount)

        setStats((prev) => ({
          ...prev,
          farmers: farmersRes.data.farmers?.length || 0,
          reports: totalReports,
          resolvedReports: resolvedCount,
          pendingReports: pendingCount,
        }))

        setChartData(generateChartData(selectedPeriod))
        setRecentReports(generateMockReports())
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [selectedPeriod])

  const generateChartData = (period) => {
    const data = []
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90

    for (let i = 0; i < days; i++) {
      data.push({
        name: `Day ${i + 1}`,
        reports: Math.floor(Math.random() * 50) + 20,
        resolved: Math.floor(Math.random() * 40) + 10,
      })
    }
    return data
  }

  const generateMockReports = () => {
    return [
      { id: 1, farmer: 'John Doe', crop: 'Wheat', status: 'resolved', date: '2024-01-15', severity: 'high' },
      { id: 2, farmer: 'Jane Smith', crop: 'Corn', status: 'pending', date: '2024-01-14', severity: 'medium' },
      { id: 3, farmer: 'Bob Johnson', crop: 'Soybeans', status: 'in-progress', date: '2024-01-14', severity: 'low' },
      { id: 4, farmer: 'Maria Garcia', crop: 'Rice', status: 'pending', date: '2024-01-13', severity: 'high' },
      { id: 5, farmer: 'Ahmed Hassan', crop: 'Cotton', status: 'resolved', date: '2024-01-13', severity: 'medium' },
    ]
  }

  const progressCount = Math.max(0, Math.floor(stats.reports * 0.1))

  const pieSegments = useMemo(
    () => [
      { name: 'Resolved', value: stats.resolvedReports, color: '#10b981' },
      { name: 'Pending', value: stats.pendingReports, color: '#f59e0b' },
      { name: 'Progress', value: progressCount, color: '#3b82f6' },
    ],
    [stats.resolvedReports, stats.pendingReports, progressCount]
  )

  const cards = [
    {
      title: 'Total Farmers',
      value: loading ? '…' : stats.farmers,
      change: stats.weeklyGrowth,
      icon: Users,
      valueClass: 'text-brand-ink',
    },
    {
      title: 'Total Reports',
      value: loading ? '…' : stats.reports,
      change: 8.2,
      icon: FileText,
      valueClass: 'text-success',
    },
    {
      title: 'Resolved',
      value: loading ? '…' : stats.resolvedReports,
      change: 15.3,
      icon: CheckCircle,
      valueClass: 'text-secondary',
    },
    {
      title: 'Resolution Rate',
      value: loading ? '…' : `${stats.resolutionRate}%`,
      change: 5.5,
      icon: TrendingUp,
      valueClass: 'text-tertiary',
    },
  ]

  const severityData = [
    { name: 'High', value: 25, color: '#ef4444' },
    { name: 'Medium', value: 45, color: '#f59e0b' },
    { name: 'Low', value: 30, color: '#10b981' },
  ]

  const tooltipDay =
    chartData.length >= 5 ? chartData[4] : chartData[chartData.length - 1] || { name: 'Day 5', reports: 0, resolved: 0 }

  const getSeverityBadge = (severity) => {
    const map = {
      high: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
      medium: 'bg-secondary-container text-on-secondary-container',
      low: 'bg-primary-50 text-brand-900',
    }
    return map[severity] || map.low
  }

  const getStatusBadge = (status) => {
    const map = {
      resolved: 'bg-primary-50 text-brand-ink',
      pending: 'bg-warning/20 text-warning',
      'in-progress': 'bg-info/20 text-info',
    }
    return map[status] || map.pending
  }

  return (
    <>
      <header className="sticky top-0 z-40 -mx-4 flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-100 bg-surface px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <h2 className="text-2xl font-bold leading-tight text-[#161d19]">Dashboard</h2>
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="hidden w-64 min-w-0 transition focus-within:ring-2 focus-within:ring-brand-ink sm:block">
            <SearchInput
              type="search"
              readOnly
              placeholder="Search diagnostic reports…"
              aria-label="Search diagnostic reports"
              inputClassName="w-full rounded-lg border-gray-200 bg-gray-50 text-[#161d19] placeholder:text-on-surface-variant focus:border-brand-ink focus:ring-0"
              iconWrapperClassName="text-on-surface-variant"
            />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition hover:text-brand-ink"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3 md:pl-4">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-brand object-cover">
                <User className="h-4 w-4 text-on-surface-variant" />
              </div>
              <span className="hidden text-sm font-semibold text-[#161d19] sm:inline">Admin</span>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background text-[#161d19]">
        <main className="space-y-10 py-6 lg:space-y-12 lg:py-8">
          <section>
            <h3 className="text-4xl font-bold leading-tight tracking-tight text-gray-900">Welcome back, Admin</h3>
            <p className="mt-1 text-base text-on-surface-variant">
              Here&apos;s what&apos;s happening with your diagnostic system today.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, idx) => {
              const Icon = card.icon
              const up = card.change > 0
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-surface-elevated p-6 shadow-sm transition duration-200 hover:scale-[1.01]"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <span className="rounded-lg bg-primary-50 p-1 text-brand-ink">
                      <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                    </span>
                    <div
                      className={`flex items-center text-xs font-bold ${up ? 'text-success' : 'text-error'}`}
                    >
                      <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
                      {Math.abs(card.change)}%
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant">{card.title}</p>
                  <p className={`mt-1 text-4xl font-bold leading-tight ${card.valueClass}`}>{card.value}</p>
                </div>
              )
            })}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-surface-elevated p-6 shadow-sm lg:col-span-2">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-semibold leading-tight text-[#161d19]">Report Trends</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">Daily report submissions and resolutions</p>
                </div>
                <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {['week', 'month', 'quarter'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setSelectedPeriod(period)}
                      className={`rounded-md px-4 py-1.5 text-xs font-bold capitalize transition focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                        selectedPeriod === period
                          ? 'bg-gray-900 text-white'
                          : 'text-on-surface-variant hover:text-brand-ink'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative h-[300px] w-full min-w-0 pt-8">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between border-b border-l border-gray-100">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-px w-full border-t border-dashed border-gray-200 bg-gray-50" />
                  ))}
                </div>
                <div className="absolute right-[22%] top-[8%] z-10 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                  <p className="mb-1 text-xs font-bold text-gray-900">{tooltipDay.name}</p>
                  <p className="text-xs text-brand-ink">reports : {tooltipDay.reports}</p>
                  <p className="text-xs text-success">resolved : {tooltipDay.resolved}</p>
                </div>
                <div className="relative z-[1] h-full min-h-0 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashReportsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#006c49" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#006c49" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dashResolvedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={32} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="reports"
                        stroke="#006c49"
                        strokeWidth={2}
                        fill="url(#dashReportsGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="resolved"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#dashResolvedGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="pointer-events-none absolute -bottom-8 left-0 right-0 flex justify-between px-3 text-xs text-on-surface-variant">
                  {chartData.slice(0, 7).map((d) => (
                    <span key={d.name}>{d.name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-10 rounded-xl border border-gray-200 bg-surface-elevated p-6 shadow-sm">
              <div>
                <h3 className="mb-8 text-xl font-semibold leading-tight text-[#161d19]">Report Status</h3>
                <StatusDonut segments={pieSegments} centerLabel={loading ? '…' : String(stats.reports)} />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {pieSegments.map((item) => (
                    <div key={item.name} className="text-center">
                      <div className="mb-1 flex items-center justify-center gap-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-on-surface-variant">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-[#161d19]">Severity Levels</h4>
                <div className="space-y-2">
                  {severityData.map((item, idx) => (
                    <div key={item.name}>
                      <div
                        className={`flex items-center justify-between text-xs font-bold ${idx > 0 ? 'mt-4' : ''}`}
                      >
                        <span>{item.name}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${item.value}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface-elevated shadow-sm lg:col-span-2">
              <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-semibold leading-tight text-[#161d19]">Recent Reports</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">Latest diagnostic reports from farmers</p>
                </div>
                <Link
                  href="/admin/reports"
                  className="text-sm font-bold text-brand-ink hover:underline focus:outline-none focus:ring-2 focus:ring-brand/30 rounded"
                >
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    <tr>
                      <th className="px-6 py-4">Farmer</th>
                      <th className="px-6 py-4">Crop</th>
                      <th className="px-6 py-4">Severity</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentReports.map((report) => (
                      <tr key={report.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-[#161d19]">{report.farmer}</td>
                        <td className="px-6 py-4 text-[#161d19]">{report.crop}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold capitalize ${getSeverityBadge(
                              report.severity
                            )}`}
                          >
                            {report.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-bold capitalize ${getStatusBadge(
                              report.status
                            )}`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">{report.date}</td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          <button type="button" className="cursor-pointer hover:text-brand-ink" aria-label="Row menu">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-surface-elevated p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-on-surface-variant" aria-hidden />
                  <h3 className="text-xl font-semibold leading-tight text-[#161d19]">System Status</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm">Database</span>
                    </div>
                    <span className="text-xs font-bold uppercase text-success">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm">API Service</span>
                    </div>
                    <span className="text-xs font-bold uppercase text-success">Operational</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
                      <span className="text-sm">AI Model</span>
                    </div>
                    <span className="text-xs font-bold uppercase text-warning">Updating</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-sm">Storage</span>
                    </div>
                    <span className="text-xs font-bold text-success">78% Used</span>
                  </div>
                </div>
                <p className="pt-1 text-[10px] italic text-on-surface-variant">
                  <Clock className="mr-1 inline h-3 w-3 align-middle" aria-hidden />
                  Last updated: {new Date().toLocaleString()}
                </p>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="mb-3 text-sm font-bold text-on-surface-variant">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-black glow-success"
                  >
                    <PlayCircle className="h-5 w-5" />
                    Run Report
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm font-bold text-on-surface-variant transition hover:border-brand-ink hover:text-brand-ink"
                  >
                    <CloudUpload className="h-5 w-5" />
                    Backup Data
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
