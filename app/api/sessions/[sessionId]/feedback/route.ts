import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(
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

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Read feedback from the simulations table directly
    const { data: simulation, error } = await admin
      .from('simulations')
      .select('final_grade, mention, feedback, jury_feedback, ended_at')
      .eq('id', sessionId)
      .single();

    if (error || !simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    return NextResponse.json({
      score: simulation.final_grade,
      mention: simulation.mention,
      strengths: simulation.feedback?.strengths || [],
      weaknesses: simulation.feedback?.weaknesses || [],
      newWeakTopics: simulation.feedback?.newWeakTopics || [],
      juryComment: simulation.jury_feedback?.jury_comment || '',
      endedAt: simulation.ended_at,
    });

  } catch (err: any) {
    console.error('[sessions/feedback]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
