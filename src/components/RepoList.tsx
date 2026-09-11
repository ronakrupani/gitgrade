import type { ReposState } from "../hooks/useRepos"
import type { ScoresState } from "../hooks/useScores"
import type { RepoScore } from "../scoring"
import RepoCard from "./RepoCard"

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
}: {
  state: ReposState
  scores?: ScoresState
}) {
  if (state.status === "idle") return null

  if (state.status === "loading") {
    return <p className="text-muted">Loading repos</p>
  }

  if (state.status === "error") {
    return <p className="text-fail">{state.error.message}</p>
  }

  if (state.repos.length === 0) {
    return <p className="text-muted">This account has no public repos.</p>
  }

  const byId = scoresById(scores)

  return (
    <div className="grid gap-3">
      {scores.status === "error" && (
        <p className="text-fail">{scores.error.message}</p>
      )}
      {state.repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} score={byId.get(repo.id)} />
      ))}
    </div>
  )
}
