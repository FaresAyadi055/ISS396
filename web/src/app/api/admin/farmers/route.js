import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import { verifyToken, requireAdmin } from '@/lib/auth'
import {
  createUser,
  getAllFarmers,
  updateFarmer,
  deleteFarmer,
} from '@/services/user.service'

// Custom middleware wrapper
function withAuth(handler) {
  return async (req) => {
    // Verify token
    let user = null
    try {
      const token =
        req.headers.get('authorization')?.split(' ')?.[1] ||
        req.cookies?.get('token')?.value

      if (!token) {
        return NextResponse.json(
          { success: false, message: 'No token provided' },
          { status: 401 }
        )
      }

      const jwt = await import('jsonwebtoken')
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production'
      user = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check admin role
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    return handler(req, user)
  }
}

// GET all farmers
export const GET = withAuth(async (req, user) => {
  try {
    await connectDB()
    const farmers = await getAllFarmers()

    return NextResponse.json(
      {
        success: true,
        farmers,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    )
  }
})

// POST create new farmer
export const POST = withAuth(async (req, user) => {
  try {
    await connectDB()

    const { name, email, password } = await req.json()

    const result = await createUser({
      name,
      email,
      password,
      role: 'farmer',
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 }
    )
  }
})
