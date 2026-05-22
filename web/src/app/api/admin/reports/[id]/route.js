import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import { deleteReport, getReportById, updateReport } from '@/services/report.service'
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

export async function GET(req, { params }) {
  const { id } = await params
  const auth = await requireAdminAuth(req)

  if (auth.error) {
    return auth.error
  }

  try {
    await connectDB()

    const report = await getReportById(id)

    return NextResponse.json({ success: true, report }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 404 }
    )
  }
}

export async function PUT(req, { params }) {
  const { id } = await params
  const auth = await requireAdminAuth(req)

  if (auth.error) {
    return auth.error
  }

  try {
    await connectDB()

    const updateData = await req.json()
    const report = await updateReport(id, updateData)

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 }
    )
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

    const result = await deleteReport(id)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 400 }
    )
  }
}
