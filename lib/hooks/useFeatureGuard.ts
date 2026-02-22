"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/context/user-context';
import { useAppStore } from '@/lib/store/useAppStore';

interface GuardOptions {
  requireReport?: boolean;
  cost?: number;
}

export function useFeatureGuard(options: GuardOptions = {}) {
  const { requireReport = true, cost = 0 } = options;
  const router = useRouter();
  const { profile, loading: userLoading } = useUser();
  const { selectedReport } = useAppStore();

  useEffect(() => {
    if (userLoading) return;

    // 1. Check for Active Report
    // We check both the store (client selection) and strict profile active_report_id if needed
    // For now, let's rely on the store as the user specifically requested "selectedPDF is null in the store"
    if (requireReport && !selectedReport) {
      console.warn("Feature Guard: No report selected. Redirecting to dashboard.");
      // Ideally trigger a toast here
      router.push('/dashboard');
      return;
    }

    // 2. Check Credits
    if (cost > 0 && (profile?.credits || 0) < cost) {
      console.warn("Feature Guard: Insufficient credits.");
      // In a real app, this would open the modal via query param or store action
      // router.push('?modal=buy-credits'); 
    }

  }, [userLoading, selectedReport, profile, requireReport, cost, router]);

  return { 
    isLoading: userLoading,
    hasAccess: !userLoading && (!requireReport || selectedReport) && (!cost || (profile?.credits || 0) >= cost)
  };
}
