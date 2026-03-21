import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  console.log("=== AUTH CALLBACK INITIATED ===", { url: request.url, origin, code: !!code });

  if (code) {
    const supabase = await createClient()
    const { error, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log("=== EXCHANGE CODE RESULT ===", { 
      error: error?.message, 
      hasSession: !!sessionData?.session 
    });

    if (!error) {
      // ── Determine where the user should go ──
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      console.log("=== GET USER RESULT ===", { 
        userId: user?.id, 
        userError: userError?.message 
      });

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

      console.log(`=== REDIRECTING TO ${destination} ===`);

      // ── Build the redirect URL ──
      // By using request.url as the base, we maintain the exact domain the user
      // was on when they triggered the callback (preview vs prod natively).
      // This is infinitely safer than reading NEXT_PUBLIC_SITE_URL on previews.
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  console.log("=== AUTH CALLBACK FAILED - FALLING BACK TO LOGIN ===");
  // Auth failed — send to login with error
  return NextResponse.redirect(new URL(`/login?error=auth_callback_error`, request.url))
}
