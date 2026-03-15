import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startSession } from '@/src/services/session/setup';
import { SessionDuration } from '@/src/types/session';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, durationMinutes, difficulty } = await request.json();

    if (![5, 15, 20, 30, 45, 60].includes(durationMinutes)) {
      return NextResponse.json({ error: 'Invalid duration. Must be 5, 15, 20, 30, 45, or 60.' }, { status: 400 });
    }

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const result = await startSession(
      user.id,
      reportId,
      durationMinutes as SessionDuration,
      difficulty || 'standard'
    );

    return NextResponse.json(result);

  } catch (err: any) {
    const STATUS: Record<string, number> = {
      SESSION_ALREADY_ACTIVE: 409,
      INSUFFICIENT_CREDITS: 402,
      REPORT_NOT_FOUND: 404,
      CREDIT_DEDUCTION_FAILED: 500,
    };

    const status = STATUS[err.message] ?? 500;
    console.error('[sessions/start]', err.message);
    return NextResponse.json({ error: err.message }, { status });
  }
}
