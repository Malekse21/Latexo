"use client";

import { create } from 'zustand';

export type ModalScreen =
  | 'closed'
  | 'credits-wall'
  | 'pack-selection'
  | 'payment-instructions'
  | 'waiting'
  | 'success';

export type PackType = 'starter' | 'defense' | 'serious';

export interface PackInfo {
  id: PackType;
  name: string;
  credits: number;
  price: number;
}

export const PACKS: Record<PackType, PackInfo> = {
  starter: {
    id: 'starter',
    name: 'STARTER',
    credits: 30,
    price: 9,
  },
  defense: {
    id: 'defense',
    name: 'DEFENSE',
    credits: 80,
    price: 19,
  },
  serious: {
    id: 'serious',
    name: 'SERIOUS',
    credits: 200,
    price: 39,
  },
};

interface PaymentModalState {
  currentScreen: ModalScreen;
  previousScreen: ModalScreen;
  selectedPack: PackType | null;
  d17Phone: string;
  orderId: string | null;
  orderReference: string | null;
  requiredCredits: number;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  open: (screen?: ModalScreen, requiredCredits?: number) => void;
  close: () => void;
  goTo: (screen: ModalScreen) => void;
  goBack: () => void;
  setSelectedPack: (pack: PackType) => void;
  setD17Phone: (phone: string) => void;
  setOrder: (orderId: string, reference: string) => void;
  setSubmitting: (v: boolean) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const SCREEN_ORDER: ModalScreen[] = [
  'credits-wall',
  'pack-selection',
  'payment-instructions',
  'waiting',
  'success',
];

function generateReference(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LAT-${num}`;
}

export const usePaymentModal = create<PaymentModalState>()((set, get) => ({
  currentScreen: 'closed',
  previousScreen: 'closed',
  selectedPack: null,
  d17Phone: '',
  orderId: null,
  orderReference: null,
  requiredCredits: 0,
  isSubmitting: false,
  error: null,

  open: (screen = 'pack-selection', requiredCredits = 0) =>
    set({
      currentScreen: screen,
      previousScreen: 'closed',
      requiredCredits,
      error: null,
    }),

  close: () =>
    set({
      currentScreen: 'closed',
      previousScreen: get().currentScreen,
    }),

  goTo: (screen) =>
    set({
      previousScreen: get().currentScreen,
      currentScreen: screen,
      error: null,
    }),

  goBack: () => {
    const current = get().currentScreen;
    const idx = SCREEN_ORDER.indexOf(current);
    if (idx > 0) {
      set({
        previousScreen: current,
        currentScreen: SCREEN_ORDER[idx - 1],
        error: null,
      });
    }
  },

  setSelectedPack: (pack) => set({ selectedPack: pack }),
  setD17Phone: (phone) => set({ d17Phone: phone }),
  setOrder: (orderId, reference) => set({ orderId, orderReference: reference }),
  setSubmitting: (v) => set({ isSubmitting: v }),
  setError: (msg) => set({ error: msg }),

  reset: () =>
    set({
      currentScreen: 'closed',
      previousScreen: 'closed',
      selectedPack: null,
      d17Phone: '',
      orderId: null,
      orderReference: null,
      requiredCredits: 0,
      isSubmitting: false,
      error: null,
    }),
}));

// Direction helper for slide animations
export function getSlideDirection(from: ModalScreen, to: ModalScreen): 'left' | 'right' {
  const fromIdx = SCREEN_ORDER.indexOf(from);
  const toIdx = SCREEN_ORDER.indexOf(to);
  return toIdx >= fromIdx ? 'left' : 'right';
}
