'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Table from '@/components/Table'
import Button from '@/components/Button'
import axios from 'axios'
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Image as ImageIcon,
  User,
  RefreshCw,
  ChevronDown,
  BarChart3,
  PieChart,
  X,
  Maximize2,
  Minimize2,
  Printer,
  Share2
} from 'lucide-react'
import Image from 'next/image'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedReport, setSelectedReport] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCrop, setSelectedCrop] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(false)

  const LIMIT = 10

  useEffect(() => {
    fetchReports()
  }, [page])

  useEffect(() => {
    filterReports()
  }, [searchTerm, selectedStatus, selectedCrop, dateRange, reports])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `/api/admin/reports?page=${page}&limit=${LIMIT}`
      )
      
      setReports(response.data.reports || [])
      setFilteredReports(response.data.reports || [])
      setTotalPages(response.data.pagination?.pages || 1)
      setTotalReports(response.data.pagination?.total || 0)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch reports. Please try again.' 
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = [...reports]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(report => 
        report.farmerId?.name?.toLowerCase().includes(term) ||
        report.farmerId?.email?.toLowerCase().includes(term) ||
        report.reportData?.header?.crop?.toLowerCase().includes(term) ||
        report.reportData?.header?.result?.toLowerCase().includes(term)
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(report => report.status === selectedStatus)
    }

    if (selectedCrop !== 'all') {
      filtered = filtered.filter(report => 
        report.reportData?.header?.crop?.toLowerCase() === selectedCrop
      )
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.createdAt)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        return reportDate >= startDate && reportDate <= endDate
      })
    }

    setFilteredReports(filtered)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.'))
      return

    try {
      await axios.delete(`/api/admin/reports/${id}`)
      setMessage({ 
        type: 'success', 
        text: 'Report deleted successfully!' 
      })
      fetchReports()
      if (selectedReport?._id === id) {
        setSelectedReport(null)
      }
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete report' 
      })
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const headers = ['Farmer', 'Email', 'Crop', 'Result', 'Status', 'Date']
      const csvContent = [
        headers.join(','),
        ...filteredReports.map(r => 
          [
            r.farmerId?.name || 'Unknown',
            r.farmerId?.email || 'N/A',
            r.reportData?.header?.crop || 'N/A',
            `"${r.reportData?.header?.result || 'N/A'}"`,
            r.status || 'N/A',
            new Date(r.createdAt).toLocaleDateString()
          ].join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      
      setMessage({ 
        type: 'success', 
        text: 'Export completed successfully!' 
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Export failed. Please try again.' 
      })
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      failed: 'bg-red-100 text-red-700 border-red-200'
    }
    const icons = {
      completed: CheckCircle,
      pending: Clock,
      processing: RefreshCw,
      failed: XCircle
    }
    const Icon = icons[status] || Clock
    return { className: styles[status] || styles.pending, Icon }
  }

  const stats = {
    total: filteredReports.length,
    completed: filteredReports.filter(r => r.status === 'completed').length,
    pending: filteredReports.filter(r => r.status === 'pending').length,
    processing: filteredReports.filter(r => r.status === 'processing').length,
    failed: filteredReports.filter(r => r.status === 'failed').length,
  }

  const columns = [
    {
      key: 'farmerId',
      label: 'Farmer',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value?.name || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{value?.email || 'No email'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'reportData',
      label: 'Crop',
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value?.header?.crop || 'N/A'}
        </div>
      ),
    },
    {
      key: 'reportData',
      label: 'Primary Finding',
      render: (value) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-700 line-clamp-2">
            {value?.header?.result || 'N/A'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        const { className, Icon } = getStatusBadge(value)
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${className}`}>
            <Icon className="w-3 h-3" />
            {value || 'pending'}
          </span>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => (
        <div className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
  ]

  return (
    <>
      <Navbar title="Reports Management" />
      <div className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Reports Management
              </h2>
              <p className="text-gray-500">
                View and manage all diagnostic reports from farmers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                icon={BarChart3}
              >
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                icon={Download}
                loading={exporting}
              >
                Export
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          {showStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.failed}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'error' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${
              message.type === 'error' ? 'text-red-700' : 'text-green-700'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-96">
                <input
                  type="text"
                  placeholder="Search by farmer, crop, or result..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 border rounded-xl transition ${
                  showFilters || selectedStatus !== 'all' || selectedCrop !== 'all' || dateRange.start
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw 
                className={`w-4 h-4 cursor-pointer hover:text-gray-700 transition ${loading ? 'animate-spin' : ''}`} 
                onClick={fetchReports}
              />
              <span>{filteredReports.length} reports found</span>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Crop
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="all">All Crops</option>
                  <option value="wheat">Wheat</option>
                  <option value="corn">Corn</option>
                  <option value="soybeans">Soybeans</option>
                  <option value="rice">Rice</option>
                  <option value="cotton">Cotton</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedStatus('all')
                    setSelectedCrop('all')
                    setDateRange({ start: '', end: '' })
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading reports...</span>
              </div>
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredReports}
              actions={(report) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(report._id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} • {totalReports} total reports
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5 && page > 3) {
                    pageNum = page - 3 + i
                  }
                  if (pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                          page === pageNum
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                  return null
                })}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    Report Details
                  </h3>
                  <p className="text-sm text-gray-500">
                    View complete information about this diagnostic report
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Farmer Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Farmer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Name</p>
                      <p className="text-base font-medium text-gray-800">
                        {selectedReport.farmerId?.name || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-base text-gray-800">
                        {selectedReport.farmerId?.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Crop</p>
                      <p className="text-base text-gray-800">
                        {selectedReport.reportData?.header?.crop || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Scan ID</p>
                      <p className="text-base text-gray-800">
                        {selectedReport.reportData?.header?.scanId || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diagnosis Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Diagnosis</h4>
                    <p className="text-gray-800 mb-4">{selectedReport.diagnosis || 'No diagnosis specified'}</p>
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Primary Finding</p>
                        <p className="text-sm font-medium text-gray-800">
                          {selectedReport.reportData?.header?.result || 'N/A'}
                        </p>
                      </div>
                      {selectedReport.reportData?.header?.leavesAnalyzed && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Leaves Analyzed</p>
                          <p className="text-sm font-medium text-gray-800">
                            {selectedReport.reportData.header.leavesAnalyzed}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Treatment</h4>
                    <p className="text-gray-800">{selectedReport.treatment || 'No treatment specified'}</p>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Report Timeline
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm text-gray-800">Report submitted</p>
                        <p className="text-xs text-gray-500">
                          {new Date(selectedReport.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm text-gray-800">Assigned to specialist</p>
                        <p className="text-xs text-gray-500">
                          {new Date(new Date(selectedReport.createdAt).getTime() + 3600000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        selectedReport.status === 'resolved' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <p className="text-sm text-gray-800">
                          {selectedReport.status === 'resolved' ? 'Report resolved' : 'In progress'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedReport.status === 'resolved' 
                            ? new Date(new Date(selectedReport.createdAt).getTime() + 86400000).toLocaleString()
                            : 'Ongoing'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedReport.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Additional Notes</h4>
                    <p className="text-sm text-yellow-700">{selectedReport.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  Print
                </Button>
                <Button
                  variant="outline"
                  icon={Share2}
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href)
                    setMessage({ type: 'success', text: 'Link copied to clipboard!' })
                  }}
                >
                  Share
                </Button>
                <Button
                  variant="danger"
                  icon={Trash2}
                  onClick={() => {
                    handleDelete(selectedReport._id)
                    setSelectedReport(null)
                  }}
                >
                  Delete Report
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Image Modal */}
        {fullscreenImage && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute bottom-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen report"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </>
  )
}