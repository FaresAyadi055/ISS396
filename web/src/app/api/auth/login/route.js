import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import { loginUser } from '@/services/user.service'

export async function POST(req) {
  try {
    await connectDB()

    const { email, password } = await req.json()

    const result = await loginUser(email, password)

    const response = NextResponse.json(result, { status: 200 })

    // Set httpOnly cookie
    response.cookies.set('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
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