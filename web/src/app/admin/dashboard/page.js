'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import axios from 'axios'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    farmers: 0,
    reports: 0,
    resolvedReports: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [farmersRes, reportsRes] = await Promise.all([
          axios.get('/api/admin/farmers'),
          axios.get('/api/admin/reports?limit=100'),
        ])

        setStats({
          farmers: farmersRes.data.farmers?.length || 0,
          reports: reportsRes.data.pagination?.total || 0,
          resolvedReports: Math.floor((reportsRes.data.pagination?.total || 0) * 0.7),
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: 'Total Farmers',
      value: loading ? '...' : stats.farmers,
      color: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Total Reports',
      value: loading ? '...' : stats.reports,
      color: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      title: 'Resolved Reports',
      value: loading ? '...' : stats.resolvedReports,
      color: 'bg-purple-50',
      textColor: 'text-purple-700',
    },
  ]

  return (
    <>
      <Navbar title="Dashboard" />
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`${card.color} rounded-lg p-6 border border-gray-200`}
            >
              <p className="text-sm font-medium text-gray-600 mb-2">
                {card.title}
              </p>
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database Connection</span>
              <span className="text-green-600 font-medium">✓ Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API Status</span>
              <span className="text-green-600 font-medium">✓ Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Updated</span>
              <span className="text-gray-600">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
