// components/checkout/PaymentPanel.tsx
"use client";

import { useState } from "react";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { useCreateCheckoutSession, generateIdempotencyKey } from "@/hooks/usepayment";
import { normalizeApiError } from "@/lib/http";
import type { BillingCycle, PaymentProvider, PlanKey } from "@/lib/payment"

interface PaymentPanelProps {
  planKey: PlanKey;
  billingCycle: BillingCycle;
  onPending?: () => void; // called right before redirect, lets parent advance a stepper etc.
}

export function PaymentPanel({ planKey, billingCycle, onPending }: PaymentPanelProps) {
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const { mutate, isPending, isError, error, reset } = useCreateCheckoutSession();

  const errorMessage = isError ? normalizeApiError(error).message : null;

  function handlePay() {
    reset();
    mutate(
      { planKey, billingCycle, provider, idempotencyKey },
      {
        onSuccess: (data) => {
          onPending?.();
          if (data.redirectUrl) {
            // Stripe Checkout / PayPal / Telebirr all use hosted, redirect-based flows.
            window.location.href = data.redirectUrl;
            return;
          }
          // Apple Pay via Stripe: clientSecret path would mount a Payment Request
          // Button here instead of redirecting. Left as a TODO until Stripe is wired up.
        },
      }
    );
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-[#EDE4FF] p-6 max-w-[520px] mx-auto" style={{ boxShadow: "0 12px 30px -14px rgba(80,40,140,.3)" }}>
      <h3 className="font-display text-xl font-extrabold mb-4">Payment method</h3>

      <PaymentMethodSelector value={provider} onChange={setProvider} disabled={isPending} />

      {provider === "apple_pay" && (
        <div className="mt-4 text-center p-4 rounded-2xl bg-[#F6F2FF] font-bold text-sm text-[#7C6BA8]">
          Apple Pay checkout appears here once Stripe's Payment Request Button is wired in.
        </div>
      )}

      {(provider === "paypal" || provider === "telebirr" || provider === "stripe") && (
        <div className="mt-4 text-center p-4 rounded-2xl bg-[#F6F2FF] font-bold text-sm text-[#7C6BA8]">
          {provider === "stripe"
            ? "You'll enter your card details on Stripe's secure checkout page."
            : `You'll be redirected to ${provider === "paypal" ? "PayPal" : "Telebirr"} to complete payment securely.`}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="mt-4 p-3.5 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECACA] font-bold text-sm text-[#B91C1C]">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={isPending}
        className="mt-5 w-full py-3.5 rounded-2xl font-display font-extrabold text-white transition disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#22C55E,#15803D)" }}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Processing…
          </span>
        ) : (
          "Pay now 🔒"
        )}
      </button>
    </div>
  );
}