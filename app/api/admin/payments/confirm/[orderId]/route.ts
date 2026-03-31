import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // ── Admin auth ────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[admin/confirm] ADMIN_SECRET_TOKEN not configured');
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

    // ── Fetch order ──────────────────────────────
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, user_id, status, credits, reference')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin/confirm] Fetch error:', fetchError);
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

    // ── Status guards ────────────────────────────
    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cette commande a déjà été confirmée.' },
        { status: 409 }
      );
    }

    if (order.status === 'FAILED') {
      return NextResponse.json(
        { error: 'Cette commande a été marquée comme échouée.' },
        { status: 400 }
      );
    }

    // ── Atomic: update order status ──────────────
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: 'COMPLETED',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'PENDING'); // Optimistic lock — only update if still PENDING

    if (updateOrderError) {
      console.error('[admin/confirm] Order update error:', updateOrderError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande.' },
        { status: 500 }
      );
    }

    // ── Atomic: credit the user ──────────────────
    // Using RPC or raw update with increment
    const { error: creditError } = await supabase.rpc('increment_credits', {
      p_user_id: order.user_id,
      p_amount: order.credits,
    });

    // Fallback: if RPC doesn't exist, use direct update
    if (creditError) {
      console.warn('[admin/confirm] RPC fallback, using direct update:', creditError.message);

      const { data: profile, error: fetchProfileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', order.user_id)
        .single();

      if (fetchProfileError || !profile) {
        console.error('[admin/confirm] Profile fetch error:', fetchProfileError);
        // Rollback order status
        await supabase
          .from('orders')
          .update({ status: 'PENDING', confirmed_at: null })
          .eq('id', orderId);
        return NextResponse.json(
          { error: 'Utilisateur introuvable. Commande annulée.' },
          { status: 500 }
        );
      }

      const newBalance = (profile.credits || 0) + order.credits;

      const { error: directUpdateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', order.user_id);

      if (directUpdateError) {
        console.error('[admin/confirm] Credit update error:', directUpdateError);
        // Rollback order status
        await supabase
          .from('orders')
          .update({ status: 'PENDING', confirmed_at: null })
          .eq('id', orderId);
        return NextResponse.json(
          { error: 'Erreur lors de l\'ajout des crédits. Commande annulée.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        newBalance,
        reference: order.reference,
        creditsAdded: order.credits,
      });
    }

    // ── Fetch updated balance ────────────────────
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', order.user_id)
      .single();

    return NextResponse.json({
      ok: true,
      newBalance: updatedProfile?.credits ?? null,
      reference: order.reference,
      creditsAdded: order.credits,
    });
  } catch (err) {
    console.error('[admin/confirm] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
