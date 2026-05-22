'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Table from '@/components/Table'
import Button from '@/components/Button'
import SearchInput from '@/components/SearchInput'
import axios from 'axios'
import {
  FileText,
  Filter,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Trash2,
  User,
  RefreshCw,
  BarChart3,
  X,
  Minimize2,
  Printer,
  Share2
} from 'lucide-react'

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
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Reports Management
              </h2>
              <p className="max-w-xl text-ink-secondary">
                View and manage all diagnostic reports from farmers
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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

          {showStats && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              <div className="flex items-start gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-brand-ink">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-sm text-ink-secondary">Total Reports</span>
                  <p className="text-3xl font-bold tracking-tight text-ink">{stats.total}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-success">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-sm text-ink-secondary">Completed</span>
                  <p className="text-3xl font-bold tracking-tight text-ink">{stats.completed}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-warning">
                  <Clock className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-sm text-ink-secondary">Pending</span>
                  <p className="text-3xl font-bold tracking-tight text-ink">{stats.pending}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-50 text-error">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-sm text-ink-secondary">Failed</span>
                  <p className="text-3xl font-bold tracking-tight text-ink">{stats.failed}</p>
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
        <div className="mb-6 overflow-hidden rounded-xl border border-outline bg-surface-elevated p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 lg:w-96">
                <SearchInput
                  type="search"
                  placeholder="Search by farmer, crop, or result…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  rounded="xl"
                  inputClassName="py-3"
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
        <div className="mb-6 overflow-hidden rounded-xl border border-outline bg-surface-elevated shadow-sm">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-outline bg-surface-elevated shadow-2xl">
              <div className="flex shrink-0 items-start justify-between border-b border-outline bg-surface-elevated p-6">
                <div>
                  <h3 className="mb-1 text-xl font-bold text-ink">
                    Report Details
                  </h3>
                  <p className="text-sm text-ink-secondary">
                    View complete information about this diagnostic report
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-full p-2 text-ink-tertiary transition hover:bg-surface-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-brand-ink">
                      <User className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Farmer Information</h4>
                    </div>
                    <div className="space-y-3 rounded-xl border border-outline bg-surface-muted/80 p-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-ink-tertiary">Name</p>
                        <p className="text-base font-semibold text-ink">
                          {selectedReport.farmerId?.name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-ink-tertiary">Email</p>
                        <p className="text-sm text-ink">{selectedReport.farmerId?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-brand-ink">
                      <FileText className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Report Metadata</h4>
                    </div>
                    <div className="space-y-3 rounded-xl border border-outline bg-surface-muted/80 p-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-ink-tertiary">Crop Type</p>
                        <p className="text-base font-semibold text-ink">
                          {selectedReport.reportData?.header?.crop || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-tight text-ink-tertiary">Scan ID</p>
                        <p className="break-all font-mono text-xs text-ink">
                          {selectedReport.reportData?.header?.scanId || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm lg:col-span-2">
                    <div className="mb-4 flex items-center gap-2 text-brand-ink">
                      <AlertCircle className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Diagnosis</h4>
                    </div>
                    {selectedReport.reportData?.header?.avgConfidence && (
                      <div className="mb-4 rounded-r-lg border-l-4 border-warning bg-amber-50/90 p-3 text-sm text-ink">
                        <strong>Leaves analyzed:</strong>{' '}
                        {selectedReport.reportData?.header?.leavesAnalyzed ?? '—'} —{' '}
                        <strong>Primary finding:</strong>{' '}
                        {selectedReport.reportData?.header?.result || 'N/A'} —{' '}
                        <strong>Average confidence:</strong>{' '}
                        {selectedReport.reportData.header.avgConfidence}
                      </div>
                    )}
                    <p className="mb-6 text-sm leading-relaxed text-ink-secondary">
                      {selectedReport.diagnosis || 'No diagnosis specified'}
                    </p>
                    {(selectedReport.embeddedImages?.original_image_masked ||
                      selectedReport.embeddedImages?.original_image_clean) && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selectedReport.embeddedImages?.original_image_masked && (
                          <div>
                            <div className="mb-2 aspect-square overflow-hidden rounded-lg border border-outline bg-gray-100">
                              <img
                                src={`data:image/jpeg;base64,${selectedReport.embeddedImages.original_image_masked}`}
                                alt="Masked overview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p className="text-center text-xs text-ink-tertiary">Masked overview</p>
                          </div>
                        )}
                        {selectedReport.embeddedImages?.original_image_clean && (
                          <div>
                            <div className="mb-2 aspect-square overflow-hidden rounded-lg border border-outline bg-gray-100">
                              <img
                                src={`data:image/jpeg;base64,${selectedReport.embeddedImages.original_image_clean}`}
                                alt="Original image"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p className="text-center text-xs text-ink-tertiary">Original image</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4 border-t border-outline pt-4">
                      <p className="text-xs font-bold uppercase tracking-tight text-ink-tertiary">Primary finding</p>
                      <p className="text-lg font-semibold text-warning">
                        {selectedReport.reportData?.header?.result || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-b from-brand-900 to-gray-900 p-5 text-white shadow-lg">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <CheckCircle className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Treatment</h4>
                    </div>
                    <div className="text-sm leading-relaxed text-emerald-50/95">
                      {selectedReport.treatment || 'No treatment specified'}
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-outline bg-surface-muted/60 p-6">
                  <div className="mb-4 flex items-center gap-2 text-brand-ink">
                    <Clock className="h-4 w-4" />
                    <h4 className="text-sm font-semibold">Report Timeline</h4>
                  </div>
                  <div className="relative space-y-4 border-l-2 border-outline pl-6">
                    <div className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full bg-success ring-4 ring-surface-elevated" />
                      <p className="text-sm font-medium text-ink">Report submitted</p>
                      <p className="text-xs text-ink-tertiary">
                        {new Date(selectedReport.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-3 w-3 rounded-full bg-brand ring-4 ring-surface-elevated" />
                      <p className="text-sm font-medium text-ink">Analysis completed</p>
                      <p className="text-xs text-ink-tertiary">
                        {new Date(new Date(selectedReport.createdAt).getTime() + 180000).toLocaleString()}
                      </p>
                    </div>
                    <div className="relative">
                      <span
                        className={`absolute -left-[25px] top-1.5 h-3 w-3 rounded-full ring-4 ring-surface-elevated ${
                          selectedReport.status === 'completed' ? 'bg-success' : 'bg-warning'
                        }`}
                      />
                      <p className="text-sm font-medium text-ink">
                        {selectedReport.status === 'completed' ? 'Completed' : 'In progress'}
                      </p>
                      <p className="text-xs text-ink-tertiary">
                        {selectedReport.status === 'completed'
                          ? new Date(selectedReport.updatedAt || selectedReport.createdAt).toLocaleString()
                          : 'Awaiting completion'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedReport.notes && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-amber-900">Additional Notes</h4>
                    <p className="text-sm text-amber-800">{selectedReport.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-outline bg-gray-50 p-4 sm:p-6">
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