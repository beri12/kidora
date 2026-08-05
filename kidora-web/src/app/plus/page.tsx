'use client';
import { useState } from 'react';
import { PaymentPanel } from '@/components/checkout/Paymentpanel';
import { useMySubscription, useInvoices, useCancelSubscription } from '@/hooks/usepayment';
import type { PlanKey } from '@/lib/payment';

interface Plan { key: PlanKey; name: string; emoji: string; price: number; custom?: boolean; tag?: string; color: string; feats: string[]; }

const TABS = [
  { key: 'pricing', label: '💎 Pricing' },
  { key: 'plus', label: '⭐ Kidora Plus' },
  { key: 'checkout', label: '🛒 Checkout' },
  { key: 'sub', label: '📋 My Subscription' },
  { key: 'billing', label: '🧾 Billing' },
] as const;
type Tab = (typeof TABS)[number]['key'];

// Checkout is now 3 steps, not 4. Stripe/PayPal/Telebirr all redirect off-site
// on "Pay now", so there's no in-app confirmation step to show; the real
// confirmation happens on /payment/success after the redirect comes back.
const CHECKOUT_STEPS = ['Choose Plan', 'Account', 'Payment'];

export default function PlusPage() {
  const [tab, setTab] = useState<Tab>('pricing');
  const [yearly, setYearly] = useState(false);
  const [plan, setPlan] = useState<PlanKey>('family');
  const [step, setStep] = useState(1);

  const go = (t: Tab) => { setTab(t); setStep(1); };

  const plans: Plan[] = [
    { key: 'free', name: 'Free', emoji: '🌱', price: 0, color: '#94A3B8', feats: ['Basic lessons', 'Limited games', 'Basic progress tracking', '1 child profile'] },
    { key: 'family', name: 'Family', emoji: '⭐', price: yearly ? 109 : 12.99, tag: 'Most Popular', color: '#8B5CF6', feats: ['Unlimited learning', 'AI Tutor (Kai)', 'Advanced reports', 'Avatar customization', 'All games', 'Premium worlds'] },
    { key: 'school', name: 'School', emoji: '🏫', price: yearly ? 790 : 99, color: '#16A34A', feats: ['Teacher dashboard', 'Classroom management', 'Student analytics', 'School reports', 'Up to 40 students'] },
    { key: 'district', name: 'District', emoji: '🏛️', price: 0, custom: true, color: '#0284C7', feats: ['Multiple schools', 'District analytics', 'Advanced administration', 'Priority support', 'Custom onboarding'] },
  ];

  return (
    <div className="min-h-screen bg-[#F1ECFF] text-[#3B0764] font-body">
      {/* header + tabs */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b-2 border-[#EDE4FF] px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl grid place-items-center text-xl" style={{ background: 'linear-gradient(135deg,#8B5CF6,#16A34A)' }}>🐵</div>
          <span className="font-display font-extrabold text-xl text-[#4C1D95]">Kidora</span>
        </div>
        <div className="flex gap-1 bg-[#F1ECFF] p-1.5 rounded-2xl flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => go(t.key)}
              className={'px-4 py-2 rounded-xl font-display font-extrabold text-sm transition ' + (tab === t.key ? 'text-white shadow-btn' : 'text-[#7C6BA8]')}
              style={tab === t.key ? { background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' } : {}}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-5 pt-7 pb-16 animate-[pop_.5s_cubic-bezier(.2,.9,.3,1.4)_both]">
        {/* PRICING */}
        {tab === 'pricing' && (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-center mb-1.5">Choose your plan 💎</h1>
            <p className="font-bold text-[#7C6BA8] text-center mb-5">Start free. Upgrade anytime. Cancel whenever.</p>
            <div className="flex items-center justify-center gap-3 mb-7">
              <span className="font-display font-extrabold" style={{ color: yearly ? '#A99BC9' : '#6D28D9' }}>Monthly</span>
              <button onClick={() => setYearly(!yearly)} className="w-[58px] h-8 rounded-full relative transition" style={{ background: yearly ? '#8B5CF6' : '#CBD5E1' }}>
                <span className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all" style={{ left: yearly ? 29 : 3 }} />
              </button>
              <span className="font-display font-extrabold" style={{ color: yearly ? '#6D28D9' : '#A99BC9' }}>Yearly</span>
              <span className="font-display font-extrabold text-xs text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">Save 30%</span>
            </div>
            <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
              {plans.map((p) => {
                const popular = p.tag === 'Most Popular';
                return (
                  <div key={p.key} className="rounded-3xl p-6 relative flex flex-col transition-transform hover:-translate-y-2 cursor-pointer"
                    style={{ border: popular ? '3px solid #8B5CF6' : '2px solid #EDE4FF', background: popular ? 'linear-gradient(160deg,#F6F2FF,#EDE9FE)' : '#fff', boxShadow: '0 12px 30px -14px rgba(80,40,140,.3)' }}>
                    {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-display font-extrabold px-3.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#FACC15,#F59E0B)', color: '#7C2D12' }}>⭐ Most Popular</div>}
                    <div className="text-4xl">{p.emoji}</div>
                    <h3 className="font-display text-xl font-extrabold mt-1">{p.name}</h3>
                    <div className="my-2">
                      {p.custom ? <span className="font-display font-extrabold text-2xl">Contact us</span>
                        : p.price === 0 ? <span className="font-display font-extrabold text-3xl">Free</span>
                        : <><span className="font-display font-extrabold text-3xl">${p.price}</span><span className="font-bold text-[#A99BC9] text-sm">{yearly ? '/yr' : '/mo'}</span></>}
                    </div>
                    <div className="flex flex-col gap-2 my-3 flex-1">
                      {p.feats.map((ft) => <div key={ft} className="flex gap-2 font-bold text-[13px] text-[#4C1D95]"><span style={{ color: p.color }}>✓</span>{ft}</div>)}
                    </div>
                    <button onClick={() => { setPlan(p.key); setTab('checkout'); setStep(1); }}
                      className="w-full py-3 rounded-2xl font-display font-extrabold text-white"
                      style={{ background: popular ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : p.custom ? 'linear-gradient(135deg,#0284C7,#0369A1)' : p.price === 0 ? '#CBD5E1' : 'linear-gradient(135deg,#22C55E,#15803D)' }}>
                      {p.custom ? 'Contact Sales' : p.price === 0 ? 'Get Started' : 'Choose ' + p.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* KIDORA PLUS */}
        {tab === 'plus' && (
          <>
            <div className="grid md:grid-cols-[1.1fr_.9fr] gap-6 items-center rounded-[28px] p-8 text-white mb-7 overflow-hidden" style={{ background: 'linear-gradient(135deg,#6D28D9,#8B5CF6 60%,#16A34A)' }}>
              <div>
                <div className="inline-block bg-white/25 font-display font-extrabold text-xs px-3.5 py-1 rounded-full mb-3">⭐ KIDORA PLUS</div>
                <h1 className="font-display text-4xl font-extrabold leading-tight mb-3">Unlock your child&rsquo;s full learning adventure</h1>
                <p className="font-bold opacity-95 mb-5">Premium worlds, an AI tutor, exclusive games and rewards, everything they need to love learning.</p>
                <button onClick={() => { setPlan('family'); setTab('checkout'); setStep(1); }} className="px-7 py-3.5 rounded-2xl font-display font-extrabold text-[#6D28D9] bg-white" style={{ boxShadow: '0 12px 0 rgba(0,0,0,.15)' }}>Start Free Trial →</button>
              </div>
              <div className="text-center text-[120px] animate-[floaty_5s_ease-in-out_infinite]">🐵</div>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
              {[['⭐', 'Unlimited Learning Worlds', 'Every island, planet and forest unlocked'], ['🤖', 'AI Tutor (Kai)', '24/7 homework help & guidance'], ['🎮', 'Exclusive Games', 'Premium games across every subject'], ['🎨', 'Premium Avatar Items', 'Rare skins, pets & accessories'], ['📊', 'Advanced Parent Reports', "Deep insight into your child's growth"], ['🏆', 'Extra Rewards', 'Double coins & exclusive badges']].map((ft) => (
                <div key={ft[1]} className="bg-white rounded-3xl border-2 border-[#EDE4FF] p-5 flex gap-3.5 items-start" style={{ boxShadow: '0 12px 30px -14px rgba(80,40,140,.3)' }}>
                  <div className="text-3xl">{ft[0]}</div>
                  <div><h4 className="font-display font-extrabold text-[17px]">{ft[1]}</h4><p className="font-bold text-[13px] text-[#7C6BA8]">{ft[2]}</p></div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CHECKOUT */}
        {tab === 'checkout' && (
          <>
            <h1 className="font-display text-3xl font-extrabold text-center mb-5">Checkout</h1>
            <div className="flex items-center justify-center gap-1.5 mb-7 flex-wrap">
              {CHECKOUT_STEPS.map((label, i) => {
                const n = i + 1; const active = n <= step;
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full grid place-items-center font-display font-extrabold text-sm" style={{ color: active ? '#fff' : '#A99BC9', background: active ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : '#EDE4FF' }}>{n < step ? '✓' : n}</div>
                    <span className="font-display font-extrabold text-[13px]" style={{ color: active ? '#6D28D9' : '#A99BC9' }}>{label}</span>
                    {i < CHECKOUT_STEPS.length - 1 && <div className="w-6 h-[3px] rounded" style={{ background: n < step ? '#8B5CF6' : '#EDE4FF' }} />}
                  </div>
                );
              })}
            </div>

            {step === 1 && (() => { const p = plans.find((x) => x.key === plan) || plans[1]; return (
              <div className="bg-white rounded-3xl border-2 border-[#EDE4FF] p-6 max-w-[520px] mx-auto" style={{ boxShadow: '0 12px 30px -14px rgba(80,40,140,.3)' }}>
                <h3 className="font-display text-xl font-extrabold mb-4">Your plan</h3>
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#F6F2FF] mb-4">
                  <div className="text-4xl">{p.emoji}</div>
                  <div className="flex-1"><h4 className="font-display font-extrabold text-lg">Kidora {p.name}</h4><p className="font-bold text-[13px] text-[#7C6BA8]">{yearly ? 'Billed yearly' : 'Billed monthly'}</p></div>
                  <div className="font-display font-extrabold text-xl text-[#6D28D9]">{p.custom ? 'Custom' : p.price === 0 ? 'Free' : '$' + p.price}</div>
                </div>
                <div className="flex gap-2.5">
                  {plans.filter((x) => x.key !== 'district').map((x) => (
                    <button key={x.key} onClick={() => setPlan(x.key)} className="flex-1 py-2.5 rounded-xl font-display font-extrabold text-[13px]" style={{ background: plan === x.key ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : '#F1ECFF', color: plan === x.key ? '#fff' : '#6D28D9' }}>{x.emoji} {x.name}</button>
                  ))}
                </div>
              </div>
            ); })()}

            {step === 2 && (
              <div className="bg-white rounded-3xl border-2 border-[#EDE4FF] p-6 max-w-[520px] mx-auto" style={{ boxShadow: '0 12px 30px -14px rgba(80,40,140,.3)' }}>
                <h3 className="font-display text-xl font-extrabold mb-4">Account details</h3>
                {['Parent name', 'Email address', "Child's name"].map((ph) => (
                  <input key={ph} placeholder={ph} className="w-full px-4 py-3 rounded-2xl border-2 border-[#EDE4FF] bg-[#F6F2FF] font-bold text-sm mb-3 outline-none" />
                ))}
              </div>
            )}

            {step === 3 && (
              <PaymentPanel planKey={plan} billingCycle={yearly ? 'yearly' : 'monthly'} />
            )}

            {/* Back / Continue nav. Step 3 has no "Continue" or "Pay now" button here
               because PaymentPanel owns its own submit button, loading state, and
               redirect. This avoids two competing "pay" actions on screen. */}
            <div className="flex justify-center gap-3 mt-5.5">
              {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 py-3 rounded-2xl font-display font-extrabold text-[#6D28D9] bg-[#EDE4FF]">← Back</button>}
              {step < 3 && <button onClick={() => setStep(step + 1)} className="px-8 py-3 rounded-2xl font-display font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>Continue →</button>}
            </div>
          </>
        )}

        {/* SUBSCRIPTION */}
        {tab === 'sub' && <SubscriptionTab onManagePlans={() => go('pricing')} />}

        {/* BILLING */}
        {tab === 'billing' && <BillingTab />}
      </div>
    </div>
  );
}

const PLAN_LABEL: Record<PlanKey, { name: string; emoji: string }> = {
  free: { name: 'Free', emoji: '🌱' },
  family: { name: 'Family', emoji: '⭐' },
  school: { name: 'School', emoji: '🏫' },
  district: { name: 'District', emoji: '🏛️' },
};

function SubscriptionTab({ onManagePlans }: { onManagePlans: () => void }) {
  const { data: subscription, isLoading, isError } = useMySubscription();
  const cancelMutation = useCancelSubscription();

  return (
    <div className="max-w-[760px] mx-auto">
      <h1 className="font-display text-3xl font-extrabold mb-4">My Subscription 📋</h1>

      {isLoading ? (
        <div className="rounded-3xl p-8 mb-4 bg-white border-2 border-[#EDE4FF] flex items-center justify-center">
          <span className="w-6 h-6 rounded-full border-4 border-[#DDD1FF] border-t-[#8B5CF6] animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-3xl p-6 mb-4 bg-[#FEF2F2] border-2 border-[#FECACA] font-bold text-[#B91C1C]">
          Couldn&rsquo;t load your subscription. Please refresh the page.
        </div>
      ) : !subscription ? (
        <div className="rounded-3xl p-8 mb-4 bg-white border-2 border-[#EDE4FF] text-center">
          <p className="font-bold text-[#7C6BA8] mb-4">You&rsquo;re on the Free plan right now.</p>
          <button onClick={onManagePlans} className="px-6 py-3 rounded-2xl font-display font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
            View plans
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-3xl p-6 mb-4 text-white flex justify-between items-center flex-wrap gap-4" style={{ background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)' }}>
            <div>
              <div className="font-bold text-xs opacity-85 uppercase">Current Plan</div>
              <h2 className="font-display text-2xl font-extrabold">
                {PLAN_LABEL[subscription.planKey].emoji} Kidora {PLAN_LABEL[subscription.planKey].name}
              </h2>
              <p className="font-bold opacity-90 text-sm mt-1">
                {subscription.billingCycle === 'yearly' ? 'Billed yearly' : 'Billed monthly'} · renews{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-white/25 px-4 py-2 rounded-full font-display font-extrabold capitalize">
              ● {subscription.status.replace('_', ' ')}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={onManagePlans} className="flex-1 min-w-[140px] py-3 rounded-2xl font-display font-extrabold text-white" style={{ background: '#22C55E' }}>
              ⬆️ Change plan
            </button>
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || subscription.status === 'canceled'}
              className="flex-1 min-w-[140px] py-3 rounded-2xl font-display font-extrabold text-white disabled:opacity-60"
              style={{ background: '#EF4444' }}
            >
              {cancelMutation.isPending ? 'Canceling…' : subscription.status === 'canceled' ? 'Canceled' : '✕ Cancel'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BillingTab() {
  const { data: invoices, isLoading, isError } = useInvoices();

  return (
    <div className="max-w-[760px] mx-auto">
      <h1 className="font-display text-3xl font-extrabold mb-4">Billing & Invoices 🧾</h1>

      <div className="bg-white rounded-3xl border-2 border-[#EDE4FF] p-2">
        <div className="grid grid-cols-[1.2fr_1.5fr_.8fr_.8fr] px-4 py-3 font-display font-extrabold text-xs text-[#A99BC9] uppercase">
          <span>Date</span><span>Plan</span><span>Amount</span><span className="text-right">Invoice</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 flex justify-center">
            <span className="w-6 h-6 rounded-full border-4 border-[#DDD1FF] border-t-[#8B5CF6] animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-4 py-6 font-bold text-[#B91C1C]">Couldn&rsquo;t load invoices. Please refresh.</div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="px-4 py-6 font-bold text-[#7C6BA8]">No invoices yet.</div>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="grid grid-cols-[1.2fr_1.5fr_.8fr_.8fr] px-4 py-3.5 items-center border-t border-[#F1ECFF] font-bold text-sm text-[#4C1D95]">
              <span>{new Date(inv.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>{PLAN_LABEL[inv.planKey].name}</span>
              <span className="font-display font-extrabold">
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: inv.currency }).format(inv.amount)}
              </span>
              <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="justify-self-end px-3.5 py-1.5 rounded-lg font-display font-extrabold text-xs text-white" style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
                PDF
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}