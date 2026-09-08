import type { GitHubRepo } from "../api/types"

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

export default function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
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
    </article>
  )
}
