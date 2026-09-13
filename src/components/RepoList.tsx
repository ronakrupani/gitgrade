import type { ReposState } from "../hooks/useRepos"
import type { ScoresState } from "../hooks/useScores"
import { applyControls, DEFAULT_FILTERS, DEFAULT_SORT, type Filters, type SortKey } from "../listControls"
import type { RepoScore } from "../scoring"
import ErrorState, { Notice } from "./ErrorState"
import RepoCard from "./RepoCard"
import { RepoCardSkeleton } from "./Skeleton"

/**
 * Scores keyed by repo id, or empty while they are still loading. A card
 * that cannot find its score renders without one rather than waiting.
 */
function scoresById(scores: ScoresState): Map<number, RepoScore> {
  if (scores.status !== "scored") return new Map()
  return new Map(scores.scores.map((score) => [score.repo.id, score]))
}

export default function RepoList({
  state,
  scores = { status: "idle" },
  username,
  sort = DEFAULT_SORT,
  filters = DEFAULT_FILTERS,
}: {
  state: ReposState
  scores?: ScoresState
  /** Named in the not-found message, so the typo is visible. */
  username?: string
  sort?: SortKey
  filters?: Filters
}) {
  if (state.status === "idle") return null

  if (state.status === "loading") {
    // Three is enough to read as "a list is coming" without promising a
    // count. The announcement is for screen readers; the boxes are for
    // everyone else.
    return (
      <div role="status" aria-live="polite" className="grid gap-3">
        <p className="sr-only">Loading repos</p>
        <RepoCardSkeleton />
        <RepoCardSkeleton />
        <RepoCardSkeleton />
      </div>
    )
  }

  if (state.status === "error") {
    return <ErrorState error={state.error} username={username} />
  }

  if (state.repos.length === 0) {
    return (
      <Notice title="This account has no public repos.">
        Nothing to grade. Public repos show up here as soon as they exist.
      </Notice>
    )
  }

  const byId = scoresById(scores)

  // Sorted and filtered once every score is in; the defaults give worst
  // first with nothing hidden. Until then the cards keep the order GitHub
  // sent, most recently pushed first, so nothing reshuffles under the
  // reader while the skeletons are still up. A repo that somehow has no
  // score is not dropped; it trails the ranked ones in its original place.
  const ordered =
    scores.status === "scored"
      ? [
          ...applyControls(scores.scores, sort, filters).map((score) => score.repo),
          ...state.repos.filter((repo) => !byId.has(repo.id)),
        ]
      : state.repos

  if (scores.status === "scored" && ordered.length === 0) {
    return (
      <Notice title="No repos match these filters.">
        Turn a grade back on, or show forks, to see them again.
      </Notice>
    )
  }

  return (
    <div className="grid gap-3">
      {scores.status === "error" && (
        <ErrorState error={scores.error} username={username} />
      )}
      {scores.status === "scoring" && (
        <p role="status" aria-live="polite" className="sr-only">
          Scoring repos
        </p>
      )}
      {ordered.map((repo) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          score={byId.get(repo.id)}
          scoring={scores.status === "scoring"}
        />
      ))}
    </div>
  )
}
