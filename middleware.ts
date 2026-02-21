import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Define which paths are protected (require authentication)
  const protectedPaths = [
    '/dashboard',
    '/analytics',
    '/stress-protocol',
    '/digital-twin',
    '/optimization',
    '/settings',
    '/prediction',
    '/crops',
    '/quality-certificate',
    '/ai-assistant',
  ]
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  )
  
  // If the path is protected, check for authentication
  if (isProtectedPath) {
    const token = request.cookies.get('qbm-hydronet-token')?.value
    
    if (!token) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', path)
      return NextResponse.redirect(url)
    }

    // Basic JWT structure check (header.payload.signature)
    // Full cryptographic verification requires jsonwebtoken which isn't edge-compatible,
    // so we verify the token has 3 base64 parts and the payload hasn't expired.
    try {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Malformed token')
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired')
      }
    } catch {
      // Invalid or expired token — redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('qbm-hydronet-token')
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!login|signup|api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)',
  ],
}