import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[admin/payments/delete] ADMIN_SECRET_TOKEN not configured');
      return NextResponse.json(
        { error: 'Configuration serveur manquante.' },
        { status: 500 }
      );
    }

    const providedToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Token admin invalide.' },
        { status: 401 }
      );
    }

    // Await params per Next.js 15+ constraints (safe practice for 14 too)
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId est requis.' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Verify order is pending before deleting
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Commande introuvable.' },
        { status: 404 }
      );
    }

    if (existingOrder.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une commande déjà traitée.' },
        { status: 400 }
      );
    }

    // Delete the order 
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      console.error('[admin/payments/delete] Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la commande.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Commande supprimée avec succès.' });
  } catch (err) {
    console.error('[admin/payments/delete] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
