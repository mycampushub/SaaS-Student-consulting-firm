import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      )
    }

    // Check if subdomain is valid
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json({
        available: false,
        message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      })
    }

    // Check if subdomain is already taken
    const existingAgency = await db.agency.findUnique({
      where: { subdomain }
    })

    if (existingAgency) {
      return NextResponse.json({
        available: false,
        message: 'Subdomain is already taken'
      })
    }

    // Check for reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'dashboard', 'app', 'blog', 'docs', 'help',
      'support', 'status', 'staging', 'dev', 'test', 'localhost', 'mail',
      'email', 'ftp', 'cdn', 'static', 'assets', 'images', 'files'
    ]

    if (reservedSubdomains.includes(subdomain)) {
      return NextResponse.json({
        available: false,
        message: 'This subdomain is reserved'
      })
    }

    return NextResponse.json({
      available: true,
      message: 'Subdomain is available'
    })

  } catch (error) {
    console.error('Error checking subdomain:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}