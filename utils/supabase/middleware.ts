import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  try {
    // This will refresh session if expired, if the user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    // Handle protected routes
    if (request.nextUrl.pathname.startsWith('/protected') && !user) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
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
    // If error, it's likely because the user is not logged in or auth server is down
    console.error('Middleware session error:', e)
    
    // Handle protected routes and root page on error
    if (request.nextUrl.pathname.startsWith('/protected') || 
        request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    
    // For non-protected routes, just continue without auth
    const pathHeaders = new Headers(request.headers)
    pathHeaders.set('x-pathname', request.nextUrl.pathname)
    
    return NextResponse.next({
      request: {
        headers: pathHeaders,
      },
    })
  }
}
