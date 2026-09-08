import { fetchReadme, fetchRootFiles } from "./api/github"
import type { GitHubRepo } from "./api/types"
import type { RepoContext } from "./checks"

/**
 * Repos fetched at once. Two requests per repo, so this is a burst as much
 * as a throughput setting: GitHub applies a secondary limit to concurrent
 * requests on top of the hourly budget, and a 20 repo account firing 40
 * requests at once can trip it.
 */
const CONCURRENCY = 4

/** The README and root listing for one repo, ready for the checks. */
export async function loadRepoContext(repo: GitHubRepo): Promise<RepoContext> {
  const [readme, rootFiles] = await Promise.all([
    fetchReadme(repo.owner.login, repo.name),
    fetchRootFiles(repo.owner.login, repo.name),
  ])

  // releaseCount is left undefined here. It costs a request per repo and is
  // worth two points, so item 30 loads it lazily.
  return { repo, readme, rootFiles }
}

/**
 * Contexts for a list of repos, in the same order, a few at a time.
 *
 * Failures are not swallowed. A repo whose README could not be read is not
 * a repo with no README, and scoring it as though it were would report a
 * fix the user does not need.
 */
export async function loadRepoContexts(
  repos: GitHubRepo[],
  concurrency: number = CONCURRENCY,
): Promise<RepoContext[]> {
  const contexts: RepoContext[] = new Array(repos.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < repos.length) {
      const index = next++
      contexts[index] = await loadRepoContext(repos[index])
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, repos.length) },
    worker,
  )
  await Promise.all(workers)

  return contexts
}
