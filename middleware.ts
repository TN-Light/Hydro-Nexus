import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname
  
  // Define which paths are protected (require authentication)
  const protectedPaths = [
    '/dashboard',
    '/analytics',
    '/devices',
    '/digital-twin',
    '/optimization',
    '/settings',
  ]
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  )
  
  // If the path is protected, check for authentication
  if (isProtectedPath) {
    // Get the auth token from cookies
    const token = request.cookies.get('hydro-nexus-token')?.value
    
    // If there is no token, redirect to login
    if (!token) {
      console.log(`No token found for protected path: ${path}`)
      const url = new URL('/login', request.url)
      url.searchParams.set('from', path)
      return NextResponse.redirect(url)
    }
    
    console.log(`Access granted to protected path: ${path}`)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except for login, api routes, static files, etc.
    '/((?!login|_next/static|_next/image|favicon.ico).*)',
  ],
}