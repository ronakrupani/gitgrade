import { useEffect, useState } from "react"
import { fetchRepos } from "../api/github"
import { GitHubError } from "../api/errors"
import type { GitHubRepo } from "../api/types"

export type ReposState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: GitHubError }
  | { status: "loaded"; repos: GitHubRepo[] }

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
      .then((repos) => {
        if (current) setState({ status: "loaded", repos })
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
