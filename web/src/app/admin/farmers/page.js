'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Table from '@/components/Table'
import Button from '@/components/Button'
import FormInput from '@/components/FormInput'
import SearchInput from '@/components/SearchInput'
import axios from 'axios'
import { 
  Users, 
  UserPlus, 
  Filter, 
  Download, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Eye
} from 'lucide-react'

export default function FarmersPage() {
  const [farmers, setFarmers] = useState([])
  const [filteredFarmers, setFilteredFarmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    farmSize: '',
    cropType: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCrop, setSelectedCrop] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFarmer, setSelectedFarmer] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchFarmers()
  }, [])

  useEffect(() => {
    filterFarmers()
  }, [searchTerm, selectedStatus, selectedCrop, farmers])

  const fetchFarmers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/farmers')
      // Add mock data for demonstration
      const farmersData = (response.data.farmers || []).map((farmer, index) => ({
        ...farmer,
        phone: farmer.phone || `+1 ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        address: farmer.address || `${Math.floor(Math.random() * 9000) + 1000} Main St, Farmville, ST ${Math.floor(Math.random() * 90000) + 10000}`,
        farmSize: farmer.farmSize || `${Math.floor(Math.random() * 50) + 10} acres`,
        cropType: farmer.cropType || ['Wheat', 'Corn', 'Soybeans', 'Rice', 'Cotton'][Math.floor(Math.random() * 5)],
        status: Math.random() > 0.2 ? 'active' : 'inactive',
        lastActive: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
        reportsCount: Math.floor(Math.random() * 20),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(farmer.name)}&background=10b981&color=fff&size=128`,
      }))
      setFarmers(farmersData)
      setFilteredFarmers(farmersData)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch farmers. Please try again.' 
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filterFarmers = () => {
    let filtered = [...farmers]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(farmer => 
        farmer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.phone?.includes(searchTerm) ||
        farmer.cropType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(farmer => farmer.status === selectedStatus)
    }

    // Apply crop filter
    if (selectedCrop !== 'all') {
      filtered = filtered.filter(farmer => farmer.cropType === selectedCrop)
    }

    setFilteredFarmers(filtered)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (!editingId && !formData.password) newErrors.password = 'Password is required'
    if (formData.phone && !/^\+?[\d\s-]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      if (editingId) {
        await axios.put(`/api/admin/farmers/${editingId}`, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          farmSize: formData.farmSize,
          cropType: formData.cropType,
        })
        setMessage({ 
          type: 'success', 
          text: 'Farmer updated successfully!' 
        })
      } else {
        await axios.post('/api/admin/farmers', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          farmSize: formData.farmSize,
          cropType: formData.cropType,
        })
        setMessage({ 
          type: 'success', 
          text: 'Farmer created successfully!' 
        })
      }

      resetForm()
      fetchFarmers()
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to save farmer' 
      })
    }
  }

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name || '',
      email: farmer.email || '',
      phone: farmer.phone || '',
      address: farmer.address || '',
      farmSize: farmer.farmSize || '',
      cropType: farmer.cropType || '',
      password: '',
    })
    setEditingId(farmer._id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this farmer? This action cannot be undone.')) return

    try {
      await axios.delete(`/api/admin/farmers/${id}`)
      setMessage({ 
        type: 'success', 
        text: 'Farmer deleted successfully!' 
      })
      fetchFarmers()
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete farmer' 
      })
    }
  }

  const handleViewDetails = (farmer) => {
    setSelectedFarmer(farmer)
    setShowDetails(true)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Create CSV content
      const headers = ['Name', 'Email', 'Phone', 'Crop Type', 'Farm Size', 'Status', 'Reports', 'Last Active']
      const csvContent = [
        headers.join(','),
        ...filteredFarmers.map(f => 
          [f.name, f.email, f.phone, f.cropType, f.farmSize, f.status, f.reportsCount, new Date(f.lastActive).toLocaleDateString()].join(',')
        )
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `farmers_export_${new Date().toISOString().split('T')[0]}.csv`
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      farmSize: '',
      cropType: '',
      password: '',
    })
    setErrors({})
    setEditingId(null)
    setShowForm(false)
  }

  // Get unique crop types for filter
  const cropTypes = ['all', ...new Set(farmers.map(f => f.cropType).filter(Boolean))]

  const columns = [
    {
      key: 'name',
      label: 'Farmer',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img 
            src={row.avatar} 
            alt={value}
            className="w-10 h-10 rounded-full bg-gray-200"
          />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">ID: {row._id?.slice(-6)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'cropType',
      label: 'Crop & Farm',
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900">{value || 'N/A'}</div>
          <div className="text-xs text-gray-500">{row.farmSize || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
          value === 'active' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}>
          {value === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
          {value}
        </span>
      ),
    },
    {
      key: 'reportsCount',
      label: 'Reports',
      render: (value) => (
        <div className="text-sm text-gray-900">
          {value} total
        </div>
      ),
    },
    {
      key: 'lastActive',
      label: 'Last Active',
      render: (value) => (
        <div className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
  ]

  // Calculate statistics
  const stats = {
    total: farmers.length,
    active: farmers.filter(f => f.status === 'active').length,
    inactive: farmers.filter(f => f.status === 'inactive').length,
    newThisMonth: farmers.filter(f => {
      const date = new Date(f.createdAt || Date.now())
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <>
      <Navbar title="Farmer Management" />
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Farmer Management
              </h2>
              <p className="max-w-xl text-ink-secondary">
                Manage and monitor all registered farmers in your system
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleExport}
                variant="outline"
                icon={Download}
                loading={exporting}
              >
                Export
              </Button>
              <Button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                variant="primary"
                icon={UserPlus}
                size="lg"
              >
                Add New Farmer
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-ink">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Total Farmers</p>
                <p className="text-3xl font-bold tracking-tight text-ink">{stats.total}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <UserCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Active Farmers</p>
                <p className="text-3xl font-bold tracking-tight text-ink">{stats.active}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-ink-secondary">
                <UserX className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Inactive</p>
                <p className="text-3xl font-bold tracking-tight text-ink">{stats.inactive}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-elevated p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                <Calendar className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">New This Month</p>
                <p className="text-3xl font-bold tracking-tight text-ink">{stats.newThisMonth}</p>
              </div>
            </div>
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

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">
                  {editingId ? 'Edit Farmer' : 'Add New Farmer'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingId 
                    ? 'Update the farmer\'s information below' 
                    : 'Fill in the details to create a new farmer account'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Full Name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={errors.name}
                  required
                  icon={Users}
                />

                <FormInput
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={errors.email}
                  required
                  icon={Mail}
                />

                <FormInput
                  label="Phone Number"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={errors.phone}
                  icon={Phone}
                />

                {!editingId && (
                  <FormInput
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    required
                    icon={Eye}
                  />
                )}

                <FormInput
                  label="Farm Size"
                  placeholder="50 acres"
                  value={formData.farmSize}
                  onChange={(e) => setFormData({ ...formData, farmSize: e.target.value })}
                />

                <FormInput
                  label="Primary Crop"
                  placeholder="Wheat, Corn, etc."
                  value={formData.cropType}
                  onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                />

                <div className="md:col-span-2">
                  <FormInput
                    label="Address"
                    placeholder="123 Farm Road, Rural County, ST 12345"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    icon={MapPin}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <Button type="submit" variant="primary" size="lg">
                  {editingId ? 'Update Farmer' : 'Create Farmer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 overflow-hidden rounded-xl border border-outline bg-surface-elevated p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 lg:w-80">
                <SearchInput
                  type="search"
                  placeholder="Search farmers by name, email, or crop…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  inputClassName="focus:ring-0"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 border rounded-xl transition ${
                  showFilters || selectedStatus !== 'all' || selectedCrop !== 'all'
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
                onClick={fetchFarmers}
              />
              <span>{filteredFarmers.length} farmers found</span>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Crop Type
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                >
                  <option value="all">All Crops</option>
                  {cropTypes.filter(c => c !== 'all').map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedStatus('all')
                    setSelectedCrop('all')
                  }}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Farmers Table */}
        <div className="mb-6 overflow-hidden rounded-xl border border-outline bg-surface-elevated shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading farmers...</span>
              </div>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={filteredFarmers}
                actions={(farmer) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(farmer)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(farmer)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(farmer._id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            </>
          )}
        </div>

        {/* Farmer Details Modal */}
        {showDetails && selectedFarmer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-outline bg-surface-elevated shadow-2xl">
              <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedFarmer.avatar} 
                    alt={selectedFarmer.name}
                    className="w-16 h-16 rounded-full bg-gray-200"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {selectedFarmer.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Member since {new Date(selectedFarmer.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedFarmer.email}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedFarmer.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedFarmer.address}</span>
                    </div>
                  </div>
                </div>

                {/* Farm Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Farm Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Farm Size</p>
                      <p className="text-sm font-medium text-gray-800">{selectedFarmer.farmSize}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Primary Crop</p>
                      <p className="text-sm font-medium text-gray-800">{selectedFarmer.cropType}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Total Reports</p>
                      <p className="text-sm font-medium text-gray-800">{selectedFarmer.reportsCount}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedFarmer.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedFarmer.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">Submitted a new diagnostic report</p>
                          <p className="text-xs text-gray-500">{i} day{i > 1 ? 's' : ''} ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowDetails(false)
                    handleEdit(selectedFarmer)
                  }}
                >
                  Edit Farmer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
} 