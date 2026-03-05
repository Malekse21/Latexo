import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { endSession } from '@/src/services/session/end';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const result = await endSession(user.id, sessionId);

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('[sessions/end]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
