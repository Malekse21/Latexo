import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { result, source } = await req.json();
    
    if (!result) {
      return NextResponse.json({ error: 'Missing result parameter' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    
    // We insert anonymously, no user_id required
    const { error } = await supabase.from('feedback').insert({
      result,
      source: source || 'email'
    });

    if (error) {
      console.error('[Feedback API] Insert error:', error);
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Feedback API] Unhandled error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
