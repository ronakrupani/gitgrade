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
