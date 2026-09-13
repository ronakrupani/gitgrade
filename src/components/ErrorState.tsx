import type { GitHubError } from "../api/errors"
import { getRateLimit } from "../api/rateLimit"

/**
 * A boxed message with a one line title and a one line body. Neutral
 * colours only: section 8b keeps red for check rows and the grade badge,
 * and an error the user can do nothing about does not need to shout.
 */
export function Notice({
  title,
  children,
  role = "status",
}: {
  title: string
  children?: React.ReactNode
  role?: "status" | "alert"
}) {
  return (
    <div
      role={role}
      className="rounded-lg border border-border bg-surface px-5 py-4"
    >
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  )
}

/** "3:40 PM" in the visitor's clock. */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * One message per kind of failure, written for the person reading it
 * rather than the request that produced it.
 *
 * "No such user" and "come back in forty minutes" are both 4xx responses,
 * and telling someone to wait for a problem that waiting will not fix is
 * worse than saying nothing. The client has already sorted them; this
 * component only picks the words.
 */
export default function ErrorState({
  error,
  username,
}: {
  error: GitHubError
  username?: string
}) {
  switch (error.kind) {
    case "not-found":
      return (
        <Notice
          role="alert"
          title={
            username
              ? `No GitHub account called ${username}.`
              : "Not found on GitHub."
          }
        >
          Check the spelling. Usernames are not case sensitive, but every other
          character has to match.
        </Notice>
      )

    case "rate-limited": {
      const limit = getRateLimit()
      return (
        <Notice role="alert" title="GitHub's rate limit is used up.">
          {limit
            ? `It resets at ${formatTime(limit.reset)}. `
            : "It resets within the hour. "}
          Without a token GitHub allows 60 requests an hour, and a scan spends
          about two per repo.
        </Notice>
      )
    }

    case "network":
      return (
        <Notice role="alert" title="Could not reach GitHub.">
          Check your connection and try again.
        </Notice>
      )

    case "http":
      return (
        <Notice role="alert" title="GitHub returned an error.">
          {error.message} Try again in a moment.
        </Notice>
      )
  }
}
