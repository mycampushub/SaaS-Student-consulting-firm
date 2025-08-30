import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Skip middleware for API routes and static files
  if (
    hostname.includes('localhost') && 
    (request.nextUrl.pathname.startsWith('/api/') || 
     request.nextUrl.pathname.startsWith('/_next/') ||
     request.nextUrl.pathname.startsWith('/static/') ||
     request.nextUrl.pathname.includes('.') ||
     request.nextUrl.pathname === '/signup/success')
  ) {
    return NextResponse.next()
  }

  // Handle localhost development with subdomains
  if (hostname.includes('localhost')) {
    const subdomain = hostname.split('.')[0]
    
    // Skip if it's the main localhost or known routes
    if (subdomain === 'localhost' || subdomain === 'www') {
      return NextResponse.next()
    }

    // For development, we'll allow any subdomain to access the dashboard
    // In production, you would validate against the database here
    if (subdomain && subdomain.length > 2) {
      // Rewrite the URL to the subdomain route
      const url = request.nextUrl.clone()
      url.pathname = `/${subdomain}${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}