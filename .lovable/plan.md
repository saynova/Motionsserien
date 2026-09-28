# Fix sign-in callbacks on restricted networks

## Changes
- Remove sign-in credentials from the address bar immediately, before the page and account checks run.
- Complete both supported callback formats: access/refresh tokens in the URL fragment and one-time PKCE codes in the query string.
- Prevent the protected account check from redirecting a valid callback back to `/auth` before its session is established.
- Keep sign-in, sign-up, confirmation, and password-reset requests on `motionsserien.se` through the existing same-origin relay.

## Verification
- Test password sign-in through the local same-origin relay.
- Simulate both callback URL formats and verify credentials disappear immediately and the user reaches My account.
- Check desktop and restricted-network-safe request paths, then publish the verified version.

## Technical details
- Centralize callback parsing and sanitization in the existing authentication URL helper.
- Run callback completion only in the browser and make concurrent route calls share one pending operation.
- Preserve ordinary non-authentication query parameters while removing only sensitive callback parameters.
