import { loadReleaseCounts, loadRepoContext, loadRepoContexts } from "./repoContext"
import { makeRepo } from "./test/fixtures"
import type { RepoContext } from "./checks"

function respond(url: string): Response {
  if (url.endsWith("/readme")) {
    return new Response("# Title", { status: 200 })
  }
  if (url.endsWith("/contents/")) {
    return new Response(
      JSON.stringify([
        { name: "README.md", path: "README.md", type: "file" },
        { name: ".gitignore", path: ".gitignore", type: "file" },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }
  return new Response("{}", { status: 404 })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("loadRepoContext", () => {
  it("assembles the repo, its README, and its root listing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(respond(url))),
    )

    const repo = makeRepo({ name: "gitgrade", owner: { login: "octocat" } })
    const context = await loadRepoContext(repo)

    expect(context.repo).toBe(repo)
    expect(context.readme).toBe("# Title")
    expect(context.rootFiles).toEqual(["README.md", ".gitignore"])
  })

  it("leaves releaseCount unset, so nothing spends a request on it yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(respond(url))),
    )

    const context = await loadRepoContext(makeRepo())

    expect(context.releaseCount).toBeUndefined()
  })

  it("reports a repo with no README as null rather than empty text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith("/readme")
            ? new Response("{}", { status: 404 })
            : respond(url),
        ),
      ),
    )

    const context = await loadRepoContext(makeRepo())

    expect(context.readme).toBeNull()
  })

  it("does not swallow a rate limit failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("{}", {
            status: 403,
            headers: { "x-ratelimit-remaining": "0" },
          }),
        ),
      ),
    )

    await expect(loadRepoContext(makeRepo())).rejects.toMatchObject({
      kind: "rate-limited",
    })
  })
})

describe("loadRepoContexts", () => {
  it("returns one context per repo, in the order given", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => Promise.resolve(respond(url))),
    )

    const repos = [
      makeRepo({ name: "one" }),
      makeRepo({ name: "two" }),
      makeRepo({ name: "three" }),
    ]

    const contexts = await loadRepoContexts(repos)

    expect(contexts.map((c) => c.repo.name)).toEqual(["one", "two", "three"])
  })

  it("never has more than the configured number of repos in flight", async () => {
    let inFlight = 0
    let peak = 0

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        inFlight++
        peak = Math.max(peak, inFlight)
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            inFlight--
            resolve(respond(url))
          }, 1)
        })
      }),
    )

    const repos = Array.from({ length: 10 }, (_, i) =>
      makeRepo({ name: `repo-${i}` }),
    )

    await loadRepoContexts(repos, 2)

    // Two repos at a time, two requests each.
    expect(peak).toBeLessThanOrEqual(4)
  })

  it("handles an account with no repos", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect(await loadRepoContexts([])).toEqual([])
  })
})

describe("loadReleaseCounts", () => {
  it("fills in releaseCount for every context, in order, without touching the inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(JSON.stringify(url.includes("/with/") ? [{}] : []), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    )
    const inputs: RepoContext[] = [
      { repo: makeRepo({ name: "with" }), readme: null, rootFiles: [] },
      { repo: makeRepo({ name: "without" }), readme: null, rootFiles: [] },
    ]

    const result = await loadReleaseCounts(inputs)

    expect(result.map((c) => c.releaseCount)).toEqual([1, 0])
    expect(result.map((c) => c.repo.name)).toEqual(["with", "without"])
    expect(inputs[0].releaseCount).toBeUndefined()
  })

  it("makes one request per context, capped by the concurrency", async () => {
    let inFlight = 0
    let peak = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        inFlight++
        peak = Math.max(peak, inFlight)
        await new Promise((r) => setTimeout(r, 5))
        inFlight--
        return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })
      }),
    )
    const inputs = Array.from({ length: 6 }, () => ({ repo: makeRepo(), readme: null, rootFiles: [] }))

    await loadReleaseCounts(inputs, 2)

    expect(peak).toBeLessThanOrEqual(2)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6)
  })
})
