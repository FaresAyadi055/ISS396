import User from '../models/User.js'
import { generateToken } from '../lib/auth.js'

// Login user
export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password required')
  }

  // Find user and select password field
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    throw new Error('Invalid email or password')
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  // Generate token
  const token = generateToken(user)

  return {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
}

// Create user (admin can create farmers)
export const createUser = async (userData) => {
  const { name, email, password, role } = userData

  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required')
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new Error('User already exists with this email')
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'farmer',
  })

  return {
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }
}

// Get all farmers
export const getAllFarmers = async () => {
  const farmers = await User.find({ role: 'farmer' }).select(
    '-password'
  )
  return farmers
}

// Get farmer by ID
export const getFarmerById = async (id) => {
  const farmer = await User.findById(id).select('-password')
  if (!farmer) {
    throw new Error('Farmer not found')
  }
  return farmer
}

// Update farmer
export const updateFarmer = async (id, updateData) => {
  // Don't allow password update through this endpoint
  const { password, role, ...safeData } = updateData

  const farmer = await User.findByIdAndUpdate(id, safeData, {
    new: true,
    runValidators: true,
  }).select('-password')

  if (!farmer) {
    throw new Error('Farmer not found')
  }

  return farmer
}

// Delete farmer
export const deleteFarmer = async (id) => {
  const farmer = await User.findByIdAndDelete(id)

  if (!farmer) {
    throw new Error('Farmer not found')
  }

  return {
    success: true,
    message: 'Farmer deleted successfully',
  }
}
