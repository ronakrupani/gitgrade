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
