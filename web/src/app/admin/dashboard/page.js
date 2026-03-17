'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import axios from 'axios'
import { 
  Users, 
  FileText, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'

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
        const pendingCount = totalReports - resolvedCount

        setStats(prev => ({
          ...prev,
          farmers: farmersRes.data.farmers?.length || 0,
          reports: totalReports,
          resolvedReports: resolvedCount,
          pendingReports: pendingCount,
        }))

        // Mock chart data - replace with actual API data
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

  const cards = [
    {
      title: 'Total Farmers',
      value: loading ? '...' : stats.farmers,
      change: stats.weeklyGrowth,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
    {
      title: 'Total Reports',
      value: loading ? '...' : stats.reports,
      change: 8.2,
      icon: FileText,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      textColor: 'text-green-700',
    },
    {
      title: 'Resolved',
      value: loading ? '...' : stats.resolvedReports,
      change: 15.3,
      icon: CheckCircle,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      textColor: 'text-purple-700',
    },
    {
      title: 'Resolution Rate',
      value: loading ? '...' : `${stats.resolutionRate}%`,
      change: 5.5,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      textColor: 'text-orange-700',
    },
  ]

  const pieData = [
    { name: 'Resolved', value: stats.resolvedReports, color: '#10b981' },
    { name: 'Pending', value: stats.pendingReports, color: '#f59e0b' },
    { name: 'In Progress', value: Math.floor(stats.reports * 0.1), color: '#3b82f6' },
  ]

  const severityData = [
    { name: 'High', value: 25, color: '#ef4444' },
    { name: 'Medium', value: 45, color: '#f59e0b' },
    { name: 'Low', value: 30, color: '#10b981' },
  ]

  const getSeverityBadge = (severity) => {
    const styles = {
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-green-100 text-green-700 border-green-200',
    }
    return styles[severity] || styles.low
  }

  const getStatusBadge = (status) => {
    const styles = {
      resolved: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return styles[status] || styles.pending
  }

  return (
    <>
      <Navbar title="Dashboard" />
      <div className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome back, Admin
          </h2>
          <p className="text-gray-500">
            Here's what's happening with your diagnostic system today.
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {cards.map((card, idx) => {
            const Icon = card.icon
            const isPositive = card.change > 0
            
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${card.iconBg} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                  <span className={`flex items-center gap-1 text-sm ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(card.change)}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                  <p className={`text-3xl font-bold ${card.textColor}`}>
                    {card.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Area Chart - Main */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Report Trends
                </h3>
                <p className="text-sm text-gray-500">
                  Daily report submissions and resolutions
                </p>
              </div>
              <div className="flex items-center gap-2">
                {['week', 'month', 'quarter'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      selectedPeriod === period
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="reportsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="reports" 
                    stroke="#3b82f6" 
                    fill="url(#reportsGradient)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    fill="url(#resolvedGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column - Pie Charts */}
          <div className="space-y-6">
            {/* Report Status Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Report Status
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {pieData.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs text-gray-500">{item.name}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Severity Levels
              </h3>
              <div className="space-y-3">
                {severityData.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.name}</span>
                      <span className="font-semibold text-gray-800">{item.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${item.value}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Recent Reports & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reports Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    Recent Reports
                  </h3>
                  <p className="text-sm text-gray-500">
                    Latest diagnostic reports from farmers
                  </p>
                </div>
                <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farmer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crop
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <MoreVertical className="w-4 h-4" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.farmer}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{report.crop}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityBadge(report.severity)}`}>
                          {report.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              System Status
            </h3>
            
            <div className="space-y-6">
              {/* Status Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Database</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Connected
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">API Service</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Operational
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">AI Model</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                    Updating
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Storage</span>
                  </div>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    78% Used
                  </span>
                </div>
              </div>

              {/* Last Updated */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700">
                    Run Report
                  </button>
                  <button className="p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700">
                    Backup Data
                  </button>
                  <button className="p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700">
                    Check Health
                  </button>
                  <button className="p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition text-gray-700">
                    View Logs
                  </button>
                </div>
              </div>

              {/* Alert */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Scheduled Maintenance
                    </p>
                    <p className="text-xs text-yellow-600">
                      System will be updated on Jan 20, 2024 at 02:00 AM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}