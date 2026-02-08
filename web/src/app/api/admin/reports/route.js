import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import { getAllReports } from '@/services/report.service'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production'

// Auth middleware
async function requireAdminAuth(req) {
  try {
    const token =
      req.headers.get('authorization')?.split(' ')?.[1] ||
      req.cookies?.get('token')?.value

    if (!token) {
      return {
        error: NextResponse.json(
          { success: false, message: 'No token provided' },
          { status: 401 }
        ),
      }
    }

    const user = jwt.verify(token, JWT_SECRET)

    if (user.role !== 'admin') {
      return {
        error: NextResponse.json(
          { success: false, message: 'Admin access required' },
          { status: 403 }
        ),
      }
    }

    return { user }
  } catch (error) {
    return {
      error: NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      ),
    }
  }
}

// GET all reports
export async function GET(req) {
  const auth = await requireAdminAuth(req)

  if (auth.error) {
    return auth.error
  }

  try {
    await connectDB()

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

    const result = await getAllReports(page, limit)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    )
  }
}
