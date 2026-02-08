'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Table from '@/components/Table'
import Button from '@/components/Button'
import axios from 'axios'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [message, setMessage] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  const LIMIT = 10

  useEffect(() => {
    fetchReports()
  }, [page])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `/api/admin/reports?page=${page}&limit=${LIMIT}`
      )
      setReports(response.data.reports || [])
      setTotalPages(response.data.pagination?.pages || 1)
    } catch (error) {
      setMessage('Failed to fetch reports')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report?'))
      return

    try {
      await axios.delete(`/api/admin/reports/${id}`)
      setMessage('Report deleted successfully')
      fetchReports()
    } catch (error) {
      setMessage('Failed to delete report')
    }
  }

  const columns = [
    {
      key: 'farmerId',
      label: 'Farmer',
      render: (value) => value?.name || 'Unknown',
    },
    { key: 'diagnosis', label: 'Diagnosis' },
    {
      key: 'treatment',
      label: 'Treatment',
      render: (value) => value?.substring(0, 50) + '...',
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <>
      <Navbar title="Reports" />
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes('Failed')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black">
            All Reports
          </h2>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={reports}
              actions={(report) => (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                  >
                    View
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(report._id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            />
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next →
            </Button>
          </div>
        )}

        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-black">
                  Report Details
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-2xl text-gray-600 hover:text-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Farmer</p>
                  <p className="text-black">
                    {selectedReport.farmerId?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Email
                  </p>
                  <p className="text-black">
                    {selectedReport.farmerId?.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Image URL
                  </p>
                  <p className="text-black break-all text-sm">
                    {selectedReport.imageUrl}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Diagnosis
                  </p>
                  <p className="text-black">
                    {selectedReport.diagnosis}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Treatment
                  </p>
                  <p className="text-black">
                    {selectedReport.treatment}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Created
                  </p>
                  <p className="text-black">
                    {new Date(
                      selectedReport.createdAt
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    handleDelete(selectedReport._id)
                    setSelectedReport(null)
                  }}
                >
                  Delete Report
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
