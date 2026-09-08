export type GitHubErrorKind =
  /** The username or repo does not exist. */
  | "not-found"
  /** Out of requests for this window. Recoverable by waiting. */
  | "rate-limited"
  /** The request never reached GitHub. */
  | "network"
  /** Any other non-2xx response. */
  | "http"

/**
 * Every failure the client can produce, narrowed to a kind the UI can
 * branch on. The UI needs to tell "no such user" apart from "come back in
 * forty minutes", and those are both 4xx responses.
 */
export class GitHubError extends Error {
  readonly kind: GitHubErrorKind
  readonly status?: number

  constructor(kind: GitHubErrorKind, message: string, status?: number) {
    super(message)
    this.name = "GitHubError"
    this.kind = kind
    this.status = status
  }
}
