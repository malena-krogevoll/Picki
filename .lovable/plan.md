

## Problem: VDA+ DNS Resolution Fails in Supabase Edge Functions

The core issue is that `vda.tradesolution.no` cannot be resolved from the Supabase Edge Function (Deno) runtime. The OAuth2 token endpoint (`login.microsoftonline.com`) works fine, so it's a DNS issue specific to that hostname -- likely because the domain uses a less common DNS configuration that the edge runtime's resolver can't handle.

## Proposed Solution: DNS-over-HTTPS Resolver Fallback

Resolve the hostname manually using a public DNS-over-HTTPS (DoH) service (Cloudflare `1.1.1.1` or Google `8.8.8.8`) before making the request. Then fetch using the resolved IP address with a `Host` header.

### Changes

**1. `supabase/functions/fetch-epd/index.ts`**
- Add a `resolveHostname()` helper that calls Cloudflare DoH (`https://cloudflare-dns.com/dns-query`) to resolve `vda.tradesolution.no` to an IP address
- Cache the resolved IP in memory (alongside the token cache) with a TTL
- Rewrite fetch URLs from `https://vda.tradesolution.no/...` to `https://<resolved-ip>/...` with explicit `Host: vda.tradesolution.no` header
- Remove the try/catch DNS fallback since this should now work

**2. `supabase/functions/search-products/index.ts`**
- Apply the same DoH resolution pattern to `fetchVdaProduct()` so background enrichment also works

### How the DoH resolution works

```text
1. Edge function needs to call vda.tradesolution.no
2. First, fetch https://cloudflare-dns.com/dns-query?name=vda.tradesolution.no&type=A
   (with Accept: application/dns-json header)
3. Response contains resolved IP(s), e.g. 13.95.174.67
4. Cache IP in memory for 5 minutes
5. Fetch https://13.95.174.67/api/v1/products/7043180087129
   with headers: { Host: "vda.tradesolution.no", Authorization: "Bearer ..." }
```

### Key details
- Cloudflare DoH endpoint is widely accessible from edge runtimes
- IP cache prevents repeated DNS lookups (5 min TTL)
- Keep existing graceful error handling as final fallback
- Both `fetch-epd` and `search-products` get the same fix

