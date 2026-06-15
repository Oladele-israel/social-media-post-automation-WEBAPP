// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only redirect away from these when NOT logged in
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/posts',
  '/scheduler',
  '/settings',
  '/onboarding',
]

// Only redirect away from these when already logged in
const GUEST_ONLY_PATHS = [
  '/login',
  '/signup',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Skip everything that isn't a real page ─────────────────────────────────
  // Never run redirect logic on these — causes loops
  if (
    pathname.startsWith('/_next') ||       // Next.js internals
    pathname.startsWith('/api') ||          // API routes
    pathname.startsWith('/favicon') ||      // favicon
    pathname.includes('.')                  // static files (.png, .css, .js etc)
  ) {
    return NextResponse.next()
  }

  const hasRefreshToken = request.cookies.has('refresh_token')

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isGuestOnly = GUEST_ONLY_PATHS.some((p) => pathname === p) // exact match

  // Not logged in → trying to access protected page → send to login
  if (isProtected && !hasRefreshToken) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // Logged in → trying to access login/signup → send to dashboard
  // ONLY redirect if they're going to exactly /login or /signup
  // NOT if they have a ?from= param that leads back somewhere
  if (isGuestOnly && hasRefreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Be explicit — only run on these paths
  // Do NOT use a catch-all that matches everything
  matcher: [
    '/dashboard/:path*',
    '/posts/:path*',
    '/scheduler/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/login',
    '/signup',
  ],
}