'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Search, Filter, Download } from 'lucide-react'

export default function Table({ 
  columns, 
  data, 
  actions,
  title,
  onExport,
  onFilter,
  itemsPerPage = 10 
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Sorting logic
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0
    
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Search logic
  const filteredData = sortedData.filter(row => {
    if (!searchTerm) return true
    return columns.some(col => {
      const value = row[col.key]
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column.key) {
      return <ChevronUp className="h-4 w-4 text-ink-tertiary opacity-0 transition group-hover:opacity-100" />
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-brand-ink" />
    ) : (
      <ChevronDown className="h-4 w-4 text-brand-ink" />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline bg-surface-elevated shadow-sm">
      {/* Table Header with Actions */}
      <div className="flex flex-col gap-4 border-b border-outline p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {title && <h3 className="font-semibold text-ink">{title}</h3>}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">


          
          {/* Export Button */}
          {onExport && (
            <button
              onClick={onExport}
              className="rounded-lg border border-outline bg-surface-elevated p-2 transition hover:bg-surface-muted"
            >
              <Download className="h-4 w-4 text-ink-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && onFilter && (
        <div className="border-b border-outline bg-surface-muted/80 p-4">
          {onFilter()}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-outline bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left"
                >
                  {col.sortable !== false ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="group flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-secondary hover:text-ink"
                    >
                      {col.label}
                      <SortIcon column={col} />
                    </button>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                    Actions
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
                      <Search className="h-6 w-6 text-ink-tertiary" />
                    </div>
                    <p className="font-medium text-ink">No data found</p>
                    <p className="text-sm text-ink-tertiary">Try adjusting your search or filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-outline/80 transition last:border-0 hover:bg-surface-muted/60"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="text-sm text-ink-secondary">
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key]}
                      </div>
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-outline bg-gray-50 px-6 py-3">
          <p className="text-sm text-ink-tertiary">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-outline bg-surface-elevated px-3 py-1 text-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`rounded-lg px-3 py-1 text-sm transition ${
                  currentPage === i + 1
                    ? 'bg-gray-900 font-medium text-white shadow-sm'
                    : 'border border-outline bg-surface-elevated hover:bg-surface-muted'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-outline bg-surface-elevated px-3 py-1 text-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}