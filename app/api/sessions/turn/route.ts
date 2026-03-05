import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processTurn } from '@/src/services/session/turn';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { answer, silenceDuration = 0 } = await request.json();

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json({ error: 'Answer required (string)' }, { status: 400 });
    }

    const result = await processTurn(
      user.id,
      answer,
      silenceDuration
    );

    return NextResponse.json(result);

  } catch (err: any) {
    const STATUS: Record<string, number> = {
      SESSION_NOT_FOUND: 404,
      NO_CURRENT_QUESTION: 400,
    };

    const status = STATUS[err.message] ?? 500;
    console.error('[sessions/turn]', err.message);
    return NextResponse.json({ error: err.message }, { status });
  }
}
