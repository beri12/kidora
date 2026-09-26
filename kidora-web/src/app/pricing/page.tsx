'use client';

import { Suspense } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { PricingView } from '@/features/pricing/PricingView';

/**
 * Pricing. Every plan, price and feature on this page comes from GET /pricing
 * (the SubscriptionPlan table), so prices change without a deploy, and
 * checkout charges exactly the price the card showed.
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-sky-50">
      <Navbar />
      <Suspense fallback={null}>
        <PricingView />
      </Suspense>
    </div>
  );
}
