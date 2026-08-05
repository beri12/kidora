// components/checkout/PaymentMethodSelector.tsx
"use client";

import { CardIcon, StripeBadge, PayPalBadge, ApplePayBadge, TelebirrBadge } from "./icons";
import type { PaymentProvider } from "@/lib/payment";

interface MethodOption {
  key: PaymentProvider;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}

const METHODS: MethodOption[] = [
  { key: "stripe", label: "Card", sublabel: "Visa, Mastercard, Amex", icon: <CardIcon /> },
  { key: "paypal", label: "PayPal", sublabel: "Pay with your PayPal balance", icon: <PayPalBadge /> },
  { key: "apple_pay", label: "Apple Pay", sublabel: "Face ID or Touch ID checkout", icon: <ApplePayBadge /> },
  { key: "telebirr", label: "Telebirr", sublabel: "Mobile money (Ethiopia)", icon: <TelebirrBadge /> },
];

interface PaymentMethodSelectorProps {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-2.5">
      {METHODS.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(m.key)}
            className={
              "flex items-center gap-3 p-3.5 rounded-2xl text-left transition disabled:opacity-50 disabled:cursor-not-allowed " +
              (active ? "border-2 border-[#8B5CF6] bg-[#F6F2FF]" : "border-2 border-[#EDE4FF] bg-white hover:border-[#C4B5FD]")
            }
          >
            <span className="shrink-0 grid place-items-center w-9 h-9 rounded-xl bg-[#F6F2FF]">
              {m.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-display font-extrabold text-sm text-[#3B0764]">
                {m.label}
              </span>
              <span className="block font-bold text-[11px] text-[#7C6BA8] truncate">
                {m.sublabel}
              </span>
            </span>
            <span
              aria-hidden
              className={
                "ml-auto shrink-0 w-4.5 h-4.5 rounded-full border-2 grid place-items-center " +
                (active ? "border-[#8B5CF6]" : "border-[#D8CCF0]")
              }
              style={{ width: 18, height: 18 }}
            >
              {active && <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}