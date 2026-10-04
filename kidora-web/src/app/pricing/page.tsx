'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar/Navbar';
import { PLANS } from '@/constants';
import { buttonVariants } from '@/components/ui/button';
import { PlanCheckoutButton, PlanCheckoutProvider } from '@/components/checkout/PlanCheckout';
import { priceLabel, usePlanCatalog } from '@/features/payments/hooks';

// Pricing + checkout. Prices come from the API's plan catalog: a $0 plan is
// activated directly ("Start Pilot"), a priced plan checks out with PayPal.
// The backend decides the amount; nothing here is sent as a price.
function PricingInner() {
  const { data } = usePlanCatalog();
  // Set by the sign-in redirect so the visitor lands back on the plan they chose.
  const resume = useSearchParams().get('plan');

  useEffect(() => {
    if (resume) document.getElementById(`plan-${resume}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [resume]);

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <h1 className="font-display font-extrabold text-4xl text-brand-900 text-center">Simple, family-friendly pricing</h1>
        <p className="font-body font-bold text-brand-600 text-center mt-2 mb-10">Start free. Upgrade anytime. Cancel whenever.</p>

        <PlanCheckoutProvider>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((p) => {
              const price = priceLabel(data?.plans.find((x) => x.id === p.key));
              return (
                <div key={p.key} id={`plan-${p.key}`} className={'rounded-3xl p-7 border-2 relative ' + (p.popular ? 'bg-gradient-to-br from-brand-600 to-brand-800 border-brand-800 text-white' : 'bg-white border-brand-100') + (resume === p.key ? ' ring-4 ring-sun-400' : '')}>
                  {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sun-400 text-amber-900 font-display font-extrabold text-xs px-3 py-1 rounded-full">★ Most popular</span>}
                  <div className={'font-display font-extrabold text-2xl ' + (p.popular ? 'text-white' : 'text-brand-900')}>{p.name}</div>
                  <div className={'font-display font-extrabold text-4xl mt-2 ' + (price.note ? 'mb-1' : 'mb-4') + ' ' + (p.popular ? 'text-white' : 'text-brand-900')}>{price.amount}<span className="text-base opacity-70">{price.suffix ?? ''}</span></div>
                  {price.note && <div className={'font-body font-bold text-sm mb-4 ' + (p.popular ? 'text-brand-100' : 'text-grass-600')}>{price.note}</div>}
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => <li key={f} className={'font-body font-bold text-sm ' + (p.popular ? 'text-brand-100' : 'text-brand-700')}>✓ {f}</li>)}
                  </ul>
                  <PlanCheckoutButton
                    planId={p.key}
                    autoStart={resume === p.key}
                    tone={p.popular ? 'light' : 'dark'}
                    buttonClassName={buttonVariants({ variant: p.popular ? 'outline' : p.key === 'free' ? 'ghost' : 'primary' })}
                  />
                </div>
              );
            })}
          </div>
        </PlanCheckoutProvider>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-50" />}>
      <PricingInner />
    </Suspense>
  );
}
