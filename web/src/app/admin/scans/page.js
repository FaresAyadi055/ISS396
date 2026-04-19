'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import axios from 'axios'
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  User,
  MapPin,
  Calendar,
  X,
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
      <div className="flex-1 overflow-auto bg-gray-50 p-4 lg:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Scans Management</h2>
          <p className="text-gray-500">View all user scan submissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Scans</p>
                <p className="text-2xl font-bold text-gray-800">{filteredScans.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Detections</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredScans.reduce((acc, s) => acc + (s.totalDetections || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">With Reports</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredScans.filter(s => s.hasReport).length}
                </p>
              </div>
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

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 lg:w-96">
              <input
                type="text"
                placeholder="Search by farmer or session..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className={`w-4 h-4 cursor-pointer hover:text-gray-700 ${loading ? 'animate-spin' : ''}`} onClick={fetchScans} />
              <span>{filteredScans.length} scans found</span>
            </div>
          </div>
        </div>

        {/* Scans Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scans</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detections</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredScans.map((scan) => (
                    <tr key={scan._id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{scan.scans?.length || 0}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{scan.totalDetections || 0}</div>
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
                        <button
                          onClick={() => setSelectedScan(scan)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Scan Details</h3>
                  <p className="text-sm text-gray-500">{selectedScan.sessionId}</p>
                </div>
                <button onClick={() => setSelectedScan(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
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

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end">
                <button
                  onClick={() => setSelectedScan(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
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