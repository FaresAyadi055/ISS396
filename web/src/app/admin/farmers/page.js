'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Table from '@/components/Table'
import Button from '@/components/Button'
import FormInput from '@/components/FormInput'
import axios from 'axios'

export default function FarmersPage() {
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchFarmers()
  }, [])

  const fetchFarmers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/farmers')
      console.log(response.data)
      setFarmers(response.data.farmers || [])
    } catch (error) {
      setMessage('Failed to fetch farmers')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name) newErrors.name = 'Name is required'
    if (!formData.email) newErrors.email = 'Email is required'
    if (!editingId && !formData.password)
      newErrors.password = 'Password is required'

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
        // Update farmer
        await axios.put(`/api/admin/farmers/${editingId}`, {
          name: formData.name,
          email: formData.email,
        })
        setMessage('Farmer updated successfully')
      } else {
        // Create farmer
        await axios.post('/api/admin/farmers', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        })
        setMessage('Farmer created successfully')
      }

      resetForm()
      fetchFarmers()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save farmer')
    }
  }

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name,
      email: farmer.email,
      password: '',
    })
    setEditingId(farmer._id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this farmer?')) return

    try {
      await axios.delete(`/api/admin/farmers/${id}`)
      setMessage('Farmer deleted successfully')
      fetchFarmers()
    } catch (error) {
      setMessage('Failed to delete farmer')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' })
    setErrors({})
    setEditingId(null)
    setShowForm(false)
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ]

  return (
    <>
      <Navbar title="Farmer Management" />
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.includes('Failed') || message.includes('delete')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black">Farmers</h2>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'secondary' : 'primary'}
          >
            {showForm ? '✕ Cancel' : '+ Add Farmer'}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-black mb-4">
              {editingId ? 'Edit Farmer' : 'Add New Farmer'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                error={errors.name}
              />

              <FormInput
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                error={errors.email}
              />

              {!editingId && (
                <FormInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  error={errors.password}
                />
              )}

              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  {editingId ? 'Update' : 'Create'} Farmer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                >
                  Clear
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={farmers}
              actions={(farmer) => (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(farmer)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(farmer._id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            />
          )}
        </div>
      </div>
    </>
  )
}
