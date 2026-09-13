import { useEffect, useState } from "react"
import { GitHubError } from "../api/errors"
import { getRateLimit } from "../api/rateLimit"
import type { GitHubRepo } from "../api/types"
import { loadReleaseCounts, loadRepoContexts } from "../repoContext"
import { scoreRepo, type RepoScore } from "../scoring"

/**
 * Whether the release lookup can run without leaving the next scan short.
 * One request per repo, plus a little headroom, and unknown means go: the
 * first scan of a session has not seen any headers yet.
 */
function canAffordReleases(repoCount: number): boolean {
  const limit = getRateLimit()
  if (!limit) return true
  return limit.remaining >= repoCount + 5
}

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
 * progress.
 *
 * The release check is a second pass. It costs a request per repo for two
 * points, so it runs after the first scores are on screen, and only when
 * the rate limit can spare it. Until it lands the check is na and the
 * score is out of 98; when it lands the scores update in place.
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
      .then(async (contexts) => {
        if (!current) return
        setState({ status: "scored", scores: contexts.map((c) => scoreRepo(c)) })

        if (!canAffordReleases(contexts.length)) return
        // Failing here must not take the scores down with it. The page
        // already has a grade; a lost two point check is not an error the
        // reader needs to hear about.
        try {
          const withReleases = await loadReleaseCounts(contexts)
          if (current) {
            setState({ status: "scored", scores: withReleases.map((c) => scoreRepo(c)) })
          }
        } catch {
          /* keep the first pass */
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
