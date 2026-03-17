import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Determine where to send the user based on their profile status
      const { data: { user } } = await supabase.auth.getUser()
      let next = '/dashboard'

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('university')
          .eq('id', user.id)
          .single()

        // New user or incomplete profile → onboarding
        if (!profile || !profile.university) {
          next = '/onboarding'
        }
      }

      const host = request.headers.get('host')
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`http://${host}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}

