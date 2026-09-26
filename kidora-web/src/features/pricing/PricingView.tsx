'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

import { formatMoney, pricingApi, type PublicPlan } from '@/lib/api/pricing';
import { usePaypalOrder, useStripeCheckout } from '@/features/payments/hooks';
import { paymentsApi } from '@/lib/api/payments';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';

type Billing = 'monthly' | 'yearly';

/**
 * Look and feel per audience. This is presentation only — every price, name
 * and feature comes from GET /pricing, so changing a plan never needs a deploy.
 */
const STYLE: Record<PublicPlan['audience'], {
  tile: string; price: string; check: string; button: string; ring: string;
  /** Plain emoji only: ZWJ sequences (👩‍👧) fall back to grey glyphs on some systems. */
  hero: string; props: [string, string]; role: string;
}> = {
  STUDENT: {
    tile: 'from-sky-100 to-sky-200', price: 'text-brand-900', check: 'bg-blue-600', ring: 'hover:ring-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-300', hero: '🧒', props: ['⭐', '⭐'], role: 'CHILD',
  },
  PARENT: {
    tile: 'from-emerald-100 to-emerald-200', price: 'text-emerald-700', check: 'bg-emerald-600', ring: 'hover:ring-emerald-200',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300', hero: '👩👧', props: ['❤️', '✨'], role: 'PARENT',
  },
  TEACHER: {
    tile: 'from-violet-100 to-violet-200', price: 'text-brand-900', check: 'bg-violet-600', ring: 'hover:ring-violet-200',
    button: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-300', hero: '👩‍🏫', props: ['💡', '📱'], role: 'TEACHER',
  },
  SCHOOL: {
    tile: 'from-orange-100 to-orange-200', price: 'text-orange-600', check: 'bg-orange-500', ring: 'hover:ring-orange-200',
    button: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-300', hero: '👨‍💼', props: ['🏫', '🚩'], role: 'SCHOOL_LEADER',
  },
  DISTRICT: {
    tile: 'from-teal-100 to-teal-200', price: 'text-teal-800', check: 'bg-teal-600', ring: 'hover:ring-teal-200',
    button: 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-300', hero: '👩‍💼', props: ['📍', '🗺️'], role: 'DISTRICT_ADMIN',
  },
};

const TIER_STYLE = [
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-orange-50 border-orange-200 text-orange-700',
  'bg-emerald-50 border-emerald-300 text-emerald-700',
];

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/** The monthly or yearly price, or null for "custom". Yearly falls back to monthly. */
function priceFor(plan: PublicPlan, billing: Billing) {
  if (billing === 'yearly' && plan.yearlyPriceMinor != null) return { minor: plan.yearlyPriceMinor, per: '/year' };
  if (plan.monthlyPriceMinor != null) return { minor: plan.monthlyPriceMinor, per: '/month' };
  return null;
}

export function PricingView() {
  const [billing, setBilling] = useState<Billing>('monthly');
  const [checkout, setCheckout] = useState<PublicPlan | null>(null);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const params = useSearchParams();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pricing'],
    queryFn: pricingApi.catalog,
    staleTime: 5 * 60_000,
  });

  const hasYearly = Boolean(data?.plans.some((p) => p.yearlyPriceMinor != null));

  // Back from sign-up with ?checkout=<plan>: pick up where the visitor left off.
  const resume = params.get('checkout');
  useEffect(() => {
    if (!resume || !user || !data) return;
    const plan = data.plans.find((p) => p.slug === resume && p.checkoutPlan);
    if (plan) setCheckout(plan);
    router.replace('/pricing', { scroll: false });
  }, [resume, user, data, router]);

  /**
   * Signed out → create an account for that role, then come back.
   * Signed in and the plan sells through checkout → pick a way to pay.
   * Anything else (student / teacher / district) → the sign-up flow for it.
   */
  function start(plan: PublicPlan) {
    const role = STYLE[plan.audience].role;
    if (!user) {
      const back = plan.checkoutPlan ? `/pricing?checkout=${plan.slug}` : '/pricing';
      router.push(`/join?role=${role}&next=${encodeURIComponent(back)}`);
      return;
    }
    if (plan.checkoutPlan) setCheckout(plan);
    // Signed in, and this plan is not sold through checkout (Teacher): take
    // them to their own dashboard, or to the role step if they have none yet.
    else router.push(user.roleConfirmed === false ? `/onboarding/role?role=${role}` : ROLE_HOME[user.role] ?? '/');
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-[#F4F1FF] to-[#EEF0FF]">
        <Decor />

        <div className="relative mx-auto max-w-[1320px] px-4 pb-16 pt-10 sm:px-6">
          {/* Heading */}
          <header className="relative text-center">
            <motion.p
              initial={{ opacity: 0, rotate: -8, y: -6 }}
              animate={{ opacity: 1, rotate: -8, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="pointer-events-none absolute right-2 top-0 hidden font-display text-lg font-extrabold leading-tight text-blue-600 lg:block"
              aria-hidden
            >
              Better Learning<br />for a Brighter<br />Tomorrow 💙
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="font-display text-4xl font-extrabold text-[#1B1446] sm:text-5xl"
            >
              Simple, Flexible Pricing
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mx-auto mt-3 max-w-2xl font-body text-lg font-bold text-slate-600"
            >
              Choose the plan that fits your role. Everyone gets access to amazing learning experiences on Kidora!
            </motion.p>

            {hasYearly && <BillingToggle value={billing} onChange={setBilling} />}
          </header>

          {/* Role plans */}
          {isLoading && <CardSkeletons />}
          {isError && (
            <div role="alert" className="mx-auto mt-10 max-w-md rounded-3xl border-2 border-coral-400/40 bg-white p-6 text-center">
              <div className="text-4xl">🌧️</div>
              <p className="mt-2 font-display text-xl font-extrabold text-brand-900">We couldn&apos;t load prices</p>
              <p className="mt-1 font-body font-bold text-slate-500">{apiErrorMessage(error, 'Please try again.')}</p>
              <button onClick={() => refetch()} className="mt-4 min-h-11 rounded-full bg-brand-700 px-6 font-display font-extrabold text-white">
                Try again
              </button>
            </div>
          )}

          {data && (
            <motion.ul
              variants={grid}
              initial="hidden"
              animate="show"
              className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            >
              {data.plans.map((plan) => (
                <PlanCard key={plan.slug} plan={plan} billing={billing} onStart={() => start(plan)} />
              ))}
            </motion.ul>
          )}

          {data && data.schoolTiers.length > 0 && <SchoolStrip tiers={data.schoolTiers} billing={billing} />}

          <TrustRow />
          <Closing />
        </div>
      </div>

      <AnimatePresence>
        {checkout?.checkoutPlan && (
          <CheckoutDialog plan={checkout} billing={billing} onClose={() => setCheckout(null)} />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function PlanCard({ plan, billing, onStart }: { plan: PublicPlan; billing: Billing; onStart: () => void }) {
  const s = STYLE[plan.audience];
  const price = priceFor(plan, billing);

  return (
    <motion.li
      variants={rise}
      whileHover={{ y: -6 }}
      className={`flex flex-col rounded-[28px] border border-white bg-white/90 p-3 shadow-[0_18px_40px_-24px_rgba(60,40,140,.45)] ring-2 ring-transparent transition-shadow ${s.ring}`}
    >
      {/* Illustration tile */}
      <div className={`relative grid h-40 place-items-center overflow-hidden rounded-[22px] bg-gradient-to-br ${s.tile}`} aria-hidden>
        <motion.span
          className="text-7xl drop-shadow-md"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {s.hero}
        </motion.span>
        <motion.span className="absolute left-5 top-7 text-2xl" animate={{ rotate: [0, 14, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          {s.props[0]}
        </motion.span>
        <motion.span className="absolute bottom-6 right-5 text-3xl" animate={{ y: [0, -5, 0] }} transition={{ duration: 2.8, repeat: Infinity, delay: 0.4 }}>
          {s.props[1]}
        </motion.span>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-5 text-center">
        <h2 className="font-display text-2xl font-extrabold text-[#1B1446]">{plan.name}</h2>
        <p className="mt-1 min-h-[3.9rem] font-body text-[15px] font-semibold leading-snug text-slate-600">{plan.tagline}</p>

        <div className="mt-4">
          {price ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={billing}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-baseline justify-center gap-1"
              >
                <span className={`font-display text-4xl font-extrabold ${s.price}`}>{formatMoney(price.minor, plan.currency)}</span>
                <span className="font-body text-sm font-bold text-slate-500">{price.per}</span>
              </motion.div>
            </AnimatePresence>
          ) : (
            <span className={`font-display text-3xl font-extrabold ${s.price}`}>Custom</span>
          )}
          {plan.unitLabel && <p className="mt-1 font-body text-sm font-bold text-slate-500">{plan.unitLabel}</p>}
        </div>

        <ul className="mt-5 flex-1 space-y-2.5 text-left">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 font-body text-[14px] font-semibold text-slate-700">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] text-white ${s.check}`} aria-hidden>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full font-display text-[17px] font-extrabold text-white shadow-md outline-none focus-visible:ring-4 ${s.button}`}
          aria-label={`Get started with the ${plan.name} plan`}
        >
          Get Started <span aria-hidden>→</span>
        </motion.button>
      </div>
    </motion.li>
  );
}

function BillingToggle({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  return (
    <div role="radiogroup" aria-label="Billing period" className="mx-auto mt-6 inline-flex rounded-full bg-white/80 p-1 shadow-sm">
      {(['monthly', 'yearly'] as Billing[]).map((b) => (
        <button
          key={b}
          type="button"
          role="radio"
          aria-checked={value === b}
          onClick={() => onChange(b)}
          className="relative min-h-10 rounded-full px-5 font-display font-extrabold capitalize text-slate-600"
        >
          {value === b && (
            <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-brand-700" transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }} />
          )}
          <span className={`relative ${value === b ? 'text-white' : ''}`}>
            {b}
            {b === 'yearly' && <span className={`ml-1.5 text-xs ${value === b ? 'text-sun-300' : 'text-emerald-600'}`}>save 20%</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function SchoolStrip({ tiers, billing }: { tiers: PublicPlan[]; billing: Billing }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45 }}
      className="mt-10 grid gap-6 rounded-[28px] border border-sky-100 bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(60,40,140,.45)] sm:p-6 lg:grid-cols-[1.1fr_2fr_1fr] lg:items-center"
    >
      <div className="flex items-start gap-4">
        <span className="text-5xl" aria-hidden>🏫</span>
        <div>
          <h2 className="font-display text-2xl font-extrabold text-[#1B1446]">School Pricing</h2>
          <p className="mt-1 font-body text-sm font-semibold text-slate-600">
            Schools can choose from flexible pricing tiers based on their size and needs.
          </p>
          <Link href="/join?role=SCHOOL_LEADER" className="mt-2 inline-block font-body text-sm font-extrabold text-blue-600 hover:underline">
            View School Plans →
          </Link>
        </div>
      </div>

      <div className="lg:border-x lg:border-slate-100 lg:px-6">
        <h3 className="font-display text-lg font-extrabold text-[#1B1446]">School Categories &amp; Pricing</h3>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiers.map((t, i) => {
            const p = priceFor(t, billing);
            return (
              <motion.li
                key={t.slug}
                whileHover={{ y: -3 }}
                className={`rounded-2xl border-2 px-3 py-3 text-center ${TIER_STYLE[i % TIER_STYLE.length]}`}
              >
                <div className="font-display text-[15px] font-extrabold">{t.name}</div>
                <div className="mt-1 font-body text-sm font-bold text-slate-700">
                  {p ? `${formatMoney(p.minor, t.currency, { compact: true })}${p.per === '/month' ? '/mo' : '/yr'}` : 'Custom'}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-sky-50 p-4">
        <span className="text-3xl" aria-hidden>⭐</span>
        <div>
          <p className="font-body text-sm font-semibold text-slate-600">
            Special pricing available for large districts and multi-school organizations.
          </p>
          <Link href="/join?role=DISTRICT_ADMIN" className="mt-1 inline-block font-body text-sm font-extrabold text-blue-600 hover:underline">
            Contact Sales →
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function TrustRow() {
  const items: [string, string][] = [
    ['🛡️', 'Secure Payments'],
    ['✅', 'Flexible Plans'],
    ['💜', 'Cancel Anytime'],
    ['👥', 'Trusted by Schools Worldwide'],
  ];
  return (
    <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
      {items.map(([icon, label]) => (
        <li key={label} className="flex items-center gap-2 font-body text-sm font-bold text-slate-600">
          <span aria-hidden className="text-xl">{icon}</span> {label}
        </li>
      ))}
    </ul>
  );
}

function Closing() {
  return (
    <div className="relative mt-10 text-center">
      <motion.span
        aria-hidden
        className="absolute bottom-0 left-0 hidden origin-bottom text-7xl sm:block"
        animate={{ rotate: [0, -8, 0, -8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5 }}
      >
        🦊
      </motion.span>
      <motion.span
        aria-hidden
        className="absolute bottom-2 right-4 hidden text-5xl sm:block"
        animate={{ y: [0, -8, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        ⭐
      </motion.span>
      <h2 className="font-display text-2xl font-extrabold text-brand-700 sm:text-3xl">Different roles. One learning community.</h2>
      <p className="mt-1 font-body font-bold text-slate-600">Choose your plan and start your Kidora journey today!</p>
      <svg viewBox="0 0 200 12" className="mx-auto mt-2 h-3 w-48 text-brand-500" aria-hidden>
        <motion.path
          d="M4 8 Q 100 -2 196 8"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        />
      </svg>
    </div>
  );
}

/** Soft clouds and stars behind everything; purely decorative. */
function Decor() {
  const clouds = [
    { c: 'left-[-40px] top-40 w-56', d: 0 },
    { c: 'right-[-30px] top-24 w-44', d: 1.2 },
    { c: 'left-[30%] bottom-10 w-72', d: 2 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {clouds.map(({ c, d }) => (
        <motion.div
          key={c}
          className={`absolute h-16 rounded-full bg-white/70 blur-[2px] ${c}`}
          animate={{ x: [0, 18, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: d }}
        />
      ))}
      {['left-[12%] top-20', 'right-[18%] top-[46%]', 'left-[6%] top-[58%]'].map((c, i) => (
        <motion.span
          key={c}
          className={`absolute text-xl ${c}`}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7 }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}

function CardSkeletons() {
  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Loading plans">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-[560px] animate-pulse rounded-[28px] bg-white/70" />
      ))}
    </ul>
  );
}

/**
 * Pay for a checkout-backed plan. The amount charged is read by the API from
 * the same plan row this card displayed; the browser sends only which plan.
 */
function CheckoutDialog({ plan, billing, onClose }: { plan: PublicPlan; billing: Billing; onClose: () => void }) {
  const stripe = useStripeCheckout();
  const paypal = usePaypalOrder();
  const [error, setError] = useState('');
  const [chapaBusy, setChapaBusy] = useState(false);
  const key = plan.checkoutPlan!;
  const price = priceFor(plan, 'monthly');
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const providers = useQuery({ queryKey: ['payment-providers'], queryFn: paymentsApi.providers, staleTime: 10 * 60_000 });
  const p = providers.data;
  const none = p && !p.chapa && !p.stripe && !(p.paypal && paypalClientId);

  async function payWithChapa() {
    setChapaBusy(true);
    setError('');
    try {
      const { url } = await paymentsApi.chapaCheckout(key);
      window.location.href = url;
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't start Chapa checkout."));
      setChapaBusy(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-end bg-[#1B1446]/40 p-4 sm:place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
      >
        <h2 id="checkout-title" className="font-display text-2xl font-extrabold text-[#1B1446]">{plan.name} plan</h2>
        {price && (
          <p className="mt-1 font-body font-bold text-slate-600">
            {formatMoney(price.minor, plan.currency)} per month{billing === 'yearly' ? ' — yearly billing is coming soon, so this starts monthly.' : '.'}
          </p>
        )}

        {providers.isLoading && <div className="mt-5 h-12 animate-pulse rounded-full bg-slate-100" aria-label="Loading payment options" />}

        {p?.chapa && (
          <button
            type="button"
            onClick={payWithChapa}
            disabled={chapaBusy}
            className="mt-5 min-h-12 w-full rounded-full bg-emerald-600 font-display text-lg font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {chapaBusy ? 'Opening Chapa…' : 'Pay with Chapa'}
            <span className="block font-body text-[11px] font-bold opacity-90">Telebirr · CBE Birr · M-Pesa · Card</span>
          </button>
        )}

        {p?.stripe && (
          <button
            type="button"
            onClick={() => stripe.mutate(key, { onError: (e) => setError(apiErrorMessage(e, "We couldn't start checkout.")) })}
            disabled={stripe.isPending}
            className="mt-3 min-h-12 w-full rounded-full bg-brand-700 font-display text-lg font-extrabold text-white disabled:opacity-60"
          >
            {stripe.isPending ? 'Opening secure checkout…' : '💳 Pay with card'}
          </button>
        )}

        {p?.paypal && paypalClientId && (
          <div className="mt-3">
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: plan.currency }}>
              <PayPalButtons
                style={{ layout: 'horizontal', shape: 'pill', tagline: false }}
                createOrder={() => paypal.createOrder(key)}
                onApprove={async (data) => {
                  const res = await paypal.capture(data.orderID);
                  if ((res as { granted?: boolean }).granted === false) setError('The payment did not complete. You have not been charged for the plan.');
                  else window.location.href = '/payment/return?provider=paypal&status=paid';
                }}
                onError={() => setError('PayPal could not complete the payment.')}
              />
            </PayPalScriptProvider>
          </div>
        )}

        {none && (
          <p className="mt-5 rounded-2xl bg-sun-300/40 p-3 font-body-x text-[13px] text-sun-700">
            Online payment isn&apos;t available right now. Please try again later or contact us.
          </p>
        )}

        {error && <p role="alert" className="mt-3 font-body-x text-[13px] text-coral-600">{error}</p>}

        <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full font-display font-extrabold text-slate-500">
          Not now
        </button>
      </motion.div>
    </motion.div>
  );
}
