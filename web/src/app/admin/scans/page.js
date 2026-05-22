'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import SearchInput from '@/components/SearchInput'
import axios from 'axios'
import { 
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  User,
  Calendar,
  X,
  Trash2,
  Image as ImageIcon,
  Layers
} from 'lucide-react'

export default function ScansPage() {
  const [scans, setScans] = useState([])
  const [filteredScans, setFilteredScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalScans, setTotalScans] = useState(0)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedScan, setSelectedScan] = useState(null)
  const [selectedImageSet, setSelectedImageSet] = useState(null)
  const [imageView, setImageView] = useState('masked')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const LIMIT = 10

  useEffect(() => {
    fetchScans()
  }, [page])

  useEffect(() => {
    filterScans()
  }, [searchTerm, dateRange, scans])

  const fetchScans = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const config = {
        headers: {}
      }
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
        console.log('Sending request with token:', token.substring(0, 20) + '...')
      } else {
        console.log('No token found in localStorage!')
      }
      
      const response = await axios.get(`/api/admin/scans?page=${page}&limit=${LIMIT}`, config)
      setScans(response.data.scans || [])
      setFilteredScans(response.data.scans || [])
      setTotalPages(response.data.pagination?.pages || 1)
      setTotalScans(response.data.pagination?.total || 0)
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message)
      setMessage({ type: 'error', text: 'Failed to fetch scans' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scan session? This action cannot be undone.'))
      return

    try {
      const token = localStorage.getItem('adminToken')
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }
      await axios.delete(`/api/admin/scans/${id}`, config)
      setMessage({ type: 'success', text: 'Scan deleted successfully!' })
      fetchScans()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Delete error:', error.response?.data || error.message)
      setMessage({ type: 'error', text: 'Failed to delete scan' })
    }
  }

  const filterScans = () => {
    let filtered = [...scans]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(scan =>
        scan.userId?.name?.toLowerCase().includes(term) ||
        scan.userId?.email?.toLowerCase().includes(term) ||
        scan.sessionId?.toLowerCase().includes(term)
      )
    }
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(scan => {
        const scanDate = new Date(scan.createdAt)
        return scanDate >= new Date(dateRange.start) && scanDate <= new Date(dateRange.end)
      })
    }
    setFilteredScans(filtered)
  }

  const getStatusBadge = (hasReport) => {
    return hasReport 
      ? { className: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle, label: 'Has Report' }
      : { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', Icon: Clock, label: 'No Report' }
  }

  return (
    <>
      <Navbar title="Scans Management" />
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <header className="mb-8">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">Scans Management</h2>
            <p className="flex items-center gap-2 text-sm text-ink-secondary">
              <Calendar className="h-4 w-4 shrink-0" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-brand-ink">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Total Scans</p>
              <p className="text-3xl font-bold tracking-tight text-ink">{filteredScans.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Total Detections</p>
              <p className="text-3xl font-bold tracking-tight text-ink">
                {filteredScans.reduce((acc, s) => acc + (s.totalDetections || 0), 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">With Reports</p>
              <p className="text-3xl font-bold tracking-tight text-ink">
                {filteredScans.filter(s => s.hasReport).length}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-xl border border-outline bg-surface-elevated p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 lg:w-96">
              <SearchInput
                type="search"
                placeholder="Search by farmer or session…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                rounded="xl"
                inputClassName="py-3"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-tertiary">
              <RefreshCw className={`h-4 w-4 cursor-pointer hover:text-brand-ink ${loading ? 'animate-spin' : ''}`} onClick={fetchScans} />
              <span>{filteredScans.length} scans found</span>
            </div>
          </div>
        </div>

        {/* Scans Table */}
        <div className="overflow-hidden rounded-xl border border-outline bg-surface-elevated shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading scans...</span>
              </div>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No scans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-outline bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-secondary">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-secondary">Session</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-ink-secondary">Scans</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-ink-secondary">Detections</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-secondary">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-secondary">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredScans.map((scan) => (
                    <tr key={scan._id} className="transition hover:bg-surface-muted/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{scan.userId?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{scan.userId?.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{scan.sessionId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-ink">{scan.scans?.length || 0}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-ink">{scan.totalDetections || 0}</div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const { className, Icon, label } = getStatusBadge(scan.hasReport)
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${className}`}>
                              <Icon className="w-3 h-3" />
                              {label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedScan(scan)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(scan._id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Scan Details Modal */}
        {selectedScan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-outline bg-surface-elevated shadow-2xl">
              <div className="flex shrink-0 items-start justify-between border-b border-outline bg-surface-elevated p-6">
                <div>
                  <h3 className="text-xl font-bold text-ink">Scan Details</h3>
                  <p className="font-mono text-sm text-ink-tertiary">{selectedScan.sessionId}</p>
                </div>
                <button type="button" onClick={() => setSelectedScan(null)} className="rounded-lg p-2 text-ink-tertiary transition hover:bg-surface-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
                {/* Farmer Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-500">Farmer</span>
                  </div>
                  <p className="font-medium text-gray-800">{selectedScan.userId?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">{selectedScan.userId?.email || 'No email'}</p>
                </div>

                {/* Scan Batches */}
                {selectedScan.scans?.map((scanBatch, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Scan #{idx + 1}</p>
                        <p className="text-xs text-gray-500">{scanBatch.scan_id}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-600">{scanBatch.detections_count} detections</p>
                        <button
                          onClick={() => {
                            setSelectedImageSet(scanBatch)
                            setImageView('masked')
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex shrink-0 justify-end border-t border-outline bg-gray-50 p-6">
                <button
                  type="button"
                  onClick={() => setSelectedScan(null)}
                  className="rounded-lg bg-gray-900 px-6 py-2 text-white transition hover:bg-black"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image View Modal */}
        {selectedImageSet && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setImageView('masked')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      imageView === 'masked' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Masked
                  </button>
                  <button
                    onClick={() => setImageView('clean')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      imageView === 'clean' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Clean
                  </button>
                </div>
                <button
                  onClick={() => setSelectedImageSet(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4">
                {/* Main Image */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    {imageView === 'masked' ? 'Original with Masks' : 'Clean Image'}
                  </h4>
                  <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={`data:image/jpeg;base64,${
                        imageView === 'masked'
                          ? selectedImageSet.original_image_masked
                          : selectedImageSet.original_image_clean
                      }`}
                      alt={imageView === 'masked' ? 'Masked' : 'Clean'}
                      className="max-h-[60vh] object-contain"
                    />
                  </div>
                </div>

                {/* Detections / Masks */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Detections ({selectedImageSet.detections?.length || 0})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedImageSet.detections?.map((det, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="aspect-square bg-gray-900 flex items-center justify-center">
                          <img
                            src={`data:image/jpeg;base64,${det.mask}`}
                            alt={`Mask ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="p-3 bg-white">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Mask #{idx + 1}</span>
                            <span className="text-xs font-medium text-green-600">
                              {(det.classification_results?.best_result?.score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">
                            {det.classification_results?.best_result?.label || 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}