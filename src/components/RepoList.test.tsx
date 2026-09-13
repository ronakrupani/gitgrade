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
          repos: [makeRepo({ name: "one" }), makeRepo({ name: "two" })],
        }}
      />,
    )

    expect(screen.getAllByRole("article")).toHaveLength(2)
  })

  it("says when an account has no public repos", () => {
    render(<RepoList state={{ status: "loaded", repos: [] }} />)

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
        state={{ status: "loaded", repos: [one, two] }}
        scores={{
          status: "scored",
          scores: [
            { repo: two, outcomes: [], earned: 0, possible: 0, score: 100, grade: "A" },
          ],
        }}
      />,
    )
    // Only "two" was scored, so only "two" gets a ring.
    expect(screen.getAllByRole("img", { name: /Score/ })).toHaveLength(1)
    const cards = screen.getAllByRole("article")
    expect(cards[1]).toHaveTextContent("two")
    expect(cards[1]).toContainElement(
      screen.getByRole("img", { name: "Score 100 out of 100, grade A" }),
    )
  })

  it("keeps the cards and reports the problem when scoring fails", () => {
    render(
      <RepoList
        state={{ status: "loaded", repos: [makeRepo({ name: "one" })] }}
        scores={{
          status: "error",
          error: new GitHubError("rate-limited", "Out of requests."),
        }}
      />,
    )
    expect(screen.getByText("Out of requests.")).toBeInTheDocument()
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
        state={{ status: "loaded", repos: [makeRepo({ name: "one" })] }}
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
        state={{ status: "loaded", repos: [one] }}
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
    render(<RepoList state={{ status: "loaded", repos: [makeRepo()] }} scores={{ status: "idle" }} />)
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0)
  })
})
