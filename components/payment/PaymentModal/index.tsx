"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Portal } from "@/components/ui/portal";
import {
  usePaymentModal,
  getSlideDirection,
  type ModalScreen,
} from "@/lib/hooks/usePaymentModal";
import { useUser } from "@/lib/context/user-context";
import { CreditsWall } from "./CreditsWall";
import { PackSelection } from "./PackSelection";
import { PaymentInstructions } from "./PaymentInstructions";
import { WaitingConfirmation } from "./WaitingConfirmation";
import { ConfirmationSuccess } from "./ConfirmationSuccess";

// Screens where backdrop click closes the modal
const CLOSEABLE_SCREENS: ModalScreen[] = ["pack-selection", "success"];

const slideVariants = {
  enterFromRight: { x: 60, opacity: 0 },
  enterFromLeft: { x: -60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: -60, opacity: 0 },
  exitToRight: { x: 60, opacity: 0 },
};

export function PaymentModal() {
  const { currentScreen, previousScreen, close, reset } = usePaymentModal();
  const { profile } = useUser();

  const isOpen = currentScreen !== "closed";
  const currentCredits = profile?.credits ?? 0;

  // Determine slide direction
  const direction = getSlideDirection(previousScreen, currentScreen);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && CLOSEABLE_SCREENS.includes(currentScreen)) {
        close();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, currentScreen, close]);

  const handleBackdropClick = useCallback(() => {
    if (CLOSEABLE_SCREENS.includes(currentScreen)) {
      close();
    }
  }, [currentScreen, close]);

  const handleStartSimulation = useCallback(() => {
    // Could navigate to defense arena
    close();
    reset();
  }, [close, reset]);

  const handleGoToDashboard = useCallback(() => {
    close();
    reset();
  }, [close, reset]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "credits-wall":
        return (
          <CreditsWall
            currentCredits={currentCredits}
            requiredCredits={usePaymentModal.getState().requiredCredits}
          />
        );
      case "pack-selection":
        return (
          <PackSelection
            currentCredits={currentCredits}
            onClose={close}
          />
        );
      case "payment-instructions":
        return <PaymentInstructions />;
      case "waiting":
        return <WaitingConfirmation />;
      case "success":
        return (
          <ConfirmationSuccess
            currentCredits={currentCredits}
            onStartSimulation={handleStartSimulation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Portal>
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* ── Backdrop ──────────────────────────── */}
            <motion.div
              key="payment-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 z-[9998]"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            />

            {/* ── Modal Container ───────────────────── */}
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
              <motion.div
                key="payment-modal-container"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="pointer-events-auto w-full md:max-w-4xl overflow-hidden bg-white sm:rounded-t-2xl md:rounded-2xl"
                style={{
                  maxHeight: "90vh",
                  overflowY: "auto",
                }}
                // On sm+, apply rounded corners on all sides
              >
                {/* Scrollbar-hidden styling */}
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                {/* ── Screen Content with Slide Transition ── */}
                <AnimatePresence
                  mode="wait"
                  initial={false}
                >
                  <motion.div
                    key={currentScreen}
                    initial={direction === "left" ? "enterFromRight" : "enterFromLeft"}
                    animate="center"
                    exit={direction === "left" ? "exitToLeft" : "exitToRight"}
                    variants={slideVariants}
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  >
                    {renderScreen()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}
