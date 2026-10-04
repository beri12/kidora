# Payments: pilot activation and PayPal checkout

Kidora sells plans (`free`, `family`, `school`, `district`) from one catalog,
the `Plan` table. The price on that row decides everything:

| Plan row | Pricing card shows | What happens |
| --- | --- | --- |
| `priceCents = 0`, `pilotEnabled = true` | **Free** · "Free during Kidora pilot" · **Start Pilot** | Activated directly. PayPal is never called. |
| `key = free`, `priceCents = 0` | **Free** · **Start Free** | Activated directly. |
| `priceCents > 0` | **$5.00/mo** · **PayPal button** | PayPal checkout for exactly that amount. |
| `priceCents = 0`, not pilot, not `free` | **Contact us** · **Contact Sales** | Not self-serve. |
| `active = false` | **Currently unavailable** | Hidden from checkout. |

During the pilot every plan is $0 (the migration seeds it that way), so no
PayPal script is loaded and no PayPal order is ever created.

## How it fits together

```
/pricing, /plus ──► GET  /api/payments/plans            prices + checkout mode + public PayPal client id
  $0 plan      ──► POST /api/payments/activate-plan     { planId }
  priced plan  ──► POST /api/payments/paypal/create-order   { planId }  ─► PayPal Orders v2 (intent CAPTURE)
               ◄── PayPal popup, buyer approves
               ──► POST /api/payments/paypal/capture-order  { orderId } ─► capture, verify, activate
  buyer closes ──► POST /api/payments/paypal/cancel-order   { orderId }
```

Code: `kidora-api/src/payments/` (`plans.service.ts` catalog,
`payments.service.ts` business rules, `paypal.service.ts` REST client) and
`kidora-web/src/components/checkout/PlanCheckout.tsx`.

**The browser never sends a price.** Requests carry only `planId` or the
PayPal `orderId`; the user comes from the JWT. Extra fields such as `amount`
or `userId` are stripped by the validation pipe.

## How a subscription is activated

- **$0 plan** — a `Payment` row is written with `provider = pilot`,
  `status = succeeded`, `amountCents = 0` (a record, not a pretend
  transaction), and the user's `Subscription` is set to the plan, `active`,
  `provider = pilot`, no end date. Pilot rows are left out of invoices. The
  free tier writes no payment row.
- **Priced plan** — `create-order` writes a `pending` Payment with the amount
  from the Plan table and uses that row's id as PayPal's `PayPal-Request-Id`
  and `custom_id`. `capture-order` captures, then checks that PayPal charged
  exactly that amount and currency for that Payment. Only then is the Payment
  `succeeded` (with `providerCaptureId`) and the Subscription `active` until
  `now + 30 days` (or 365 for a yearly plan; paying early for the same plan
  extends it).
- A capture PayPal holds for review (`PENDING`) unlocks nothing yet.

Repeat clicks, refreshes and retried captures are safe: activations take a
per-user Postgres advisory lock, capture reuses the same PayPal request id
(PayPal answers a repeat with its first response), and only the call that
moves the Payment to `succeeded` activates anything.

`POST /api/subscriptions` (account page) uses the same rules: it activates
$0 plans and refuses priced ones.

## PayPal setup

1. Sign in at <https://developer.paypal.com> with a PayPal business account.
2. **Apps & Credentials** → **Sandbox** → **Create App** (type: Merchant).
   Copy the **Client ID** and **Secret**.
3. **Testing Tools → Sandbox Accounts**: use the generated *Personal* account
   (or create one) to pay with during tests.
4. In `kidora-api/.env`:

   ```
   PAYPAL_CLIENT_ID=<sandbox client id>
   PAYPAL_CLIENT_SECRET=<sandbox secret>
   PAYPAL_ENVIRONMENT=sandbox
   ```

   The REST host follows the environment: `sandbox` →
   `https://api-m.sandbox.paypal.com`, `production` →
   `https://api-m.paypal.com`. An unrecognised value turns PayPal off and
   logs an error at boot. The web app needs no PayPal variable — it reads the
   public client id from `GET /api/payments/plans`. Never put the secret in a
   `NEXT_PUBLIC_*` variable.

At boot the API logs one of `PayPal checkout: sandbox (...)` or
`PayPal checkout is off (...)`.

## Testing locally

```bash
cd kidora-api && npm install && npx prisma migrate deploy && npm run start:dev
cd kidora-web && npm install && npm run dev
```

- **Pilot:** open `/pricing` signed out → **Start Pilot** → sign in → you are
  returned and activated → dashboard banner "Your Kidora pilot access is now
  active." `select * from "Payment" where provider = 'pilot'` shows the record.
- **PayPal:** give a plan a price (below), reload `/pricing`, sign in, click
  the PayPal button, pay with the sandbox Personal account. Expect "Payment
  successful. Your Kidora plan is now active." and a `succeeded` paypal row.
  Close the popup instead to see "Payment was cancelled. No charge was made."
- Unit tests: `npm test -- src/payments`.

## Changing prices

A data change; no code change, no deploy:

```sql
-- Start charging $5/month for Family
UPDATE "Plan" SET "priceCents" = 500, "pilotEnabled" = false WHERE "key" = 'family';

-- Back to the pilot
UPDATE "Plan" SET "priceCents" = 0, "pilotEnabled" = true WHERE "key" = 'family';

-- Take a plan off sale / make district contact-only
UPDATE "Plan" SET "active" = false WHERE "key" = 'school';
UPDATE "Plan" SET "pilotEnabled" = false WHERE "key" = 'district';
```

(`npx prisma studio` works too.) Prices are in cents. The pricing page picks
the change up within five minutes, or on reload. Orders already created keep
the price they were created at.

`PAYMENTS_MIN_PAID_AMOUNT_CENTS` (default 1) is the lowest price PayPal will
be asked to charge; a plan priced between 0 and it is kept out of checkout.

Feature bullets and descriptions on the cards are marketing copy and live in
the web app (`src/constants/index.ts` for `/pricing`, `src/app/plus/page.tsx`).

## Going live

1. In the PayPal dashboard switch to **Live**, create a Live app, copy its
   client id and secret.
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and
   `PAYPAL_ENVIRONMENT=production` on the API, restart, and check the boot log
   says `PayPal checkout: production (https://api-m.paypal.com)`.
3. Make one small real purchase and refund it from the PayPal dashboard.

## Not built yet

- **Webhooks** (`PAYMENT.CAPTURE.COMPLETED`, `.REFUNDED`, `.REVERSED`,
  disputes). Matching fields are in place: `Payment.externalId` (order id),
  `Payment.providerCaptureId` (capture id), statuses `refunded`/`cancelled`.
  A webhook is also what would complete a `PENDING` capture.
- **Recurring billing.** Each PayPal order buys one period; nothing renews
  automatically. PayPal Subscriptions (billing plans) would replace
  create/capture for recurring plans.
