# Payments: $0 pilot plans and PayPal checkout

Prices live in the `SubscriptionPlan` table (see `src/pricing/`). For a plan
that checkout can sell (a `ROLE_PLAN` row with `grantsPlan` set), its
`monthlyPriceMinor` decides what the pricing card does:

| `monthlyPriceMinor` | Card shows | What happens |
| --- | --- | --- |
| `0` | **Free** · "Free during Kidora pilot" · **Start Pilot** | Activated directly by `POST /api/payments/activate-plan`. No payment provider is called. |
| `> 0` | the price · **Get Started** | Opens the payment chooser: Chapa, card (Stripe), PayPal. |
| `null` | **Custom** | Contact sales / sign-up, as before. |

Moving a plan between the pilot and paid checkout is a data change, not a
code change or a deploy.

## Starting the pilot (all sellable plans at $0)

The seeded prices are not $0. To run the pilot, set them in the database:

```sql
UPDATE "SubscriptionPlan" SET "monthlyPriceMinor" = 0, "updatedAt" = now()
WHERE "kind" = 'ROLE_PLAN' AND "grantsPlan" IS NOT NULL;
```

To start charging later (prices in minor units, e.g. cents):

```sql
UPDATE "SubscriptionPlan" SET "monthlyPriceMinor" = 500, "updatedAt" = now() WHERE "slug" = 'plan-parent';
```

The seeded prices were: plan-student 499, plan-parent 799, plan-school 4999,
plan-district 9999 (USD cents).

## Flows

**$0 pilot plan.** `POST /api/payments/activate-plan { plan }`.
`PaymentSettlementService.activatePilot` checks that the plan's price is
exactly 0 right now. Then it writes a `Payment` (`provider = pilot`,
`status = succeeded`, `amountCents = 0`) — a record of the activation, not a
pretend transaction — and makes the `Subscription` active with no end date.
A repeat call changes nothing. Pilot rows are left out of invoices. To close
the pilot, give pilot subscriptions an end date:
`UPDATE "Subscription" SET "renewsAt" = '2027-01-31' WHERE provider = 'pilot';`

**PayPal.**

1. `POST /api/payments/paypal/create-order { plan }`. The price comes from the
   plan row, and a `pending` Payment row is written first. Its id is sent as
   the PayPal-Request-Id and as `custom_id`.
2. The buyer approves in the PayPal popup.
3. `POST /api/payments/paypal/capture-order { orderId }`. Only the payment's
   owner can capture it. The same request id is reused on every retry, so
   PayPal never captures twice. The capture must reference this Payment row,
   and the plan is granted only through `PaymentSettlementService.settle`,
   which checks the amount, currency and payer (the same rule as Chapa and
   Stripe).
4. If PayPal holds the capture for review (`PENDING`), nothing unlocks yet.
5. If the buyer closes the popup, `POST /api/payments/paypal/cancel-order`
   records it. No money moved.

`paypal/order` and `paypal/capture` remain as aliases of the new routes. The
browser never sends a price; extra fields are stripped by the validation pipe.

## PayPal setup

1. At <https://developer.paypal.com> → **Apps & Credentials** → **Sandbox** →
   **Create App** (Merchant). Copy the Client ID and Secret.
2. In `kidora-api/.env`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
   `PAYPAL_ENVIRONMENT=sandbox`. The web app needs nothing: it reads the
   public client id from `GET /api/payments/providers`.
3. Test with a sandbox *Personal* account (**Testing Tools → Sandbox
   Accounts**). Note that a `ETB` price cannot go through PayPal; use USD for
   plans sold there.
4. Going live: create a Live app and set `PAYPAL_ENVIRONMENT=production`. At
   boot the API logs `PayPal: production (https://api-m.paypal.com)`.

## Not built yet

PayPal webhooks (refunds, disputes, completing a `PENDING` capture) and
recurring billing. Each order buys 30 days. `Payment.providerCaptureId` is
already stored for webhooks to match on.
