# Restore access from the office network

## Confirmed diagnosis

The screenshot shows `DNS_PROBE_FINISHED_NXDOMAIN`. This happens before the website is contacted: the
office laptop's DNS service is saying the address does not exist.

The website itself is live and healthy right now:

- `motionsserien.se` and `www.motionsserien.se` are both Active and published.
- Cloudflare, Google and Quad9 DNS all return the correct address: `185.158.133.1`.
- The site returns HTTP 200 over HTTPS.
- Players can reach it from other networks.

Therefore there is no website-code or Strato record change to make. Changing working DNS could break
access for everyone. The fault is isolated to the office DNS cache/filter.

## Fix on the affected office laptop

1. First open `https://www.motionsserien.se` in a private browser window.
2. If it still shows NXDOMAIN, open Windows Command Prompt and run:
   ```text
   ipconfig /flushdns
   ```
   Then close and reopen the browser.
3. If allowed by the office, set the computer's DNS to Cloudflare `1.1.1.1` and `1.0.0.1`, or test with
   a phone hotspot. If it opens on the hotspot, that conclusively confirms the office network is blocking
   or caching the domain.
4. If the office controls DNS settings, ask IT to clear the cached NXDOMAIN result and allow:
   `motionsserien.se` and `www.motionsserien.se`.

## What I will not change

- No app code changes.
- No Strato DNS changes — the public records are correct.
- The unrelated season-permission warning remains untouched as requested.
