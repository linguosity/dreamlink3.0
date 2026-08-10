import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  // Guard against missing env. Without this, the `!` assertions below hand
  // `undefined` to createServerClient, which then sends requests with no
  // apikey header. Supabase answers "No API key found", auth-checking pages
  // read that as "not signed in" and bounce to /sign-in, and the symptom
  // presents as an unexplained redirect loop rather than a config error.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('Supabase env missing in createClient', {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
    })
  }

  return createServerClient<Database>(
    url!,
    anonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
