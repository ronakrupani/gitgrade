import { GitHubError } from "./errors"
import {
  fetchRateLimit,
  fetchReadme,
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
