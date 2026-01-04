import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Paths that should bypass maintenance check
const BYPASS_PATHS = [
  '/api',
  '/admin',
  '/maintenance',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip maintenance check for API, admin, or maintenance page itself
  if (BYPASS_PATHS.some(path => pathname.startsWith(path))) {
    // Continue with normal auth flow
  } else {
    // Check maintenance mode
    try {
      const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data, error } = await supabaseAdmin
        .from('maintenance')
        .select('enabled, title, message, start_at, end_at')
        .eq('enabled', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any

      if (!error && data?.enabled) {
        // Check time range if specified
        const now = new Date()
        if (data.start_at && now < new Date(data.start_at)) {
          // Not started yet, continue
        } else if (data.end_at && now > new Date(data.end_at)) {
          // Already ended, continue
        } else {
          // Maintenance is active, redirect to maintenance page
          const url = request.nextUrl.clone()
          url.pathname = '/maintenance'
          return NextResponse.redirect(url)
        }
      }
    } catch (err) {
      console.error('[Middleware] Maintenance check error:', err)
      // Continue normally on error
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookie in request
            request.cookies.set(name, value)
          })
          
          // Set cookie in response
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - important for any Server Component routes.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Handle auth callback specially
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    // Don't redirect auth callback, let it handle the flow
    return supabaseResponse
  }

  // Only protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
