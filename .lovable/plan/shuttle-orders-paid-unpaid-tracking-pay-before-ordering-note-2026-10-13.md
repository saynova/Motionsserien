# Shuttle orders: paid/unpaid tracking + "pay before ordering" note

## What changes

**Public Shuttle purchase page (`/shuttles`)**
- Add a clear note in the order form and the Swish box: "Please make the payment before placing the order." (Swish 123 478 50 69, price per box).
- The public approved-orders list also shows each order's Paid/Unpaid badge so teams can see their payment was registered.

**Admin → Shuttle purchases**
- Every order row gets a Paid / Unpaid toggle button (same style as the existing Approve/Remove buttons).
- New orders start as Unpaid. The admin marks them Paid once the Swish payment arrives.
- A small summary line shows how many approved orders are still unpaid.

## Technical details

- Migration: add `payment_status text not null default 'unpaid'` to `public.shuttle_orders` (with a check constraint limiting it to `paid`/`unpaid`); types regenerate automatically.
- `src/lib/extras.functions.ts`:
  - Include `payment_status` in the order column lists (admin and public).
  - New admin-gated server function `setShuttleOrderPaid(orderId, paid)` that updates the row.
- `src/routes/admin.tsx` (ShuttleAdmin): Paid/Unpaid toggle per row + unpaid summary count.
- `src/routes/shuttles.tsx`: "please pay before ordering" note in the form and Swish section; Paid/Unpaid badge on each approved order in the public list.
- No change to the one-box-per-week rule, approval flow, or prices.

## Verification

- `npx tsgo --noEmit` passes; build log shows OK.
- Browser check: submit a test order, approve and mark it paid in admin, confirm the badge shows on the public page.
