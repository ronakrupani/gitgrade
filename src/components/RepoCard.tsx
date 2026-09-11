import type { GitHubRepo } from "../api/types"
import type { RepoScore } from "../scoring"
import ReportCard from "./ReportCard"
import ScoreRing from "./ScoreRing"

/** Formats a timestamp as "Mar 2025". Null pushed_at means never pushed. */
function formatPushed(pushedAt: string | null): string {
  if (!pushedAt) return "never pushed"
  const date = new Date(pushedAt)
  if (Number.isNaN(date.getTime())) return "never pushed"
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })
}

/**
 * One repo. The score is optional because the repo list arrives one
 * request ahead of the READMEs and root listings that scoring needs, and
 * a card with no grade yet is still worth showing.
 */
export default function RepoCard({
  repo,
  score,
}: {
  repo: GitHubRepo
  score?: RepoScore
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {repo.name}
              </a>
            </h3>
            <span className="tabular shrink-0 text-xs text-muted">
              {formatPushed(repo.pushed_at)}
            </span>
          </div>

          {repo.description ? (
            <p className="mt-2 text-sm text-muted">{repo.description}</p>
          ) : (
            <p className="mt-2 text-sm text-muted italic">No description</p>
          )}

          {repo.topics.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {repo.topics.map((topic) => (
                <li
                  key={topic}
                  className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs text-muted"
                >
                  {topic}
                </li>
              ))}
            </ul>
          )}
        </div>

        {score && (
          <div className="shrink-0">
            <ScoreRing score={score.score} grade={score.grade} size={72} />
          </div>
        )}
      </div>

      {score && (
        <div className="mt-4 border-t border-border pt-4">
          <ReportCard score={score} />
        </div>
      )}
    </article>
  )
}
