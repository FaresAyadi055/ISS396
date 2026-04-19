import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import Scan from '@/models/Scan.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production'

export async function GET(req) {
  try {
    // Try to get token from header or cookie
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.split(' ')?.[1] 

    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const user = jwt.verify(token, JWT_SECRET)
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const scans = await Scan.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Scan.countDocuments()

    return NextResponse.json({
      success: true,
      scans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}