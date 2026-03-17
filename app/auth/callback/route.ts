import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // ── Determine where the user should go ──
      // Instead of always redirecting to /dashboard and relying on
      // middleware to re-redirect new users, we check the profile here
      // to avoid a double-redirect that can break on Vercel.
      const { data: { user } } = await supabase.auth.getUser()
      
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

      // ── Build the redirect URL ──
      // On Vercel, x-forwarded-host gives us the real domain.
      // Locally, we use the host header directly.
      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = request.headers.get('host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`http://${host}${destination}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`)
      } else {
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  // Auth failed — send to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
