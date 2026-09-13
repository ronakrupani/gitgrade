import { scoreAccount, type RepoScore } from "../scoring"
import ScoreRing from "./ScoreRing"

/**
 * The account grade, above the ranked list. This is the hero of the
 * results page: one big number for the whole profile, then the queue of
 * what to fix, worst repo first.
 *
 * The mean is plain and the copy says so. Users need to be able to work
 * out where the number came from, and "average of your repo scores" is
 * something anyone can check by hand.
 */
export default function AccountSummary({
  username,
  scores,
  archivedCount = 0,
}: {
  username: string
  scores: RepoScore[]
  archivedCount?: number
}) {
  const account = scoreAccount(scores)
  const count = scores.length

  return (
    <header
      aria-label="Account grade"
      className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface p-6"
    >
      <ScoreRing score={account.score} grade={account.grade} size={128} />

      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-[0.2em] text-muted uppercase">Account grade</p>
        <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">
          <span className="text-muted">github.com/</span>
          {username}
        </h2>
        <p className="mt-2 text-sm text-muted">
          Average of {count} {count === 1 ? "repo" : "repos"}, worst first below.
          {archivedCount > 0 && (
            <>
              {" "}
              {archivedCount} archived {archivedCount === 1 ? "repo" : "repos"} not
              counted.
            </>
          )}
        </p>
      </div>
    </header>
  )
}
