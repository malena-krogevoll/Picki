// DNS-over-HTTPS (DoH) resolver for hostnames that fail standard DNS
// in the Supabase Edge Function (Deno) runtime.
//
// Uses Cloudflare's public DoH endpoint to resolve A records,
// then caches the result in memory with a configurable TTL.

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedIP {
  ip: string;
  expiresAt: number;
}

const ipCache = new Map<string, CachedIP>();

/**
 * Resolve a hostname to an IPv4 address using Cloudflare DNS-over-HTTPS.
 * Returns the IP string, or null if resolution fails.
 */
export async function resolveHostname(hostname: string): Promise<string | null> {
  const cached = ipCache.get(hostname);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.ip;
  }

  try {
    const url = `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=A`;
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
    });

    if (!res.ok) {
      console.error(`DoH resolution failed for ${hostname}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    // data.Answer is an array of DNS records; type 1 = A record
    const aRecords = (data.Answer || []).filter((r: any) => r.type === 1);

    if (aRecords.length === 0) {
      console.warn(`DoH: no A records found for ${hostname}`);
      return null;
    }

    const ip = aRecords[0].data as string;
    const ttl = Math.max((aRecords[0].TTL || 300) * 1000, DEFAULT_TTL_MS);

    ipCache.set(hostname, { ip, expiresAt: Date.now() + ttl });
    console.log(`DoH resolved ${hostname} → ${ip} (TTL ${Math.round(ttl / 1000)}s)`);
    return ip;
  } catch (e) {
    console.error(`DoH resolution error for ${hostname}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Build a URL that replaces the hostname with its resolved IP,
 * and return the Host header needed for the request.
 *
 * If DoH resolution fails, returns null so the caller can fall back
 * to a direct fetch (which may also fail with a DNS error).
 */
export async function buildResolvedUrl(
  originalUrl: string
): Promise<{ url: string; hostHeader: string } | null> {
  const parsed = new URL(originalUrl);
  const hostname = parsed.hostname;

  const ip = await resolveHostname(hostname);
  if (!ip) return null;

  // Replace hostname with IP, keep everything else (path, query, port)
  parsed.hostname = ip;
  return {
    url: parsed.toString(),
    hostHeader: hostname,
  };
}
