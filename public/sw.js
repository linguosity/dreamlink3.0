/*
 * DreamRiver service worker (hand-rolled, no dependencies).
 *
 * Strategy:
 *   - Cache-first for immutable static assets (/_next/static, brand icons,
 *     fonts, images, manifest, favicon).
 *   - Network-first for page navigations, falling back to a previously
 *     cached copy of the page if one exists, else a minimal offline page.
 *   - Everything else (API calls, cross-origin requests such as Supabase
 *     signed URLs, non-GET requests) is left untouched.
 *
 * Bump CACHE_VERSION to invalidate all caches on the next deploy.
 */

const CACHE_VERSION = 1;
const STATIC_CACHE = `dreamriver-static-v${CACHE_VERSION}`;

const STATIC_PREFIXES = [
  "/_next/static/",
  "/brand/",
  "/fonts/",
  "/images/",
  "/textures/",
];

const STATIC_FILES = ["/favicon.ico", "/site.webmanifest"];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline — DreamRiver</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0E1A30;color:#e7ecf5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center}
  main{padding:24px;max-width:420px}
  h1{font-size:22px;font-weight:600;margin:0 0 8px}
  p{margin:0 0 20px;color:#9fb0cc;font-size:15px;line-height:1.5}
  button{background:#e7ecf5;color:#0E1A30;border:0;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer}
</style>
</head>
<body>
<main>
  <h1>You&#39;re offline</h1>
  <p>DreamRiver needs a connection to load this page. Your dreams are safe — reconnect and try again.</p>
  <button onclick="location.reload()">Try again</button>
</main>
</body>
</html>`;

self.addEventListener("install", () => {
  // Activate the new worker immediately instead of waiting for old tabs.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous CACHE_VERSIONs.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("dreamriver-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    STATIC_FILES.includes(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    try {
      await cache.put(request, response.clone());
    } catch {
      // Storage quota exceeded or similar — serve without caching.
    }
  }
  return response;
}

async function networkFirstPage(request) {
  try {
    return await fetch(request);
  } catch {
    // Offline: serve a cached copy of this page if we ever stored one,
    // otherwise the minimal offline fallback.
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle same-origin GETs. API routes stay untouched so auth,
  // Stripe, and dream generation never see stale responses.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
