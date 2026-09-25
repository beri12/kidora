import { api } from "./client";

/** GET /pricing — every price the pricing page shows comes from here. */
export interface PublicPlan {
  slug: string;
  audience: "STUDENT" | "PARENT" | "TEACHER" | "SCHOOL" | "DISTRICT";
  name: string;
  tagline: string;
  unitLabel: string;
  currency: string;
  /** Minor units (cents). Null = custom pricing. */
  monthlyPriceMinor: number | null;
  yearlyPriceMinor: number | null;
  features: string[];
  /** Set when "Get Started" can go straight to checkout for a signed-in visitor. */
  checkoutPlan: "family" | "school" | null;
}

export interface PricingCatalog {
  plans: PublicPlan[];
  schoolTiers: PublicPlan[];
}

export const pricingApi = {
  catalog: () => api.get<PricingCatalog>("/pricing"),
};

/**
 * Formats a minor-unit amount for display. Integer maths until the last
 * step, and the currency's own symbol and decimals come from Intl.
 */
export function formatMoney(minor: number, currency: string, opts: { compact?: boolean } = {}) {
  const fmt = new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
  const value = minor / 10 ** digits;
  if (opts.compact && Number.isInteger(value)) {
    return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(value);
  }
  return fmt.format(value);
}
