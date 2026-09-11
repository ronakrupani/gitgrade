import { useEffect, useState } from "react"
import { GitHubError } from "../api/errors"
import type { GitHubRepo } from "../api/types"
import { loadRepoContexts } from "../repoContext"
import { scoreRepo, type RepoScore } from "../scoring"

export type ScoresState =
  | { status: "idle" }
  | { status: "scoring" }
  | { status: "error"; error: GitHubError }
  | { status: "scored"; scores: RepoScore[] }

/**
 * Loads the README and root listing for every repo, then scores them.
 * Passing null leaves the hook idle, which is the state before the repo
 * list has arrived.
 *
 * The effect keys on the array reference, the same way useRepos keys on
 * the username. Pass the array straight out of state; a caller that
 * filtered or mapped it on every render would rescan on every render.
 *
 * Scores come back all at once rather than one card at a time. Two
 * requests per repo go out a few at a time either way, and a list where
 * cards flip from blank to graded in fetch order reads as jitter, not
 * progress. Item 26 puts a skeleton in the gap.
 */
export function useScores(repos: GitHubRepo[] | null): ScoresState {
  const [state, setState] = useState<ScoresState>({ status: "idle" })

  useEffect(() => {
    if (repos === null) {
      setState({ status: "idle" })
      return
    }

    // Same guard as useRepos: a slow scan for one account must not land
    // on top of the results for the next.
    let current = true
    setState({ status: "scoring" })

    loadRepoContexts(repos)
      .then((contexts) => {
        if (current) {
          setState({ status: "scored", scores: contexts.map((c) => scoreRepo(c)) })
        }
      })
      .catch((error: unknown) => {
        if (!current) return
        setState({
          status: "error",
          error:
            error instanceof GitHubError
              ? error
              : new GitHubError("http", "Something went wrong while scoring."),
        })
      })

    return () => {
      current = false
    }
  }, [repos])

  return state
}
