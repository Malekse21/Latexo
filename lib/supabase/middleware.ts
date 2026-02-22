import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    return createRedirect('/login')
  }

  // If user is logged in
  if (user) {
    // Fetch profile to check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
      
    const isProfileComplete = profile && profile.full_name

    // 1. If hitting login/signup OR root, redirect to appropriate start page
    if (isAuthRoute || isRootRoute) {
      if (isAuthRoute && request.nextUrl.pathname.startsWith('/auth/callback')) {
        return supabaseResponse // Allow callback to proceed
      }
      return createRedirect(isProfileComplete ? '/dashboard' : '/onboarding')
    }

    // 2. If hitting dashboard but profile incomplete, force onboarding
    if (isDashboardRoute) {
      if (!isProfileComplete) {
        return createRedirect('/onboarding')
      }
    }

    // 3. If hitting onboarding but profile ALREADY complete, force dashboard
    if (isOnboardingRoute) {
      if (isProfileComplete) {
        return createRedirect('/dashboard')
      }
    }
  }

  return supabaseResponse
}
