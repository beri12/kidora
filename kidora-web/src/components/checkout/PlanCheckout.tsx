"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  INSTANCE_LOADING_STATE,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import { useAuthStore } from "@/stores/auth.store";
import { paymentsApi, type Activation } from "@/lib/api/payments";
import type { PlanKey } from "@/lib/api/billing";
import { setFlash } from "@/lib/flash";
import { cn, formatPrice } from "@/lib/utils";
import {
  CHECKOUT_MESSAGES as MSG,
  checkoutErrorMessage,
  useCurrentSubscription,
  usePlanCatalog,
} from "@/features/payments/hooks";

// The pricing-card call to action, shared by /pricing and /plus.
//
//   $0 plan    -> "Start Pilot" / "Start Free": POST /payments/activate-plan
//   paid plan  -> PayPal button: create-order -> PayPal approval -> capture-order
//
// Which one a card shows comes from the API's `checkout` field, so changing a
// price in the Plan table switches the button without touching this file.

/**
 * Loads the PayPal SDK once for the page, and only when it can be used: a
 * plan is priced, PayPal is configured, and someone is signed in. During the
 * $0 pilot no PayPal script is loaded at all.
 */
export function PlanCheckoutProvider({ children }: { children: ReactNode }) {
  const { data } = usePlanCatalog();
  const user = useAuthStore((s) => s.user);
  const paypal = data?.paypal;
  const needed = !!user && !!paypal?.enabled && !!paypal.clientId && !!paypal.environment && data!.plans.some((p) => p.checkout === "paypal");

  if (!needed) return <>{children}</>;
  return (
    <PayPalProvider clientId={paypal!.clientId!} environment={paypal!.environment!} components={["paypal-payments"]} pageType="checkout">
      {children}
    </PayPalProvider>
  );
}

type Phase = "idle" | "activating" | "connecting" | "paying" | "capturing";

const PHASE_TEXT: Partial<Record<Phase, string>> = {
  connecting: "Connecting to PayPal…",
  paying: "Complete your payment in the PayPal window…",
  capturing: "Processing payment…",
};

interface PlanCheckoutButtonProps {
  planId: PlanKey;
  /** Classes/style for the plain (non-PayPal) button, so each page keeps its own look. */
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  /** Text colour for status lines: "light" on dark cards. */
  tone?: "light" | "dark";
  /** Run a $0 activation as soon as the user is signed in (return from login). */
  autoStart?: boolean;
}

export function PlanCheckoutButton({ planId, buttonClassName, buttonStyle, tone = "dark", autoStart = false }: PlanCheckoutButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const catalog = usePlanCatalog();
  const subscription = useCurrentSubscription(!!user);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // State updates are async; this blocks a second click in the same tick.
  const inFlight = useRef(false);

  const plan = catalog.data?.plans.find((p) => p.id === planId);
  const isPaypal = plan?.checkout === "paypal";

  const signIn = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(`${pathname}?plan=${planId}`)}`);
  }, [router, pathname, planId]);

  const start = (next: Phase) => {
    setError(null);
    setNotice(null);
    setPhase(next);
  };

  const fail = useCallback((e: unknown) => {
    inFlight.current = false;
    setPhase("idle");
    setError(checkoutErrorMessage(e, isPaypal));
  }, [isPaypal]);

  // Access is unlocked only once the API has confirmed it.
  const finish = useCallback((res: Activation) => {
    qc.invalidateQueries({ queryKey: ["billing"] });
    if (res.status === "PENDING") {
      inFlight.current = false;
      setPhase("idle");
      setNotice(MSG.pending);
      return;
    }
    setFlash(res.provider === "paypal" ? MSG.paid : res.provider === "pilot" ? MSG.pilotActive : MSG.freeActive);
    router.push("/dashboard");
  }, [qc, router]);

  const activate = useCallback(async () => {
    if (!user) return signIn();
    if (inFlight.current) return;
    inFlight.current = true;
    start("activating");
    try {
      finish(await paymentsApi.activatePlan(planId));
    } catch (e) {
      fail(e);
    }
  }, [user, signIn, planId, finish, fail]);

  // Back from sign-in with ?plan=<this plan>: carry on where they left off.
  // Paid plans wait for a click — PayPal only opens from a user gesture.
  const resumed = useRef(false);
  useEffect(() => {
    if (!autoStart || resumed.current || !user || !plan) return;
    if (plan.checkout !== "pilot" && plan.checkout !== "free") return;
    resumed.current = true;
    router.replace(pathname, { scroll: false });
    void activate();
  }, [autoStart, user, plan, activate, router, pathname]);

  const isCurrent = !!subscription.data && subscription.data.plan === planId && subscription.data.status === "active";
  const statusTone = tone === "light" ? "text-white/90" : "text-brand-700";
  const base = cn("w-full", buttonClassName);

  let control: ReactNode;
  if (!plan) {
    control = <button type="button" disabled className={base} style={buttonStyle}>{catalog.isError ? "Unavailable" : "Loading…"}</button>;
  } else if (isCurrent && plan.checkout !== "paypal") {
    control = <button type="button" disabled className={base} style={buttonStyle}>Current plan</button>;
  } else if (plan.checkout === "pilot" || plan.checkout === "free") {
    const label = plan.checkout === "pilot" ? "Start Pilot" : "Start Free";
    const busyLabel = plan.checkout === "pilot" ? "Activating pilot…" : "Activating…";
    control = (
      <button type="button" onClick={activate} disabled={!hydrated || phase !== "idle"} aria-busy={phase === "activating"} className={base} style={buttonStyle}>
        {phase === "activating" ? <Spinner label={busyLabel} /> : label}
      </button>
    );
  } else if (plan.checkout === "contact") {
    control = <Link href="/join?role=DISTRICT_ADMIN" className={cn(base, "text-center")} style={buttonStyle}>Contact Sales</Link>;
  } else if (plan.checkout === "unavailable") {
    control = <button type="button" disabled className={base} style={buttonStyle}>Currently unavailable</button>;
  } else if (!catalog.data!.paypal.enabled) {
    control = <PayPalLookalike disabled />;
  } else if (!user) {
    // Signed out: a PayPal-branded button that goes to sign-in first.
    control = <PayPalLookalike onClick={signIn} disabled={!hydrated} />;
  } else {
    control = (
      <PaypalCheckout
        planId={planId}
        disabled={phase !== "idle"}
        onPhase={(p) => { if (p === "connecting") start(p); else setPhase(p); }}
        onApproved={finish}
        onError={fail}
        onCancel={() => { setPhase("idle"); setNotice(MSG.cancelled); }}
      />
    );
  }

  const unavailable = plan?.checkout === "paypal" && !catalog.data?.paypal.enabled;
  return (
    <div className="space-y-2">
      {control}
      {isPaypal && phase === "idle" && !error && !notice && !unavailable && (
        <p className={cn("font-body font-bold text-xs text-center", statusTone)}>
          You&rsquo;ll pay {formatPrice(plan!.priceCents, plan!.currency)} {plan!.currency} per {plan!.billingInterval} with PayPal.
        </p>
      )}
      {PHASE_TEXT[phase] && <p role="status" className={cn("font-body font-bold text-sm text-center", statusTone)}>{PHASE_TEXT[phase]}</p>}
      {notice && <p role="status" className={cn("font-body font-bold text-sm text-center", statusTone)}>{notice}</p>}
      {(error || unavailable || catalog.isError) && (
        <p role="alert" className="rounded-xl bg-[#FEF2F2] border-2 border-[#FECACA] px-3 py-2 font-body font-bold text-sm text-[#B91C1C]">
          {error ?? (catalog.isError ? MSG.catalogDown : MSG.paypalUnavailable)}
        </p>
      )}
    </div>
  );
}

interface PaypalCheckoutProps {
  planId: PlanKey;
  disabled: boolean;
  onPhase: (phase: Phase) => void;
  onApproved: (res: Activation) => void;
  onError: (e: unknown) => void;
  onCancel: () => void;
}

/** The official PayPal button. The order amount is set by the API, never here. */
function PaypalCheckout({ planId, disabled, onPhase, onApproved, onError, onCancel }: PaypalCheckoutProps) {
  const { loadingStatus } = usePayPal();
  // createOrder failures also surface through the SDK's onError; keep the
  // specific message from the API instead of overwriting it.
  const reported = useRef(false);

  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING) return <PayPalLookalike disabled label="Loading PayPal…" />;
  if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED) {
    return <><PayPalLookalike disabled /><p role="alert" className="font-body font-bold text-sm text-[#B91C1C] text-center">{MSG.paypalUnavailable}</p></>;
  }

  return (
    <div className={cn("w-full", disabled && "pointer-events-none opacity-60")}>
      <PayPalOneTimePaymentButton
        type="pay"
        disabled={disabled}
        createOrder={async () => {
          reported.current = false;
          onPhase("connecting");
          try {
            const order = await paymentsApi.paypalCreateOrder(planId);
            onPhase("paying");
            return { orderId: order.orderId };
          } catch (e) {
            reported.current = true;
            onError(e);
            throw e;
          }
        }}
        onApprove={async ({ orderId }) => {
          onPhase("capturing");
          try {
            onApproved(await paymentsApi.paypalCaptureOrder(orderId));
          } catch (e) {
            reported.current = true;
            onError(e);
          }
        }}
        onCancel={(data) => {
          onCancel();
          // Bookkeeping only; an unapproved order cannot be charged.
          if (data?.orderId) void paymentsApi.paypalCancelOrder(data.orderId).catch(() => undefined);
        }}
        onError={() => {
          if (!reported.current) onError(new Error("paypal-sdk"));
          reported.current = false;
        }}
      />
    </div>
  );
}

/** PayPal-styled stand-in for when the real button cannot render yet. */
function PayPalLookalike({ onClick, disabled, label }: { onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full py-3 font-display font-extrabold text-[#003087] bg-[#FFC439] hover:brightness-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label ?? <>Pay with <span className="italic">Pay</span><span className="italic text-[#009CDE]">Pal</span></>}
    </button>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span aria-hidden className="w-4 h-4 rounded-full border-2 border-current/40 border-t-current animate-spin" />
      {label}
    </span>
  );
}
