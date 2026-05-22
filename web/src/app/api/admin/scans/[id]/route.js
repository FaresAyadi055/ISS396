import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import Scan from '@/models/Scan.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production'

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

export async function DELETE(req, { params }) {
  const { id } = await params
  const auth = await requireAdminAuth(req)

  if (auth.error) {
    return auth.error
  }

  try {
    await connectDB()

    const deletedScan = await Scan.findByIdAndDelete(id)

    if (!deletedScan) {
      return NextResponse.json(
        { success: false, message: 'Scan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Scan session deleted successfully'
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
