// DNS-over-HTTPS (DoH) resolver for hostnames that fail standard DNS
// in the Supabase Edge Function (Deno) runtime.
//
// Uses Cloudflare's public DoH endpoint to resolve A records,
// then caches the result in memory with a configurable TTL.

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const GOOGLE_DOH_ENDPOINT = "https://dns.google/resolve";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedIP {
  ip: string;
  expiresAt: number;
}

const ipCache = new Map<string, CachedIP>();

/**
 * Resolve a hostname to an IPv4 address using DNS-over-HTTPS.
 * Follows CNAME chains and tries multiple DoH providers.
 * Returns the IP string, or null if resolution fails.
 */
export async function resolveHostname(hostname: string): Promise<string | null> {
  const cached = ipCache.get(hostname);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.ip;
  }

  // Try Cloudflare first, then Google as fallback
  for (const endpoint of [DOH_ENDPOINT, GOOGLE_DOH_ENDPOINT]) {
    try {
      const ip = await queryDoH(endpoint, hostname);
      if (ip) {
        ipCache.set(hostname, { ip, expiresAt: Date.now() + DEFAULT_TTL_MS });
        console.log(`DoH resolved ${hostname} → ${ip} (via ${new URL(endpoint).hostname})`);
        return ip;
      }
    } catch (e) {
      console.warn(`DoH error (${new URL(endpoint).hostname}) for ${hostname}:`, e instanceof Error ? e.message : e);
    }
  }

  console.warn(`DoH: all providers failed for ${hostname}`);
  return null;
}

async function queryDoH(endpoint: string, hostname: string): Promise<string | null> {
  const url = `${endpoint}?name=${encodeURIComponent(hostname)}&type=A`;
  const res = await fetch(url, {
    headers: { Accept: "application/dns-json" },
  });

  if (!res.ok) {
    console.warn(`DoH HTTP ${res.status} from ${new URL(endpoint).hostname}`);
    return null;
  }

  const data = await res.json();
  const answers = data.Answer || [];

  // Type 1 = A record, Type 5 = CNAME
  // Follow CNAME chain: if we only get CNAMEs, resolve the final CNAME target
  const aRecords = answers.filter((r: any) => r.type === 1);

  if (aRecords.length > 0) {
    return aRecords[0].data as string;
  }

  // Follow CNAME chain - get the last CNAME target and resolve it
  const cnameRecords = answers.filter((r: any) => r.type === 5);
  if (cnameRecords.length > 0) {
    const target = cnameRecords[cnameRecords.length - 1].data as string;
    // Remove trailing dot if present
    const cleanTarget = target.endsWith('.') ? target.slice(0, -1) : target;
    console.log(`DoH: following CNAME ${hostname} → ${cleanTarget}`);
    
    // Resolve the CNAME target (non-recursive, just one more query)
    const targetUrl = `${endpoint}?name=${encodeURIComponent(cleanTarget)}&type=A`;
    const targetRes = await fetch(targetUrl, {
      headers: { Accept: "application/dns-json" },
    });
    if (targetRes.ok) {
      const targetData = await targetRes.json();
      const targetA = (targetData.Answer || []).filter((r: any) => r.type === 1);
      if (targetA.length > 0) {
        return targetA[0].data as string;
      }
    }
  }

  return null;
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
