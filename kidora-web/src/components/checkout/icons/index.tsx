// components/checkout/icons/index.tsx
// Original badge icons for each payment method. These are stylistic marks, not
// reproductions of official brand logos. Swap for official brand SVGs from each
// provider's brand-guidelines page before shipping to production if you want the
// literal Stripe/PayPal/Apple Pay marks.

export function CardIcon() {
  return (
    <svg viewBox="0 0 40 28" width="28" height="20" aria-hidden>
      <rect x="1" y="1" width="38" height="26" rx="4" fill="#F1ECFF" stroke="#C4B5FD" strokeWidth="1.5" />
      <rect x="1" y="7" width="38" height="5" fill="#6D28D9" />
      <rect x="5" y="18" width="12" height="3" rx="1.5" fill="#A99BC9" />
    </svg>
  );
}

export function StripeBadge() {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden>
      <rect width="28" height="28" rx="7" fill="#635BFF" />
      <text x="14" y="19" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="15" fill="#fff">
        S
      </text>
    </svg>
  );
}

export function PayPalBadge() {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden>
      <rect width="28" height="28" rx="7" fill="#003087" />
      <path
        d="M9 20l1.6-9.8c.15-.9.9-1.5 1.8-1.5h3.1c2.6 0 4.3 1.4 3.9 3.8-.4 2.6-2.4 3.9-5 3.9h-1.4l-.6 3.6H9z"
        fill="#00A0DA"
      />
      <path
        d="M11.6 20l1.3-8.1c.12-.75.75-1.3 1.5-1.3h2.6c2.2 0 3.6 1.15 3.3 3.2-.35 2.2-2 3.3-4.2 3.3h-1.2l-.5 2.9h-2.8z"
        fill="#fff"
        opacity="0.9"
      />
    </svg>
  );
}

export function ApplePayBadge() {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden>
      <rect width="28" height="28" rx="7" fill="#0B0B0F" />
      <path
        d="M12.3 10.2c-.5.6-1.3 1-2 1-.1-.8.3-1.6.7-2.1.5-.6 1.4-1 2.1-1.1.1.8-.2 1.6-.8 2.2zm.8 1.2c-1.1 0-2 .6-2.6.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.1-.3 5.3.9 7 .6.9 1.3 1.9 2.2 1.8.9 0 1.2-.5 2.3-.5s1.4.5 2.3.5c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2-.1 0-1.9-.7-1.9-2.8 0-1.8 1.4-2.6 1.5-2.6-.8-1.2-2-1.4-2.4-1.4-1.1-.1-1.9.6-2.3.6z"
        fill="#fff"
      />
      <text x="21" y="18" fontFamily="-apple-system, sans-serif" fontWeight="600" fontSize="7" fill="#fff">
        Pay
      </text>
    </svg>
  );
}

export function TelebirrBadge() {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden>
      <rect width="28" height="28" rx="7" fill="#00A651" />
      <circle cx="14" cy="14" r="7" fill="#fff" />
      <path d="M14 8.5v7l4.5 2.5" stroke="#00A651" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}