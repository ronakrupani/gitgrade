import { GitHubError } from "./errors"
import { recordRateLimit } from "./rateLimit"
import type { GitHubContentEntry, GitHubRepo, RateLimit } from "./types"

const API_BASE = "https://api.github.com"

/** Repos per page. 100 is the maximum GitHub allows. */
const PER_PAGE = 100

function headers(accept: string): HeadersInit {
  return {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  }
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

async function request(url: string, accept: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { headers: headers(accept) })
  } catch {
    throw new GitHubError(
      "network",
      "Could not reach GitHub. Check your connection.",
      undefined,
    )
  }

  // Record before branching: the headers on a failure are the ones that
  // say how long the wait is.
  recordRateLimit(response.headers)

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
  throw new GitHubError(
    "http",
    `GitHub returned ${response.status}.`,
    response.status,
  )
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await request(url, "application/vnd.github+json")
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

/** The current budget. This endpoint does not spend any of it. */
export async function fetchRateLimit(): Promise<RateLimit> {
  const body = await requestJson<{
    resources: { core: { limit: number; remaining: number; reset: number } }
  }>(`${API_BASE}/rate_limit`)
  const core = body.resources.core
  return {
    limit: core.limit,
    remaining: core.remaining,
    reset: new Date(core.reset * 1000),
  }
}
