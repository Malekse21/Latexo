import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // ── Admin auth ────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[admin/orders/pending] ADMIN_SECRET_TOKEN not configured');
      return NextResponse.json(
        { error: 'Configuration serveur manquante.' },
        { status: 500 }
      );
    }

    // Accept "Bearer <token>" or raw token
    const providedToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Token admin invalide.' },
        { status: 401 }
      );
    }

    // ── Use service role client (bypasses RLS) ───
    const supabase = await createAdminClient();

    // ── Fetch pending orders ─────────────────────
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        pack_id,
        credits,
        amount_dt,
        d17_phone,
        status,
        reference,
        created_at,
        profiles (
          full_name
        )
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[admin/orders/pending] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Erreur serveur.' },
        { status: 500 }
      );
    }

    // Transform response
    const formattedOrders = orders?.map((order: any) => ({
      id: order.id,
      userId: order.user_id,
      userName: order.profiles?.full_name || 'Utilisateur Inconnu',
      packId: order.pack_id,
      credits: order.credits,
      amountDt: order.amount_dt,
      d17Phone: order.d17_phone,
      reference: order.reference,
      createdAt: order.created_at,
    })) || [];

    return NextResponse.json(formattedOrders);
  } catch (err) {
    console.error('[admin/orders/pending] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
