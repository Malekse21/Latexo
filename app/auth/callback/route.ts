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
      // Use NEXT_PUBLIC_SITE_URL if defined (production), fallback to VERCEL_URL for previews,
      // and finally local host for development.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
        ? process.env.NEXT_PUBLIC_SITE_URL 
        : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : `http://${request.headers.get('host')}`;

      const baseUrl = siteUrl.replace(/\/$/, '');
      return NextResponse.redirect(`${baseUrl}${destination}`);
    }
  }

  // Auth failed — send to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
