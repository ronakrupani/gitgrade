import { renderHook, waitFor } from "@testing-library/react"
import { useScores } from "./useScores"
import { GitHubError } from "../api/errors"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "../checks"

import { recordRateLimit, resetRateLimit } from "../api/rateLimit"

const loadRepoContexts = vi.fn<(repos: unknown[]) => Promise<RepoContext[]>>()
const loadReleaseCounts = vi.fn<(contexts: RepoContext[]) => Promise<RepoContext[]>>()

vi.mock("../repoContext", () => ({
  loadRepoContexts: (repos: unknown[]) => loadRepoContexts(repos),
  loadReleaseCounts: (contexts: RepoContext[]) => loadReleaseCounts(contexts),
}))

/** Headers announcing this much budget left. */
function budget(remaining: number): Headers {
  return new Headers({
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-limit": "60",
    "x-ratelimit-reset": "9999999999",
  })
}

beforeEach(() => {
  loadRepoContexts.mockReset()
  loadReleaseCounts.mockReset()
  // Default: releases resolve to the same contexts, unchanged.
  loadReleaseCounts.mockImplementation((contexts) => Promise.resolve(contexts))
  resetRateLimit()
})

describe("useScores", () => {
  // Every test hands the hook a stable array. The effect keys on the array
  // reference, the same way useRepos keys on the username string, and a
  // caller that built a new array each render would rescan every render.
  // App passes the array straight out of state, which is stable.

  it("is idle when given null", () => {
    const { result } = renderHook(() => useScores(null))
    expect(result.current).toEqual({ status: "idle" })
    expect(loadRepoContexts).not.toHaveBeenCalled()
  })

  it("reports scoring while the contexts load", () => {
    loadRepoContexts.mockReturnValue(new Promise(() => {}))
    const repos = [makeRepo()]
    const { result } = renderHook(() => useScores(repos))
    expect(result.current.status).toBe("scoring")
  })

  it("scores every repo once the contexts arrive", async () => {
    const one = makeRepo({ name: "one", description: "Has one" })
    const two = makeRepo({ name: "two" })
    loadRepoContexts.mockResolvedValue([
      { repo: one, readme: null, rootFiles: [] },
      { repo: two, readme: null, rootFiles: [] },
    ])

    const repos = [one, two]
    const { result } = renderHook(() => useScores(repos))

    await waitFor(() => expect(result.current.status).toBe("scored"))
    if (result.current.status !== "scored") throw new Error("unreachable")

    expect(result.current.scores.map((s) => s.repo.name)).toEqual(["one", "two"])
    // The description check is worth twelve points, and only "one" has it.
    expect(result.current.scores[0].earned).toBeGreaterThan(
      result.current.scores[1].earned,
    )
  })

  it("surfaces a GitHubError as is", async () => {
    loadRepoContexts.mockRejectedValue(
      new GitHubError("rate-limited", "Out of requests."),
    )

    const repos = [makeRepo()]
    const { result } = renderHook(() => useScores(repos))

    await waitFor(() => expect(result.current.status).toBe("error"))
    if (result.current.status !== "error") throw new Error("unreachable")
    expect(result.current.error.kind).toBe("rate-limited")
  })

  it("wraps an unknown failure so the UI always gets a kind to branch on", async () => {
    loadRepoContexts.mockRejectedValue(new TypeError("boom"))

    const repos = [makeRepo()]
    const { result } = renderHook(() => useScores(repos))

    await waitFor(() => expect(result.current.status).toBe("error"))
    if (result.current.status !== "error") throw new Error("unreachable")
    expect(result.current.error).toBeInstanceOf(GitHubError)
    expect(result.current.error.kind).toBe("http")
  })

  it("ignores a slow result that lands after the input has changed", async () => {
    // First scan hangs, second resolves. Only the second may reach state.
    let resolveFirst!: (contexts: RepoContext[]) => void
    const first = makeRepo({ name: "first" })
    const second = makeRepo({ name: "second" })
    loadRepoContexts
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([{ repo: second, readme: null, rootFiles: [] }])

    const { result, rerender } = renderHook(({ repos }) => useScores(repos), {
      initialProps: { repos: [first] },
    })
    rerender({ repos: [second] })

    await waitFor(() => expect(result.current.status).toBe("scored"))
    resolveFirst([{ repo: first, readme: null, rootFiles: [] }])
    await new Promise((r) => setTimeout(r, 0))

    if (result.current.status !== "scored") throw new Error("unreachable")
    expect(result.current.scores.map((s) => s.repo.name)).toEqual(["second"])
  })

  it("returns to idle when the repos go away", async () => {
    loadRepoContexts.mockResolvedValue([])
    const { result, rerender } = renderHook(
      ({ repos }: { repos: ReturnType<typeof makeRepo>[] | null }) =>
        useScores(repos),
      { initialProps: { repos: [makeRepo()] as ReturnType<typeof makeRepo>[] | null } },
    )
    await waitFor(() => expect(result.current.status).toBe("scored"))

    rerender({ repos: null })
    expect(result.current.status).toBe("idle")
  })

  it("scores out of 98 first, then out of 100 once the release counts land", async () => {
    const repo = makeRepo({ name: "one" })
    // A README makes no-placeholder-text apply and package.json makes
    // has-homepage apply, so has-release is the only na check and the
    // denominator reads 98 rather than 90.
    const context: RepoContext = { repo, readme: "# one", rootFiles: ["package.json"] }
    let resolveReleases!: (contexts: RepoContext[]) => void
    loadRepoContexts.mockResolvedValue([context])
    loadReleaseCounts.mockReturnValue(new Promise((resolve) => (resolveReleases = resolve)))

    const repos = [repo]
    const { result } = renderHook(() => useScores(repos))

    await waitFor(() => expect(result.current.status).toBe("scored"))
    if (result.current.status !== "scored") throw new Error("unreachable")
    // has-release is na until the lookup lands, so it is out of the denominator.
    expect(result.current.scores[0].possible).toBe(98)

    resolveReleases([{ ...context, releaseCount: 1 }])
    await waitFor(() => {
      if (result.current.status !== "scored") throw new Error("not scored")
      expect(result.current.scores[0].possible).toBe(100)
    })
  })

  it("does not look up releases when the rate limit cannot spare a request per repo", async () => {
    recordRateLimit(budget(3))
    const repos = [makeRepo(), makeRepo(), makeRepo(), makeRepo()]
    loadRepoContexts.mockResolvedValue(
      repos.map((repo) => ({ repo, readme: "# x", rootFiles: ["package.json"] })),
    )

    const { result } = renderHook(() => useScores(repos))
    await waitFor(() => expect(result.current.status).toBe("scored"))
    await new Promise((r) => setTimeout(r, 0))

    expect(loadReleaseCounts).not.toHaveBeenCalled()
    if (result.current.status !== "scored") throw new Error("unreachable")
    expect(result.current.scores[0].possible).toBe(98)
  })

  it("looks up releases when the budget is comfortable", async () => {
    recordRateLimit(budget(50))
    const repos = [makeRepo()]
    loadRepoContexts.mockResolvedValue([{ repo: repos[0], readme: null, rootFiles: [] }])

    const { result } = renderHook(() => useScores(repos))
    await waitFor(() => expect(result.current.status).toBe("scored"))
    await waitFor(() => expect(loadReleaseCounts).toHaveBeenCalledTimes(1))
  })

  it("keeps the first scores if the release lookup fails", async () => {
    const repo = makeRepo()
    loadRepoContexts.mockResolvedValue([{ repo, readme: null, rootFiles: [] }])
    loadReleaseCounts.mockRejectedValue(new GitHubError("rate-limited", "Out."))

    const repos = [repo]
    const { result } = renderHook(() => useScores(repos))
    await waitFor(() => expect(result.current.status).toBe("scored"))
    await new Promise((r) => setTimeout(r, 0))

    // Still scored, not an error. A lost two point check is not something
    // the reader needs to hear about.
    expect(result.current.status).toBe("scored")
  })

  it("drops a release result that lands after the input has changed", async () => {
    const first = makeRepo({ name: "first" })
    const second = makeRepo({ name: "second" })
    let resolveFirstReleases!: (contexts: RepoContext[]) => void
    loadRepoContexts
      .mockResolvedValueOnce([{ repo: first, readme: null, rootFiles: [] }])
      .mockResolvedValueOnce([{ repo: second, readme: null, rootFiles: [] }])
    loadReleaseCounts
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirstReleases = resolve)))
      .mockImplementationOnce((contexts) => Promise.resolve(contexts))

    const { result, rerender } = renderHook(({ repos }) => useScores(repos), {
      initialProps: { repos: [first] },
    })
    await waitFor(() => expect(result.current.status).toBe("scored"))
    rerender({ repos: [second] })
    await waitFor(() => {
      if (result.current.status !== "scored") throw new Error("not scored")
      expect(result.current.scores[0].repo.name).toBe("second")
    })

    resolveFirstReleases([{ repo: first, readme: null, rootFiles: [], releaseCount: 1 }])
    await new Promise((r) => setTimeout(r, 0))

    if (result.current.status !== "scored") throw new Error("unreachable")
    expect(result.current.scores.map((s) => s.repo.name)).toEqual(["second"])
  })
})
