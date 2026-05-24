import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// ── Old-browser detection ──────────────────────────────────────────────
// Next.js 16 + React 19 bundles use optional chaining (?.) and nullish
// coalescing (??) syntax, which Safari < 13.1, Chrome < 80, Firefox < 72,
// and any IE can't parse — those users would otherwise see a blank/
// plain-text page. We sniff the UA at the edge and rewrite their request
// to a hand-rolled static HTML page (no JS, no modern CSS) that explains
// the situation and links them to Chrome.
//
// Minimums are intentionally conservative — we only block browsers that
// genuinely can't parse the bundle (set a few versions above the actual
// support floor so we have margin for sub-deps that emit newer syntax).
const BROWSER_MIN_VERSIONS: Record<string, number> = {
  safari: 14, // ?? landed Safari 13.1 — round up for margin
  chrome: 80, // ?? landed Chrome 80
  firefox: 72, // ?? landed Firefox 72
  edge: 80, // Chromium-Edge >= 79; pre-Chromium EdgeHTML always blocked
}

/**
 * Parse a User-Agent string and return { browser, majorVersion } or null
 * for things we can't classify (bots, crawlers, unknowns — let them through).
 */
function detectBrowser(ua: string): { browser: string; major: number } | null {
  if (!ua) return null
  // Bots and crawlers: don't gate. Google et al. should always get the real HTML.
  if (/bot|crawl|spider|preview|fetch|render/i.test(ua)) return null

  // Pre-Chromium Edge (EdgeHTML) — definitely can't run our bundle.
  let m = ua.match(/Edge\/(\d+)/)
  if (m) return { browser: 'edge', major: parseInt(m[1], 10) }
  // New Chromium-based Edge.
  m = ua.match(/Edg\/(\d+)/)
  if (m) return { browser: 'edge', major: parseInt(m[1], 10) }
  // Chrome on iOS (CriOS) — treat as Chrome version.
  m = ua.match(/CriOS\/(\d+)/)
  if (m) return { browser: 'chrome', major: parseInt(m[1], 10) }
  // Firefox on iOS (FxiOS) — treat as Firefox version.
  m = ua.match(/FxiOS\/(\d+)/)
  if (m) return { browser: 'firefox', major: parseInt(m[1], 10) }
  // Desktop / Android Chrome. Must come BEFORE Safari since Chrome UA
  // also contains "Safari/".
  m = ua.match(/Chrome\/(\d+)/)
  if (m) return { browser: 'chrome', major: parseInt(m[1], 10) }
  // Firefox desktop / Android.
  m = ua.match(/Firefox\/(\d+)/)
  if (m) return { browser: 'firefox', major: parseInt(m[1], 10) }
  // Safari (desktop or iOS). Use Version/X.Y rather than Safari/XXXXX
  // because the latter is a build number, not user-facing version.
  m = ua.match(/Version\/(\d+)[.\d]* Safari/)
  if (m) return { browser: 'safari', major: parseInt(m[1], 10) }
  // Old Internet Explorer.
  if (/MSIE \d|Trident\//.test(ua)) return { browser: 'ie', major: 0 }
  return null
}

function isBrowserSupported(ua: string): boolean {
  const detected = detectBrowser(ua)
  if (!detected) return true // unknown UA → assume supported, don't gate
  if (detected.browser === 'ie') return false
  const min = BROWSER_MIN_VERSIONS[detected.browser]
  if (typeof min !== 'number') return true
  return detected.major >= min
}

export async function proxy(request: NextRequest) {
  // ── Browser gate (runs before everything else) ───────────────────────
  // Skip the gate for the gate page itself (no loop), Next internals,
  // and the brand font the page loads. Everything else is checked.
  const path = request.nextUrl.pathname
  const isGatePage =
    path === '/browser-update.html' ||
    path === '/browser-update' ||
    path.startsWith('/fonts/')
  const isStatic = path.startsWith('/_next') ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|otf|woff2?|ttf|map|txt|xml|json)$/.test(path)
  if (!isGatePage && !isStatic) {
    const ua = request.headers.get('user-agent') ?? ''
    if (!isBrowserSupported(ua)) {
      const detected = detectBrowser(ua)
      const target = request.nextUrl.clone()
      target.pathname = '/browser-update.html'
      // Surface what we detected as query params so the page can show
      // "We detected Safari 12" — pure transparency, no tracking.
      target.searchParams.set('b', detected?.browser ?? 'unknown')
      target.searchParams.set('v', String(detected?.major ?? 0))
      return NextResponse.rewrite(target)
    }
  }

  // Skip middleware for non-auth related static resources
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/public') ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }
  
  // Skip auth checks for signin/signup, the coming-soon splash itself, and
  // auth callbacks to avoid redirect loops. The sign-in / sign-up server
  // actions enforce their own admin gate when coming-soon mode is on.
  if (
    request.nextUrl.pathname === '/sign-in' ||
    request.nextUrl.pathname === '/sign-up' ||
    request.nextUrl.pathname === '/forgot-password' ||
    request.nextUrl.pathname === '/coming-soon' ||
    request.nextUrl.pathname.startsWith('/auth/')
  ) {
    // Still needs to process cookies for these pages, but won't redirect
    // Just add the pathname header
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  // For all other routes, run the full auth check
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
