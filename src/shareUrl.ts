/**
 * The username lives in the query string as ?user=octocat, so a result
 * page can be sent to someone. A query parameter rather than a path so
 * the static host needs no rewrite rules, and rather than a hash so it
 * survives being pasted into anything that strips fragments.
 */

const PARAM = "user"

/** The username in a query string, or null if there is none worth using. */
export function readUsername(search: string): string | null {
  const raw = new URLSearchParams(search).get(PARAM)?.trim() ?? ""
  return raw.length > 0 ? raw : null
}

/** The same URL with the username set, or removed when null. */
export function withUsername(href: string, username: string | null): string {
  const url = new URL(href)
  if (username) url.searchParams.set(PARAM, username)
  else url.searchParams.delete(PARAM)
  return url.toString()
}
