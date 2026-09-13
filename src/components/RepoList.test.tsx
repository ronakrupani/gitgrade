import { render, screen } from "@testing-library/react"
import RepoList from "./RepoList"
import { GitHubError } from "../api/errors"
import { makeRepo } from "../test/fixtures"

describe("RepoList", () => {
  it("renders nothing before a search", () => {
    const { container } = render(<RepoList state={{ status: "idle" }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders one card per repo", () => {
    render(
      <RepoList
        state={{
          status: "loaded",
          archivedCount: 0,
          repos: [makeRepo({ name: "one" }), makeRepo({ name: "two" })],
        }}
      />,
    )

    expect(screen.getAllByRole("article")).toHaveLength(2)
  })

  it("says when an account has no public repos", () => {
    render(<RepoList state={{ status: "loaded", archivedCount: 0, repos: [] }} />)

    expect(
      screen.getByText("This account has no public repos."),
    ).toBeInTheDocument()
  })

  it("shows the failure message", () => {
    render(
      <RepoList
        state={{
          status: "error",
          error: new GitHubError("not-found", "Not found on GitHub.", 404),
        }}
      />,
    )

    expect(screen.getByText("Not found on GitHub.")).toBeInTheDocument()
  })
})

describe("RepoList with scores", () => {
  it("matches each score to its card by repo id", () => {
    const one = makeRepo({ name: "one" })
    const two = makeRepo({ name: "two" })
    render(
      <RepoList
        state={{ status: "loaded", archivedCount: 0, repos: [one, two] }}
        scores={{
          status: "scored",
          scores: [
            { repo: two, outcomes: [], earned: 0, possible: 0, score: 100, grade: "A" },
          ],
        }}
      />,
    )
    // Only "two" was scored, so only "two" gets a ring, and "one" is still
    // on the page rather than silently dropped.
    expect(screen.getAllByRole("img", { name: /Score/ })).toHaveLength(1)
    const cards = screen.getAllByRole("article")
    expect(cards).toHaveLength(2)
    const twoCard = cards.find((card) => card.querySelector("h3")?.textContent === "two")!
    expect(twoCard).toContainElement(
      screen.getByRole("img", { name: "Score 100 out of 100, grade A" }),
    )
  })

  it("keeps the cards and reports the problem when scoring fails", () => {
    render(
      <RepoList
        state={{ status: "loaded", archivedCount: 0, repos: [makeRepo({ name: "one" })] }}
        scores={{
          status: "error",
          error: new GitHubError("rate-limited", "Out of requests."),
        }}
      />,
    )
    // The words come from the kind, not the raw message. Rate-limited gets
    // the rate limit explanation whatever the client's message said.
    expect(screen.getByRole("alert")).toHaveTextContent("GitHub's rate limit is used up.")
    expect(screen.getByRole("article")).toHaveTextContent("one")
  })
})

describe("RepoList loading states", () => {
  it("shows skeleton cards and announces loading while the repo list is in flight", () => {
    render(<RepoList state={{ status: "loading" }} />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Loading repos")
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0)
    // Skeletons are not cards. A count of articles must not include them.
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })

  it("keeps the real cards and puts a skeleton where each grade will land while scoring", () => {
    render(
      <RepoList
        state={{ status: "loaded", archivedCount: 0, repos: [makeRepo({ name: "one" })] }}
        scores={{ status: "scoring" }}
      />,
    )
    expect(screen.getByRole("article")).toHaveTextContent("one")
    expect(screen.getByRole("status")).toHaveTextContent("Scoring repos")
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByRole("img", { name: /Score/ })).not.toBeInTheDocument()
  })

  it("shows no skeletons once the scores are in", () => {
    const one = makeRepo({ name: "one" })
    render(
      <RepoList
        state={{ status: "loaded", archivedCount: 0, repos: [one] }}
        scores={{
          status: "scored",
          scores: [{ repo: one, outcomes: [], earned: 0, possible: 0, score: 100, grade: "A" }],
        }}
      />,
    )
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("shows no skeleton before scoring has started", () => {
    render(<RepoList state={{ status: "loaded", archivedCount: 0, repos: [makeRepo()] }} scores={{ status: "idle" }} />)
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0)
  })
})

describe("RepoList error and empty states", () => {
  it("names the username when the account does not exist", () => {
    render(
      <RepoList
        state={{ status: "error", error: new GitHubError("not-found", "Not found on GitHub.", 404) }}
        username="octocatt"
      />,
    )
    expect(screen.getByRole("alert")).toHaveTextContent("No GitHub account called octocatt.")
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })

  it("explains an empty account without a fix, since there is nothing to fix", () => {
    render(<RepoList state={{ status: "loaded", archivedCount: 0, repos: [] }} />)
    const notice = screen.getByRole("status")
    expect(notice).toHaveTextContent("This account has no public repos.")
    expect(notice).toHaveTextContent(/Nothing to grade/)
  })

  it("uses no status colour for errors", () => {
    const { container } = render(
      <RepoList state={{ status: "error", error: new GitHubError("network", "x") }} />,
    )
    expect(container.innerHTML).not.toMatch(/text-fail|bg-fail/)
  })
})

describe("RepoList ordering", () => {
  it("ranks cards worst first once every score is in", () => {
    const good = makeRepo({ name: "good" })
    const bad = makeRepo({ name: "bad" })
    const mid = makeRepo({ name: "mid" })
    const scored = (repo: typeof good, score: number) => ({
      repo, outcomes: [], earned: score, possible: 100, score, grade: "A" as const,
    })
    render(
      <RepoList
        state={{ status: "loaded", archivedCount: 0, repos: [good, bad, mid] }}
        scores={{ status: "scored", scores: [scored(good, 95), scored(bad, 20), scored(mid, 60)] }}
      />,
    )
    const names = screen.getAllByRole("article").map((a) => a.querySelector("h3")!.textContent)
    expect(names).toEqual(["bad", "mid", "good"])
  })

  it("keeps GitHub's order while scores are still loading, so nothing reshuffles under the reader", () => {
    render(
      <RepoList
        state={{
          status: "loaded",
          archivedCount: 0,
          repos: [makeRepo({ name: "first" }), makeRepo({ name: "second" })],
        }}
        scores={{ status: "scoring" }}
      />,
    )
    const names = screen.getAllByRole("article").map((a) => a.querySelector("h3")!.textContent)
    expect(names).toEqual(["first", "second"])
  })
})

describe("RepoList with controls", () => {
  const a = makeRepo({ name: "a-top" })
  const f = makeRepo({ name: "f-bottom", fork: true })
  const scoredState = {
    status: "scored" as const,
    scores: [
      { repo: a, outcomes: [], earned: 95, possible: 100, score: 95, grade: "A" as const },
      { repo: f, outcomes: [], earned: 20, possible: 100, score: 20, grade: "F" as const },
    ],
  }
  const loaded = { status: "loaded" as const, archivedCount: 0, repos: [a, f] }
  const names = () => screen.getAllByRole("article").map((el) => el.querySelector("h3")!.textContent)

  it("flips the order for best first", () => {
    render(<RepoList state={loaded} scores={scoredState} sort="best" />)
    expect(names()).toEqual(["a-top", "f-bottom"])
  })

  it("hides grades that are switched off", () => {
    render(
      <RepoList
        state={loaded}
        scores={scoredState}
        filters={{ grades: new Set(["A"]), hideForks: false }}
      />,
    )
    expect(names()).toEqual(["a-top"])
  })

  it("hides forks when asked", () => {
    render(
      <RepoList
        state={loaded}
        scores={scoredState}
        filters={{ grades: new Set(["A", "B", "C", "D", "F"]), hideForks: true }}
      />,
    )
    expect(names()).toEqual(["a-top"])
  })

  it("says so when the filters hide everything, instead of showing an empty page", () => {
    render(
      <RepoList
        state={loaded}
        scores={scoredState}
        filters={{ grades: new Set(), hideForks: false }}
      />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("No repos match these filters.")
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
