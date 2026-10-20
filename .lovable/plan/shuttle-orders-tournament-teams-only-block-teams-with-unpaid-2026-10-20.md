# Shuttle orders: tournament teams only + block teams with unpaid orders

## What changes

**Shuttle purchase page (/shuttles)**
- Team name becomes a search-as-you-type picker: as the buyer types, matching teams from the current tournament list appear and they tap one.
- Only a team from the list can be chosen. Free-typed names that aren't in the tournament are rejected ("Please choose your team from the tournament list").
- If the chosen team already has an earlier order still marked **Unpaid** (not removed by the admin), the form shows a red box right away and the order button is disabled:
  "Your team is blocked from purchasing shuttles because of an unpaid order. Please contact the General if you think this is an error." (with a link to the contact page)
- The same checks also run when the order is sent, so they can't be bypassed.

**Admin → Shuttle purchases**
- New "Add order" box for the admin: type any team/buyer name (inside or outside the tournament), choose Paid/Unpaid, save. Admin orders are approved straight away and are never blocked.
- Once the admin clicks "Mark paid" (or removes the old order), the team is unblocked automatically.

## Technical details

- Team list source: current season `teams` names (public names only), via a new public server function `getShuttleTeamOptions` returning names plus a per-team `blocked` flag (any `shuttle_orders` row with `payment_status='unpaid'` and status not `rejected/removed`, matched case-insensitively). No contact data exposed.
- `submitShuttleOrder`: verify team name exists in `teams` (case-insensitive) and that no unpaid order exists; throw the blocked message otherwise. Keeps the one-box-per-week rule and email confirmation.
- New admin-gated `adminCreateShuttleOrder` (any name, status approved, paid/unpaid, optional email; skips the team and unpaid checks).
- `shuttles.tsx`: combobox-style input with filtered dropdown list, selected-team state, blocked warning.
- `admin.tsx` ShuttleAdmin: "Add order" form.
- No database changes needed.

## Verification
- Typecheck/build OK; browser check: typing shows teams, non-listed name rejected, a team with an unpaid order sees the blocked message; test orders removed afterwards.
