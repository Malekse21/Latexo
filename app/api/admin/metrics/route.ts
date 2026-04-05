import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // ── Admin auth ────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[admin/metrics] ADMIN_SECRET_TOKEN not configured');
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

    const supabase = await createAdminClient();

    // ── Fetch all orders ─────────────────────────────
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('status, amount_dt, confirmed_at, pack_id, user_id');

    if (fetchError) {
      console.error('[admin/metrics] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Erreur serveur.' },
        { status: 500 }
      );
    }

    // ── Fetch all profiles ───────────────────────────
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at, credits, full_name');

    const now = new Date();
    
    // Start of current day (local time approximation)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of rolling 7-days
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    let pendingCount = 0;
    let pendingValue = 0;
    let totalRevenue = 0;
    let completedCount = 0;
    const packBreakdown: Record<string, number> = {};
    const paidUserIds = new Set<string>();

    const dailyChartData: Array<{ date: string, fullDate: string, revenue: number, newUsers: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const localYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const shortDisplay = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })}`;
      dailyChartData.push({
        date: shortDisplay,
        fullDate: localYMD,
        revenue: 0,
        newUsers: 0
      });
    }

    let totalUsers = 0;
    let newUsersToday = 0;
    let newUsersWeek = 0;
    let usersZeroCredits = 0;

    for (const p of (profiles || [])) {
      totalUsers++;
      if (p.credits === 0) usersZeroCredits++;
      if (p.created_at) {
        const createdDate = new Date(p.created_at);

        const localYMD = `${createdDate.getFullYear()}-${String(createdDate.getMonth()+1).padStart(2,'0')}-${String(createdDate.getDate()).padStart(2,'0')}`;
        const chartPoint = dailyChartData.find(point => point.fullDate === localYMD);
        if (chartPoint) {
          chartPoint.newUsers += 1;
        }

        if (createdDate >= startOfToday) newUsersToday++;
        if (createdDate >= startOfWeek) newUsersWeek++;
      }
    }

    for (const order of (orders || [])) {
      const amount = Number(order.amount_dt) || 0;
      
      if (order.status === 'PENDING') {
        pendingCount++;
        pendingValue += amount;
      } 
      else if (order.status === 'COMPLETED') {
        totalRevenue += amount;
        completedCount++;
        if (order.user_id) paidUserIds.add(order.user_id);
        
        const packId = order.pack_id || 'unknown';
        packBreakdown[packId] = (packBreakdown[packId] || 0) + 1;

        if (order.confirmed_at) {
          const confirmedDate = new Date(order.confirmed_at);
          
          const localYMD = `${confirmedDate.getFullYear()}-${String(confirmedDate.getMonth()+1).padStart(2,'0')}-${String(confirmedDate.getDate()).padStart(2,'0')}`;
          const chartPoint = dailyChartData.find(point => point.fullDate === localYMD);
          if (chartPoint) {
            chartPoint.revenue += amount;
          }

          if (confirmedDate >= startOfToday) {
            revenueToday += amount;
          }
          if (confirmedDate >= startOfWeek) {
            revenueWeek += amount;
          }
          if (confirmedDate >= startOfMonth) {
            revenueMonth += amount;
          }
        }
      }
    }

    const avgPackValue = completedCount > 0 ? (totalRevenue / completedCount) : 0;

    const paidUsersCount = paidUserIds.size;
    const conversionRate = totalUsers > 0 ? (paidUsersCount / totalUsers) * 100 : 0;
    
    let totalCreditsPaidUsers = 0;
    let countPaidUsersInProfiles = 0;
    for (const p of (profiles || [])) {
      if (paidUserIds.has(p.id)) {
        totalCreditsPaidUsers += (p.credits || 0);
        countPaidUsersInProfiles++;
      }
    }
    const avgCreditsPaidUser = countPaidUsersInProfiles > 0 ? (totalCreditsPaidUsers / countPaidUsersInProfiles) : 0;

    // ── Fetch all sessions (simulations) ──────────────
    const { data: simulations, error: simsError } = await supabase
      .from('simulations')
      .select('id, user_id, created_at');

    const sessionCountsByUser: Record<string, number> = {};
    const lastSessionDateByUser: Record<string, Date> = {};
    const activeDatesByUser: Record<string, Set<string>> = {}; 
    const activeThisWeek = new Set<string>();

    for (const sim of (simulations || [])) {
      if (!sim.user_id) continue;
      const uid = sim.user_id;
      
      sessionCountsByUser[uid] = (sessionCountsByUser[uid] || 0) + 1;
      
      const createdDate = new Date(sim.created_at);
      if (!lastSessionDateByUser[uid] || createdDate > lastSessionDateByUser[uid]) {
        lastSessionDateByUser[uid] = createdDate;
      }

      if (createdDate >= startOfWeek) {
        activeThisWeek.add(uid);
      }
      
      if (!activeDatesByUser[uid]) activeDatesByUser[uid] = new Set();
      // Normalize to local date string for streak calculation
      activeDatesByUser[uid].add(createdDate.toISOString().split('T')[0]);
    }

    let users2PlusSessions = 0;
    let users5PlusSessions = 0;
    let totalPaidSessions = 0;
    let maxStreakAllTime = 0;

    for (const [uid, count] of Object.entries(sessionCountsByUser)) {
      if (count >= 2) users2PlusSessions++;
      if (count >= 5) users5PlusSessions++;
      
      if (paidUserIds.has(uid)) {
        totalPaidSessions += count;
      }
      
      // Calculate max streak for this user
      const dates = Array.from(activeDatesByUser[uid]).sort();
      let currentStreak = 1;
      let maxStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i-1]);
        const d2 = new Date(dates[i]);
        const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      if (maxStreak > maxStreakAllTime) {
        maxStreakAllTime = maxStreak;
      }
    }

    const avgSessionsPaidUser = paidUserIds.size > 0 ? (totalPaidSessions / paidUserIds.size) : 0;
    const usersActiveThisWeek = activeThisWeek.size;

    // "Days since last session per user - For top users"
    // Identify top users (>2 sessions) who haven't played in 3+ days
    interface DormantUser {
      name: string;
      sessions: number;
      daysSinceLast: number;
    }
    const dormantTopUsersList: DormantUser[] = [];
    
    for (const [uid, count] of Object.entries(sessionCountsByUser)) {
      if (count >= 3) {
        const lastActivity = lastSessionDateByUser[uid];
        const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 3) {
          const profile = profiles?.find(p => p.id === uid);
          dormantTopUsersList.push({ 
            name: profile?.full_name || 'Inconnu', 
            sessions: count, 
            daysSinceLast: daysSince 
          });
        }
      }
    }
    // Top 5 most experienced users going cold
    const dormantTopUsers = dormantTopUsersList.sort((a, b) => b.sessions - a.sessions).slice(0, 5);

    return NextResponse.json({
      revenueToday,
      revenueWeek,
      revenueMonth,
      pendingCount,
      pendingValue,
      totalRevenue,
      avgPackValue,
      packBreakdown,
      totalUsers,
      newUsersToday,
      newUsersWeek,
      paidUsersCount,
      conversionRate,
      usersZeroCredits,
      avgCreditsPaidUser,
      users2PlusSessions,
      users5PlusSessions,
      avgSessionsPaidUser,
      usersActiveThisWeek,
      maxStreakAllTime,
      dormantTopUsers,
      dailyChartData
    });
  } catch (err) {
    console.error('[admin/metrics] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
