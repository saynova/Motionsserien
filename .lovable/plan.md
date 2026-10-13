# Shuttle order confirmation email for paid orders

## What changes

**Shuttle order form (`/shuttles`)**
- New "Your email" field (required) in the order form, so the buyer can receive the confirmation.
- When the buyer chooses **Paid (Swish sent)** and submits, they receive an order confirmation email right away.
- The email tells them: "Please show this confirmation to the General when collecting your shuttle box." It includes team name, buyer name, box count and price.
- Orders placed as **Unpaid** get no email.

**Admin → Shuttle purchases**
- The admin order list also shows the buyer's email so the General can match the confirmation shown at collection.

## Technical details

- Migration: add nullable `buyer_email text` column to `public.shuttle_orders` (no breaking change; existing orders stay without email).
- New React Email template `shuttle-order-confirmation` in `src/lib/email-templates/`, registered in `registry.ts` — brand styling, order summary, "show this to the General when collecting" message.
- `src/lib/extras.functions.ts`:
  - `submitShuttleOrder` validates and stores the email (basic format check, lowercased, 120 chars max).
  - After inserting a **paid** order, it sends the confirmation via `sendTemplateEmail` with an idempotency key based on the order id; email failure never blocks the order.
  - Admin and public column lists updated (email only in the admin list — never exposed publicly).
- `src/routes/shuttles.tsx`: email input added to the form; success toast mentions the confirmation email when paid.
- `src/routes/admin.tsx` (ShuttleAdmin): buyer email shown on each order row.

## Verification

- `npx tsgo --noEmit` passes; build log shows OK.
- Browser check: place a paid test order with an email, confirm the email send is triggered and the order appears; delete the test order afterwards.
