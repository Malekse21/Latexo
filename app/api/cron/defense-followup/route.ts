import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendDefenseFollowupEmail } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify Authentication (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    
    // 2. Identify Target Date (Today in local format YYYY-MM-DD)
    // We adjust to Tunisia time if strictly needed, but typically 
    // we match on the date stored in DB.
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[Cron] Starting defense follow-up scan for date: ${today}`);

    // 3. Query profiles where defense_date matches today
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, full_name, defense_date')
      .eq('defense_date', today)
      .not('email', 'is', null);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('[Cron] No defenses matching today. Exiting.');
      return NextResponse.json({ message: 'No users found for today' });
    }

    console.log(`[Cron] Found ${users.length} user(s) defending today. Sending emails...`);

    // 4. Dispatch Emails in Parallel
    const results = await Promise.allSettled(
      users.map(user => 
        sendDefenseFollowupEmail(user.email!, user.full_name || 'Étudiant')
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`[Cron] Finished. Success: ${successful}, Failed: ${failed}`);

    return NextResponse.json({
      processed: users.length,
      successful,
      failed
    });

  } catch (error: any) {
    console.error('[Cron] Error in defense-followup:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
