/** The subset of the GitHub REST responses GitGrade actually reads. */

export interface GitHubLicense {
  key: string
  name: string
  spdx_id: string | null
}

/** From GET /users/:user/repos */
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  html_url: string
  description: string | null
  fork: boolean
  archived: boolean
  homepage: string | null
  topics: string[]
  license: GitHubLicense | null
  stargazers_count: number
  pushed_at: string | null
  created_at: string
  default_branch: string
}

/** One entry from GET /repos/:owner/:repo/contents/ */
export interface GitHubContentEntry {
  name: string
  path: string
  type: "file" | "dir" | "symlink" | "submodule"
}

/** From GET /rate_limit, which does not itself consume budget. */
export interface RateLimit {
  /** Requests left in the current window. */
  remaining: number
  /** Ceiling for the window: 60 unauthenticated, 5000 with a token. */
  limit: number
  /** When the window resets, as a Date. */
  reset: Date
}
