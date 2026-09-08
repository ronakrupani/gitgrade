import type { RateLimit } from "./types"

/**
 * GitHub reports the remaining budget on the headers of every response,
 * including the ones that failed. Reading them there means the status
 * indicator stays current without spending a request to ask.
 */
export function parseRateLimitHeaders(headers: Headers): RateLimit | null {
  const limit = headers.get("x-ratelimit-limit")
  const remaining = headers.get("x-ratelimit-remaining")
  const reset = headers.get("x-ratelimit-reset")

  if (limit === null || remaining === null || reset === null) return null

  const parsed = {
    limit: Number(limit),
    remaining: Number(remaining),
    reset: Number(reset),
  }

  // A malformed header is worse than no header: it would render as NaN.
  if (!Number.isFinite(parsed.limit)) return null
  if (!Number.isFinite(parsed.remaining)) return null
  if (!Number.isFinite(parsed.reset)) return null

  return {
    limit: parsed.limit,
    remaining: parsed.remaining,
    reset: new Date(parsed.reset * 1000),
  }
}

let latest: RateLimit | null = null
const listeners = new Set<(limit: RateLimit) => void>()

/** The most recent budget seen on any response, or null before the first. */
export function getRateLimit(): RateLimit | null {
  return latest
}

/** Called by the client for every response it receives. */
export function recordRateLimit(headers: Headers): void {
  const parsed = parseRateLimitHeaders(headers)
  if (!parsed) return
  latest = parsed
  for (const listener of listeners) listener(parsed)
}

/** Returns an unsubscribe function. */
export function subscribeRateLimit(
  listener: (limit: RateLimit) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test seam. Resets the module between cases. */
export function resetRateLimit(): void {
  latest = null
  listeners.clear()
}
