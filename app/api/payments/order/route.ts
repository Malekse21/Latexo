import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Server-side pack definitions
const PACKS: Record<string, { credits: number; amountDt: number }> = {
  starter: { credits: 30, amountDt: 9.0 },
  defense: { credits: 80, amountDt: 19.0 },
  serious: { credits: 200, amountDt: 39.0 },
};

const VALID_PACK_IDS = Object.keys(PACKS);
const PHONE_REGEX = /^\+216[2459]\d{7}$/;
const MAX_REF_RETRIES = 5;

function generateReference(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `LAT-${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // ── Body validation ──────────────────────────
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Corps de requête invalide.' },
        { status: 400 }
      );
    }

    const { packId, d17Phone } = body;

    if (!packId || !VALID_PACK_IDS.includes(packId)) {
      return NextResponse.json(
        { error: `Pack invalide. Valeurs acceptées: ${VALID_PACK_IDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize phone: strip spaces/dashes before validation
    const normalizedPhone =
      typeof d17Phone === 'string'
        ? d17Phone.replace(/[\s\-]/g, '')
        : '';

    // Add +216 prefix if not present
    const fullPhone = normalizedPhone.startsWith('+216')
      ? normalizedPhone
      : `+216${normalizedPhone}`;

    if (!PHONE_REGEX.test(fullPhone)) {
      return NextResponse.json(
        {
          error:
            'Numéro D17 invalide. Format attendu: +216 suivi de 8 chiffres (commençant par 2, 4, 5 ou 9).',
        },
        { status: 400 }
      );
    }

    // ── Check for existing pending orders ────────
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      return NextResponse.json(
        { error: 'Tu as déjà une commande en attente. Veuillez finaliser le paiement actuel.' },
        { status: 429 }
      );
    }

    const pack = PACKS[packId];

    // ── Generate collision-safe reference ─────────
    let reference: string | null = null;

    for (let attempt = 0; attempt < MAX_REF_RETRIES; attempt++) {
      const candidate = generateReference();
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('reference', candidate)
        .maybeSingle();

      if (!existing) {
        reference = candidate;
        break;
      }
    }

    if (!reference) {
      return NextResponse.json(
        { error: 'Impossible de générer une référence unique. Réessaie.' },
        { status: 500 }
      );
    }

    // ── Insert order ─────────────────────────────
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        pack_id: packId,
        credits: pack.credits,
        amount_dt: pack.amountDt,
        d17_phone: fullPhone,
        reference,
        status: 'PENDING',
      })
      .select('id, reference, credits, amount_dt')
      .single();

    if (insertError || !order) {
      console.error('[payments/order] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la commande.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      reference: order.reference,
      credits: order.credits,
      amountDT: Number(order.amount_dt),
    });
  } catch (err) {
    console.error('[payments/order] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
