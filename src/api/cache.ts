/**
 * A cache of GitHub responses in localStorage, keyed by URL.
 *
 * Rate limits are the defining constraint of this project: sixty requests
 * an hour without a token, and a twenty repo account spends forty one on
 * one scan. Serving the second scan from cache is the difference between
 * a tool you can use twice and one you cannot.
 *
 * Entries carry the response body and status, not the rate limit headers.
 * A cached response says nothing about the budget now, so the client
 * skips recording headers on a cache hit.
 *
 * localStorage can be missing, full, or throw on access in a private
 * window. Every read and write is wrapped, and a cache that does not work
 * is the same as no cache: the request goes out as it would have anyway.
 */

const PREFIX = "gitgrade:cache:"

/** One hour. Long enough to survive the hourly limit, short enough that a fix shows up. */
export const TTL_MS = 60 * 60 * 1000

export interface CacheEntry {
  status: number
  contentType: string | null
  body: string
  /** When it was stored, as epoch milliseconds. */
  storedAt: number
}

function key(url: string): string {
  return PREFIX + url
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** The entry for a URL, whatever its age. Callers decide what stale means. */
export function readCache(url: string): CacheEntry | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(key(url))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (typeof entry.body !== "string" || typeof entry.storedAt !== "number") {
      return null
    }
    return entry
  } catch {
    return null
  }
}

/** Whether an entry is within the TTL. */
export function isFresh(entry: CacheEntry, now: number = Date.now()): boolean {
  return now - entry.storedAt < TTL_MS
}

export function writeCache(url: string, entry: CacheEntry): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(key(url), JSON.stringify(entry))
  } catch {
    // Quota. Clear our own expired entries and try once more; if that is
    // not enough, this response just does not get cached.
    evictExpired()
    try {
      store.setItem(key(url), JSON.stringify(entry))
    } catch {
      /* give up quietly */
    }
  }
}

/** Removes every entry past its TTL. Only touches our own keys. */
export function evictExpired(now: number = Date.now()): void {
  const store = storage()
  if (!store) return
  try {
    const stale: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const raw = store.getItem(k)
      if (!raw) continue
      try {
        const entry = JSON.parse(raw) as CacheEntry
        if (!isFresh(entry, now)) stale.push(k)
      } catch {
        stale.push(k)
      }
    }
    for (const k of stale) store.removeItem(k)
  } catch {
    /* nothing to do */
  }
}

/** Removes every entry. Only touches our own keys. */
export function clearCache(): void {
  const store = storage()
  if (!store) return
  try {
    const ours: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k?.startsWith(PREFIX)) ours.push(k)
    }
    for (const k of ours) store.removeItem(k)
  } catch {
    /* nothing to do */
  }
}
