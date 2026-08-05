'use client';
import { Navbar } from '@/components/navbar/Navbar';
import { PLANS } from '@/constants';
import { formatPrice } from '@/lib/utils';
import { useStripeCheckout, usePaypalOrder } from '@/features/payments/hooks';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Button } from '@/components/ui/button';

// Pricing + checkout. Stripe hosted checkout OR PayPal buttons.
// After a successful payment the backend webhook activates the plan and
// sends a confirmation email; the user returns with premium access.
export default function PricingPage() {
  const stripe = useStripeCheckout();
  const paypal = usePaypalOrder();
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'test';

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <h1 className="font-display font-extrabold text-4xl text-brand-900 text-center">Simple, family-friendly pricing</h1>
        <p className="font-body font-bold text-brand-600 text-center mt-2 mb-10">Start free. Upgrade anytime. Cancel whenever.</p>

        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((p) => (
              <div key={p.key} className={'rounded-3xl p-7 border-2 relative ' + (p.popular ? 'bg-gradient-to-br from-brand-600 to-brand-800 border-brand-800 text-white' : 'bg-white border-brand-100')}>
                {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sun-400 text-amber-900 font-display font-extrabold text-xs px-3 py-1 rounded-full">★ Most popular</span>}
                <div className={'font-display font-extrabold text-2xl ' + (p.popular ? 'text-white' : 'text-brand-900')}>{p.name}</div>
                <div className={'font-display font-extrabold text-4xl mt-2 mb-4 ' + (p.popular ? 'text-white' : 'text-brand-900')}>{p.priceCents === 0 ? 'Free' : formatPrice(p.priceCents)}<span className="text-base opacity-70">{p.priceCents ? '/mo' : ''}</span></div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => <li key={f} className={'font-body font-bold text-sm ' + (p.popular ? 'text-brand-100' : 'text-brand-700')}>✓ {f}</li>)}
                </ul>
                {p.key === 'free' ? (
                  <Button variant={p.popular ? 'outline' : 'ghost'} className="w-full">Current plan</Button>
                ) : (
                  <div className="space-y-3">
                    <Button variant={p.popular ? 'outline' : 'primary'} className="w-full" onClick={() => stripe.mutate(p.key)} disabled={stripe.isPending}>
                      {stripe.isPending ? 'Redirecting…' : '💳 Pay with card (Stripe)'}
                    </Button>
                   <PayPalButtons
  createOrder={() => paypal.createOrder(p.key)}
  onApprove={async (data) => {
    await paypal.capture(data.orderID);
    window.location.href = '/dashboard?checkout=success';
  }}
/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
