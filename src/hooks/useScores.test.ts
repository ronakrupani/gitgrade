import { renderHook, waitFor } from "@testing-library/react"
import { useScores } from "./useScores"
import { GitHubError } from "../api/errors"
import { makeRepo } from "../test/fixtures"
import type { RepoContext } from "../checks"

const loadRepoContexts = vi.fn<(repos: unknown[]) => Promise<RepoContext[]>>()

vi.mock("../repoContext", () => ({
  loadRepoContexts: (repos: unknown[]) => loadRepoContexts(repos),
}))

beforeEach(() => {
  loadRepoContexts.mockReset()
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
})
