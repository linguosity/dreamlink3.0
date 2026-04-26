import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getComingSoonEnabled, isAllowedAdminEmail } from '@/lib/siteSettings'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  try {
    // This will refresh session if expired, if the user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Handle protected routes
    if (pathname.startsWith('/protected') && !user) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Handle admin routes — must be authenticated AND have is_admin flag
    let cachedIsAdmin: boolean | null = null
    if (pathname.startsWith('/admin')) {
      if (!user) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }

      // Check admin status via profile table
      const { data: profile } = await supabase
        .from('profile')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      cachedIsAdmin = Boolean(profile?.is_admin)

      if (!cachedIsAdmin) {
        // Non-admin users get redirected to home
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Coming-soon gate: when site_settings.coming_soon_enabled is true,
    // redirect non-admin HTML traffic to /coming-soon. Skips:
    // - /api/* (let APIs handle their own auth; /api/subscribe must work)
    // - /admin/* (already gated above; admin reaching here is admin)
    // - /coming-soon itself (already skipped in proxy.ts; defensive)
    const isApiRoute = pathname.startsWith('/api/')
    const isAdminRoute = pathname.startsWith('/admin')
    const isComingSoonRoute = pathname === '/coming-soon'

    if (!isApiRoute && !isAdminRoute && !isComingSoonRoute) {
      const comingSoonOn = await getComingSoonEnabled()
      if (comingSoonOn) {
        let isAdminUser = false
        if (user) {
          if (isAllowedAdminEmail(user.email)) {
            isAdminUser = true
          } else if (cachedIsAdmin !== null) {
            isAdminUser = cachedIsAdmin
          } else {
            const { data: profile } = await supabase
              .from('profile')
              .select('is_admin')
              .eq('user_id', user.id)
              .single()
            isAdminUser = Boolean(profile?.is_admin)
          }
        }

        if (!isAdminUser) {
          return NextResponse.redirect(new URL('/coming-soon', request.url))
        }
      }
    }

    // Add pathname to headers to make it available in server components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)

    // Create a modified response that preserves response cookies and adds the pathname header
    const finalResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Copy all cookies from the original response to the final response
    response.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie)
    })

    return finalResponse
  } catch (e) {
    // Session refresh failed — most likely a transient network error hitting Supabase's
    // auth server on a cold start. Do NOT clear cookies here: a network blip should
    // not log the user out. The next request will retry the refresh automatically.
    console.error('Middleware session error:', e)

    // Only redirect if on a strictly protected route
    if (request.nextUrl.pathname.startsWith('/protected')) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // For all other routes, pass through and let the page/API handle auth state
    const pathHeaders = new Headers(request.headers)
    pathHeaders.set('x-pathname', request.nextUrl.pathname)

    return NextResponse.next({
      request: { headers: pathHeaders },
    })
  }
}
