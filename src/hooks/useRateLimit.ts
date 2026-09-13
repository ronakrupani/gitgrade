import { useEffect, useSyncExternalStore } from "react"
import { fetchRateLimit } from "../api/github"
import { getRateLimit, subscribeRateLimit } from "../api/rateLimit"
import type { RateLimit } from "../api/types"

/**
 * The latest budget GitHub has reported, or null before the first
 * response of the session.
 *
 * On mount it asks /rate_limit once, which is free, so the header shows a
 * number before the first scan. When the window resets it asks again, so
 * a page left open overnight does not still say "0 left" in the morning.
 */
export function useRateLimit(): RateLimit | null {
  const limit = useSyncExternalStore(subscribeRateLimit, getRateLimit, () => null)

  useEffect(() => {
    if (limit === null) {
      // The response headers carry the budget, and the client records
      // them on every response, so the store fills itself.
      fetchRateLimit().catch(() => {
        /* offline; the header stays empty until the first real response */
      })
      return
    }

    const untilReset = limit.reset.getTime() - Date.now()
    if (untilReset <= 0) return
    const timer = setTimeout(() => {
      fetchRateLimit().catch(() => {})
    }, untilReset + 1000)
    return () => clearTimeout(timer)
  }, [limit])

  return limit
}
