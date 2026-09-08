import type { ReposState } from "../hooks/useRepos"
import RepoCard from "./RepoCard"

export default function RepoList({ state }: { state: ReposState }) {
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

  return (
    <div className="grid gap-3">
      {state.repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  )
}
