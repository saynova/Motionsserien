# Add a flexible donation option

## Goal
Let visitors donate money to Ludvika Badmintonklubb / Motionsserien with a donor-chosen amount.

## Provider
Paddle (recommended and confirmed by the eligibility check). Paddle acts as the merchant of record and handles tax compliance automatically.

## What will happen when enabled
- A test environment is created immediately so donations can be tested without real money.
- Accepting live payments requires verification on the Paddle side.

## Plan

1. Enable Paddle payments
   - Call `enable_paddle_payments`.
   - This creates the test environment and makes the Paddle client available.

2. Create a donation product
   - One Paddle product called e.g. "Donation to Motionsserien".
   - Custom / flexible price: donor enters the amount before checkout.

3. Add a public "Donate" page
   - New route `/donate` linked in the navigation and footer.
   - Simple form: amount input (min value, e.g. 25 kr), optional message/name, submit button.
   - Explain that this is a voluntary donation to the club/series.

4. Implement Paddle checkout
   - On submit, call a server function that creates a Paddle checkout session with the chosen amount.
   - Redirect the donor to Paddle's hosted checkout.
   - After successful payment, show a thank-you page at `/donate/thanks`.

5. Record donations (optional but useful)
   - New `donations` table: amount, currency, paddle_transaction_id, donor_name, message, status, created_at.
   - Admin-only view in the admin console showing a list of donations and a total.

6. Webhook / post-payment handling
   - Public webhook endpoint under `/api/public/paddle-webhook`.
   - Verify Paddle signature and update the donation status to `completed`.

## Technical notes
- Add `src/routes/donate.tsx` and `src/routes/donate/thanks.tsx`.
- Add `src/lib/donations.functions.ts` for `createDonationCheckout` (admin not required).
- Add `src/routes/api/public/paddle-webhook.ts` for the Paddle callback.
- New migration: `donations` table with RLS and grants; service_role writes via webhook, admin reads via server function.
- No changes to existing tournament/scoring logic.
