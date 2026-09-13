import { useRateLimit } from "../hooks/useRateLimit"

/** "3:40 PM" in the visitor's clock. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

/**
 * How many requests are left this hour, and when the hour turns over. It
 * sits in the header because the budget is a property of the session, not
 * of a scan, and the one time it matters most is before you press Grade.
 *
 * Section 7: never fail silently. When the budget is gone this says so,
 * in the same place, in plain words.
 */
export default function RateLimitStatus() {
  const limit = useRateLimit()
  if (!limit) return null

  const reset = formatTime(limit.reset)

  if (limit.remaining === 0) {
    return (
      <p role="status" className="tabular text-xs text-muted">
        GitHub rate limit used up. Resets at {reset}.
      </p>
    )
  }

  return (
    <p className="tabular text-xs text-muted">
      <span title={`GitHub allows ${limit.limit} requests an hour without a token.`}>
        {limit.remaining} of {limit.limit} requests left
      </span>
      <span aria-hidden="true"> · </span>
      <span>resets {reset}</span>
    </p>
  )
}
