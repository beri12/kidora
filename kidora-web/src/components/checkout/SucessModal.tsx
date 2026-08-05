// components/checkout/SuccessModal.tsx
"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface SuccessModalProps {
  open: boolean;
  planName: string;
  onClose: () => void;
  onContinue: () => void;
}

export function SuccessModal({ open, planName, onClose, onContinue }: SuccessModalProps) {
  useEffect(() => {
    if (open) {
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.4 },
        colors: ["#8B5CF6", "#16A34A", "#FACC15", "#FB7185", "#38BDF8"],
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      <div
        className="relative w-full max-w-[460px] rounded-3xl border-2 border-[#EDE4FF] p-10 text-center animate-[pop_.4s_cubic-bezier(.2,.9,.3,1.4)_both]"
        style={{ background: "linear-gradient(160deg,#F6F2FF,#EDE9FE)" }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full grid place-items-center bg-white/70 font-display font-extrabold text-[#7C6BA8]"
        >
          ✕
        </button>

        <div className="text-[80px]">🎉</div>
        <h2 id="success-modal-title" className="font-display text-2xl font-extrabold mt-2.5 mb-1.5 text-[#3B0764]">
          Payment successful!
        </h2>
        <p className="font-bold text-[#7C6BA8] mb-4">
          Welcome to Kidora {planName}! Your subscription is active and every premium world is unlocked.
        </p>
        <div
          className="inline-flex items-center gap-2 font-display font-extrabold px-5 py-2.5 rounded-full mb-5"
          style={{ background: "linear-gradient(135deg,#FACC15,#F59E0B)", color: "#7C2D12" }}
        >
          ⭐ Premium Badge Unlocked
        </div>
        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-2xl font-display font-extrabold text-white"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}
        >
          Go to my subscription →
        </button>
      </div>
    </div>
  );
}