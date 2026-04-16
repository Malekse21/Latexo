import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient();
    const { orderId } = await params;

    // ── Auth ──────────────────────────────────────
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié.' },
        { status: 401 }
      );
    }

    // ── Fetch order ──────────────────────────────
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, user_id, status, credits, confirmed_at, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('[payments/status] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Erreur serveur.' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Commande introuvable.' },
        { status: 404 }
      );
    }

    // ── Ownership check ──────────────────────────
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Accès interdit.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: order.status,
      credits: order.credits,
      updatedAt: order.confirmed_at || order.created_at,
    });
  } catch (err) {
    console.error('[payments/status] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
