import { useEffect, useState } from "react"
import { fetchRepos } from "../api/github"
import { GitHubError } from "../api/errors"
import type { GitHubRepo } from "../api/types"

export type ReposState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: GitHubError }
  | {
      status: "loaded"
      /** Public repos that are not archived, in the order GitHub sent them. */
      repos: GitHubRepo[]
      /** How many were dropped for being archived, so the UI can say so. */
      archivedCount: number
    }

/**
 * Fetches the public repos for a username. Passing null leaves the hook
 * idle, which is the state before the first search.
 */
export function useRepos(username: string | null): ReposState {
  const [state, setState] = useState<ReposState>({ status: "idle" })

  useEffect(() => {
    if (username === null) {
      setState({ status: "idle" })
      return
    }

    // Guards against a slow first response landing after a second search.
    let current = true
    setState({ status: "loading" })

    fetchRepos(username)
      .then((all) => {
        if (!current) return
        // Archived repos are excluded entirely: not shown, not scored, not
        // in the account average. Archiving is the owner saying "this is
        // done", and grading it would either reward or punish a decision
        // that was already made deliberately. Product call, recorded in
        // the spec's section 12 answers.
        const repos = all.filter((repo) => !repo.archived)
        setState({ status: "loaded", repos, archivedCount: all.length - repos.length })
      })
      .catch((error: unknown) => {
        if (!current) return
        setState({
          status: "error",
          error:
            error instanceof GitHubError
              ? error
              : new GitHubError("http", "Something went wrong."),
        })
      })

    return () => {
      current = false
    }
  }, [username])

  return state
}
