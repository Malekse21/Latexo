import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service role key.
 * Bypasses RLS — use ONLY in server-side admin routes.
 * Does not use cookies or maintain a session.
 */
export async function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
