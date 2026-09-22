import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service role key.
 * Bypasses RLS — use ONLY in server-side admin routes.
 * Does not use cookies or maintain a session.
 */
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'placeholder';

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
