import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const cookieStore = await cookies()
    
    // Create a dedicated Supabase client for this route handler
    // This ensures cookies are read/written correctly during the exchange
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options })
            )
          },
        },
      }
    )

    const { error: exchangeError, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      // ── Determine where the user should go ──
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      let destination = '/dashboard'
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('university')
          .eq('id', user.id)
          .single()
        
        // New user (no university) → onboarding
        if (!profile?.university) {
          destination = '/onboarding'
        }
      }
      // Use the origin from the request URL to stay on the same domain
      return NextResponse.redirect(new URL(destination, origin))
    }

    // Exchange failed — include the error detail for debugging
    console.error("=== EXCHANGE FAILED ===", exchangeError?.message);
    return NextResponse.redirect(
      new URL(`/login?error=auth_callback_error&detail=${encodeURIComponent(exchangeError?.message || 'unknown')}`, origin)
    )
  }
  return NextResponse.redirect(new URL('/login?error=auth_callback_error&detail=no_code', request.url))
}
