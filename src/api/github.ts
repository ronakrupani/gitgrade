import { isFresh, readCache, writeCache, type CacheEntry } from "./cache"
import { GitHubError } from "./errors"
import { recordRateLimit } from "./rateLimit"
import { getToken } from "./token"
import type { GitHubContentEntry, GitHubRepo, RateLimit } from "./types"

const API_BASE = "https://api.github.com"

/** Repos per page. 100 is the maximum GitHub allows. */
const PER_PAGE = 100

function headers(accept: string): HeadersInit {
  const base: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  }
  // The visitor's own token, from their own localStorage. It raises the
  // limit from 60 an hour to 5000. It goes to api.github.com and nowhere
  // else; fetchOrCached refuses any other host.
  const token = getToken()
  if (token) base.Authorization = `Bearer ${token}`
  return base
}

/**
 * A 403 or 429 from GitHub is a rate limit refusal when the remaining
 * counter has hit zero. A 403 with budget left is something else, most
 * often a blocked or suspended account, so it is not reported as a limit.
 */
function isRateLimited(response: Response): boolean {
  if (response.status !== 403 && response.status !== 429) return false
  return response.headers.get("x-ratelimit-remaining") === "0"
}

/** A Response rebuilt from the cache. Carries no rate limit headers on purpose. */
function fromCache(entry: CacheEntry): Response {
  return new Response(entry.body, {
    status: entry.status,
    headers: entry.contentType ? { "Content-Type": entry.contentType } : {},
  })
}

/** Whether a response is worth keeping: a real answer, including "no such README". */
function cacheable(response: Response): boolean {
  return response.ok || response.status === 404
}

/** The response for a URL: from cache when fresh, from GitHub otherwise. */
async function fetchOrCached(
  url: string,
  accept: string,
  useCache: boolean,
): Promise<Response> {
  // Belt and braces. Every URL in this file is built from API_BASE, so
  // this cannot fire today; it is here so that if someone adds a call to
  // another host, the token does not go with it.
  if (!url.startsWith(`${API_BASE}/`)) {
    throw new Error(`Refusing to send a request outside ${API_BASE}: ${url}`)
  }

  const cached = useCache ? readCache(url) : null
  if (cached && isFresh(cached)) return fromCache(cached)

  let response: Response
  try {
    response = await fetch(url, { headers: headers(accept) })
  } catch {
    // Offline. A stale answer beats no answer: the repo list from an hour
    // ago is still the repo list.
    if (cached) return fromCache(cached)
    throw new GitHubError(
      "network",
      "Could not reach GitHub. Check your connection.",
      undefined,
    )
  }

  // Record before branching: the headers on a failure are the ones that
  // say how long the wait is.
  recordRateLimit(response.headers)

  if (isRateLimited(response) && cached) {
    // Out of budget. Serve what we have and say nothing; the status in
    // the header already shows the limit is used up.
    return fromCache(cached)
  }

  if (useCache && cacheable(response)) {
    const body = await response.text()
    const entry: CacheEntry = {
      status: response.status,
      contentType: response.headers.get("Content-Type"),
      body,
      storedAt: Date.now(),
    }
    writeCache(url, entry)
    // The body has been read, so hand back a fresh Response with the
    // original headers rather than the drained one.
    return new Response(body, { status: response.status, headers: response.headers })
  }

  return response
}

async function request(
  url: string,
  accept: string,
  useCache = true,
): Promise<Response> {
  const response = await fetchOrCached(url, accept, useCache)

  if (response.ok) return response

  if (isRateLimited(response)) {
    throw new GitHubError(
      "rate-limited",
      "GitHub's rate limit is used up.",
      response.status,
    )
  }
  if (response.status === 404) {
    throw new GitHubError("not-found", "Not found on GitHub.", 404)
  }
  if (response.status === 401) {
    // Only a bad token produces this. Public data needs no credentials.
    throw new GitHubError("http", "GitHub rejected the token. Check it, or clear it.", 401)
  }
  throw new GitHubError(
    "http",
    `GitHub returned ${response.status}.`,
    response.status,
  )
}

async function requestJson<T>(url: string, useCache = true): Promise<T> {
  const response = await request(url, "application/vnd.github+json", useCache)
  return (await response.json()) as T
}

/** Every public repo on an account. */
export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const url = `${API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=${PER_PAGE}&sort=pushed`
  return requestJson<GitHubRepo[]>(url)
}

/**
 * The raw README text, or null when the repo has no README. A missing
 * README is a normal result here, not an error: it is the single most
 * common thing GitGrade reports.
 */
export async function fetchReadme(
  owner: string,
  repo: string,
): Promise<string | null> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`
  try {
    const response = await request(url, "application/vnd.github.raw")
    return await response.text()
  } catch (error) {
    if (error instanceof GitHubError && error.kind === "not-found") return null
    throw error
  }
}

/**
 * File and directory names in the repo root. An empty repo 404s here, which
 * is an empty listing rather than a failure.
 */
export async function fetchRootFiles(
  owner: string,
  repo: string,
): Promise<string[]> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`
  try {
    const entries = await requestJson<GitHubContentEntry[]>(url)
    return entries.map((entry) => entry.name)
  } catch (error) {
    if (error instanceof GitHubError && error.kind === "not-found") return []
    throw error
  }
}

/**
 * Whether the repo has any releases, as a count of 0 or 1. The check only
 * asks "at least one", so the request fetches a single release rather than
 * paging through all of them, and the number reported is the number seen.
 */
export async function fetchReleaseCount(
  owner: string,
  repo: string,
): Promise<number> {
  const url = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=1`
  const releases = await requestJson<unknown[]>(url)
  return releases.length
}

/** The current budget. This endpoint does not spend any of it. */
export async function fetchRateLimit(): Promise<RateLimit> {
  const body = await requestJson<{
    resources: { core: { limit: number; remaining: number; reset: number } }
  }>(`${API_BASE}/rate_limit`, false)
  const core = body.resources.core
  return {
    limit: core.limit,
    remaining: core.remaining,
    reset: new Date(core.reset * 1000),
  }
}
