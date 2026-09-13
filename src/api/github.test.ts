import { GitHubError } from "./errors"
import {
  fetchRateLimit,
  fetchReadme,
  fetchReleaseCount,
  fetchRepos,
  fetchRootFiles,
} from "./github"

function ok(body: unknown, contentType = "application/json"): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status: 200, headers: { "Content-Type": contentType } },
  )
}

function fail(status: number, headers: Record<string, string> = {}): Response {
  return new Response("{}", { status, headers })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("fetchRepos", () => {
  it("requests the user's repos with the maximum page size", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([{ name: "one" }]))
    vi.stubGlobal("fetch", fetchMock)

    const repos = await fetchRepos("octocat")

    expect(repos).toEqual([{ name: "one" }])
    expect(fetchMock.mock.calls[0][0]).toContain(
      "https://api.github.com/users/octocat/repos",
    )
    expect(fetchMock.mock.calls[0][0]).toContain("per_page=100")
  })

  it("encodes the username", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([]))
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("a b")

    expect(fetchMock.mock.calls[0][0]).toContain("/users/a%20b/repos")
  })

  it("raises not-found for an unknown username", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(404)))

    await expect(fetchRepos("nope")).rejects.toMatchObject({
      kind: "not-found",
    })
  })

  it("raises rate-limited when the remaining counter is zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fail(403, { "x-ratelimit-remaining": "0" })),
    )

    await expect(fetchRepos("octocat")).rejects.toMatchObject({
      kind: "rate-limited",
    })
  })

  it("treats a 403 with budget left as an ordinary http failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fail(403, { "x-ratelimit-remaining": "42" })),
    )

    await expect(fetchRepos("octocat")).rejects.toMatchObject({ kind: "http" })
  })

  it("raises network when the request never reaches GitHub", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")))

    const error = await fetchRepos("octocat").catch((e) => e)
    expect(error).toBeInstanceOf(GitHubError)
    expect(error.kind).toBe("network")
  })
})

describe("fetchReadme", () => {
  it("returns the raw README text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok("# Title", "text/plain"))
    vi.stubGlobal("fetch", fetchMock)

    expect(await fetchReadme("octocat", "hello")).toBe("# Title")
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe(
      "application/vnd.github.raw",
    )
  })

  it("returns null when the repo has no README", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(404)))

    expect(await fetchReadme("octocat", "hello")).toBeNull()
  })

  it("still raises when the failure is not a missing file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fail(403, { "x-ratelimit-remaining": "0" })),
    )

    await expect(fetchReadme("octocat", "hello")).rejects.toMatchObject({
      kind: "rate-limited",
    })
  })
})

describe("fetchRootFiles", () => {
  it("returns just the entry names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ok([
          { name: "README.md", path: "README.md", type: "file" },
          { name: "src", path: "src", type: "dir" },
        ]),
      ),
    )

    expect(await fetchRootFiles("octocat", "hello")).toEqual([
      "README.md",
      "src",
    ])
  })

  it("returns an empty listing for an empty repo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(404)))

    expect(await fetchRootFiles("octocat", "hello")).toEqual([])
  })
})

describe("fetchRateLimit", () => {
  it("reads the core resource and converts the reset to a Date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ok({
          resources: { core: { limit: 60, remaining: 41, reset: 1700000000 } },
        }),
      ),
    )

    const limit = await fetchRateLimit()

    expect(limit.limit).toBe(60)
    expect(limit.remaining).toBe(41)
    expect(limit.reset.getTime()).toBe(1700000000 * 1000)
  })
})

describe("rate limit recording", () => {
  it("records the budget from a failed response too", async () => {
    const { getRateLimit, resetRateLimit } = await import("./rateLimit")
    resetRateLimit()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        fail(403, {
          "x-ratelimit-limit": "60",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1700000000",
        }),
      ),
    )

    await expect(fetchRepos("octocat")).rejects.toMatchObject({
      kind: "rate-limited",
    })
    expect(getRateLimit()?.remaining).toBe(0)
  })
})

describe("fetchReleaseCount", () => {
  it("asks for a single release, since the check only needs to know if there is one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([{ tag_name: "v1.0.0" }]))
    vi.stubGlobal("fetch", fetchMock)

    const count = await fetchReleaseCount("octocat", "example")

    expect(count).toBe(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/octocat/example/releases?per_page=1",
    )
  })

  it("reports zero for a repo with no releases", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok([])))
    expect(await fetchReleaseCount("octocat", "example")).toBe(0)
  })

  it("lets a rate limit refusal through, so the caller can decide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(fail(403, { "x-ratelimit-remaining": "0" })),
    )
    await expect(fetchReleaseCount("octocat", "example")).rejects.toMatchObject({
      kind: "rate-limited",
    })
  })
})

describe("the response cache", () => {
  const REPOS_URL = "https://api.github.com/users/octocat/repos?per_page=100&sort=pushed"

  it("serves a second identical request from cache without touching the network", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([{ name: "one" }]))
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("octocat")
    const again = await fetchRepos("octocat")

    expect(again).toEqual([{ name: "one" }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("goes back to the network once the entry is an hour old", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-13T10:00:00Z"))
    // A fresh Response per call: a body can only be read once.
    const fetchMock = vi.fn(() => Promise.resolve(ok([{ name: "one" }])))
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("octocat")
    vi.setSystemTime(new Date("2026-09-13T11:00:00Z"))
    await fetchRepos("octocat")

    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it("caches a missing README, which is an answer that cost a request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fail(404))
    vi.stubGlobal("fetch", fetchMock)

    expect(await fetchReadme("octocat", "example")).toBeNull()
    expect(await fetchReadme("octocat", "example")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not cache a rate limit refusal or a server error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail(403, { "x-ratelimit-remaining": "0" }))
      .mockResolvedValueOnce(fail(502))
      .mockResolvedValueOnce(ok([]))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchRepos("octocat")).rejects.toMatchObject({ kind: "rate-limited" })
    await expect(fetchRepos("octocat")).rejects.toMatchObject({ kind: "http" })
    expect(await fetchRepos("octocat")).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("serves a stale entry when the rate limit is used up, rather than nothing", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-13T10:00:00Z"))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([{ name: "from-earlier" }]))
      .mockResolvedValueOnce(fail(403, { "x-ratelimit-remaining": "0" }))
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("octocat")
    vi.setSystemTime(new Date("2026-09-13T12:00:00Z"))
    const stale = await fetchRepos("octocat")

    expect(stale).toEqual([{ name: "from-earlier" }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it("serves a stale entry when offline", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-13T10:00:00Z"))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([{ name: "from-earlier" }]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("octocat")
    vi.setSystemTime(new Date("2026-09-13T12:00:00Z"))
    expect(await fetchRepos("octocat")).toEqual([{ name: "from-earlier" }])
    vi.useRealTimers()
  })

  it("still reports a rate limit when there is nothing cached to fall back on", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(403, { "x-ratelimit-remaining": "0" })))
    await expect(fetchRepos("octocat")).rejects.toMatchObject({ kind: "rate-limited" })
  })

  it("does not record rate limit headers on a cache hit", async () => {
    // A cached response says nothing about the budget now. The headers
    // from the original fetch are recorded once; a hit records nothing.
    const { getRateLimit, resetRateLimit } = await import("./rateLimit")
    resetRateLimit()
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-remaining": "42",
          "x-ratelimit-limit": "60",
          "x-ratelimit-reset": "9999999999",
        },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await fetchRepos("octocat")
    expect(getRateLimit()?.remaining).toBe(42)
    resetRateLimit()
    await fetchRepos("octocat")
    expect(getRateLimit()).toBeNull()
  })

  it("never caches the rate limit endpoint, which is free and must be live", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        ok({ resources: { core: { limit: 60, remaining: 10, reset: 1_700_000_000 } } }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await fetchRateLimit()
    await fetchRateLimit()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keys on the full URL, so two users do not share a repo list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok([{ name: "a" }]))
      .mockResolvedValueOnce(ok([{ name: "b" }]))
    vi.stubGlobal("fetch", fetchMock)

    expect(await fetchRepos("alice")).toEqual([{ name: "a" }])
    expect(await fetchRepos("bob")).toEqual([{ name: "b" }])
    expect(localStorage.getItem(`gitgrade:cache:${REPOS_URL}`)).toBeNull()
  })
})
