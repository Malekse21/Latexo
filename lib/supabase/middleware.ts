import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  console.log(`\n[Middleware] === START: ${request.nextUrl.pathname} ===`)
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...restOptions } = options
            supabaseResponse.cookies.set(name, value, restOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  console.log('[Middleware] Fetching user session via supabase.auth.getUser()...')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log(`[Middleware] Auth User Result: ${user ? `User Found (ID: ${user.id})` : 'No User'}`)

  // Protected routes logic
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/signup') ||
                      request.nextUrl.pathname.startsWith('/auth')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname.startsWith('/reports') ||
                           request.nextUrl.pathname.startsWith('/simulation') ||
                           request.nextUrl.pathname.startsWith('/structure') ||
                           request.nextUrl.pathname.startsWith('/plagiarism')
  const isOnboardingRoute = request.nextUrl.pathname === '/onboarding'
  const isRootRoute = request.nextUrl.pathname === '/'

  // Helper to create a redirect response that preserves cookies
  const createRedirect = (path: string) => {
    console.log(`[Middleware] Issuing redirect to: ${path}`)
    const url = request.nextUrl.clone()
    url.pathname = path
    const response = NextResponse.redirect(url)
    
    // Copy all cookies from the refreshed supabaseResponse to the redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    
    return response
  }

  // If user is not logged in and tries to access protected routes
  if (!user && (isDashboardRoute || isOnboardingRoute)) {
    console.log(`[Middleware] Unauthenticated access blocked. Redirecting to /login`)
    return createRedirect('/login')
  }

  // If user is logged in
  if (user) {
    // Fetch profile to check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('university')
      .eq('id', user.id)
      .single()
      
    const isProfileComplete = profile && profile.university

    // 1. If hitting login/signup OR root, redirect to appropriate start page
    if (isAuthRoute || isRootRoute) {
      if (isAuthRoute && request.nextUrl.pathname.startsWith('/auth/callback')) {
        console.log(`[Middleware] Allowing /auth/callback to proceed`)
        return supabaseResponse // Allow callback to proceed
      }
      console.log(`[Middleware] Auth/Root route redirect -> isProfileComplete: ${isProfileComplete ? 'true' : 'false'}`)
      return createRedirect(isProfileComplete ? '/dashboard' : '/onboarding')
    }

    // 2. If hitting dashboard but profile incomplete, force onboarding
    if (isDashboardRoute) {
      if (!isProfileComplete) {
        console.log(`[Middleware] Dashboard route accessed but profile incomplete. Redirecting to /onboarding`)
        return createRedirect('/onboarding')
      }
    }

    // 3. If hitting onboarding but profile ALREADY complete, force dashboard
    if (isOnboardingRoute) {
      if (isProfileComplete) {
        console.log(`[Middleware] Onboarding bypassed (already complete). Redirecting to /dashboard`)
        return createRedirect('/dashboard')
      }
    }
  }

  console.log(`[Middleware] === END: Allowed path ${request.nextUrl.pathname} ===\n`)
  return supabaseResponse
}
