/**
 * Session state management via Supabase.
 * 
 * Replaces Redis — uses a `live_sessions` table with JSONB state column.
 * All session state operations go through these typed helpers.
 * Never call supabase directly for session state in routes or services.
 */

import { createClient } from '@supabase/supabase-js';
import { LiveSession } from '../../types/session';

// Use service role key to bypass RLS for session state management
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(url, serviceKey);
}

export async function getSession(userId: string): Promise<LiveSession | null> {
  const supabase = getAdminClient();
  
  const { data, error } = await supabase
    .from('live_sessions')
    .select('state')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data.state as LiveSession;
}

export async function saveSession(
  userId: string,
  session: LiveSession
): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('live_sessions')
    .upsert(
      {
        user_id: userId,
        simulation_id: session.sessionId,
        state: session,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error(`Failed to save session: ${error.message}`);
}

export async function updateSession(
  userId: string,
  updates: Partial<LiveSession>
): Promise<LiveSession> {
  const current = await getSession(userId);
  if (!current) throw new Error('Session not found');

  const updated = { ...current, ...updates };
  await saveSession(userId, updated);
  return updated;
}

export async function deleteSession(userId: string): Promise<void> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('live_sessions')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete session: ${error.message}`);
}

export async function sessionExists(userId: string): Promise<boolean> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('live_sessions')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  return !error && !!data;
}
