import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Maintenance mode check
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
  const isMaintenanceRoute = request.nextUrl.pathname.startsWith('/maintenance')

  // Exclude API routes from redirecting to a UI page to avoid HTML responses
  // Instead, API routes should just return 503 Service Unavailable if needed, 
  // but for simplicity we'll just ignore maintenance block for pure API background calls
  // or we can block them too. Let's redirect everything for now or just pages.
  if (isMaintenanceMode && !isMaintenanceRoute && !request.nextUrl.pathname.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    return NextResponse.redirect(url)
  }

  // If maintenance mode is off but someone tries to view the maintenance page, redirect to home
  if (!isMaintenanceMode && isMaintenanceRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (err) {
    console.warn('Supabase auth failed (backend deleted/unreachable):', err)
  }
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
      .select('university')
      .eq('id', user.id)
      .single()
      
    const isProfileComplete = profile && profile.university
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
