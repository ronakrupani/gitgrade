import { render, screen } from "@testing-library/react"
import RepoCard from "./RepoCard"
import { makeRepo } from "../test/fixtures"

describe("RepoCard", () => {
  it("links the repo name to GitHub", () => {
    render(<RepoCard repo={makeRepo({ name: "gitgrade" })} />)

    expect(screen.getByRole("link", { name: "gitgrade" })).toHaveAttribute(
      "href",
      "https://github.com/octocat/example",
    )
  })

  it("shows the description when there is one", () => {
    render(<RepoCard repo={makeRepo({ description: "Grades profiles" })} />)

    expect(screen.getByText("Grades profiles")).toBeInTheDocument()
  })

  it("says so when the description is missing", () => {
    render(<RepoCard repo={makeRepo({ description: null })} />)

    expect(screen.getByText("No description")).toBeInTheDocument()
  })

  it("lists the topics", () => {
    render(<RepoCard repo={makeRepo({ topics: ["react", "typescript"] })} />)

    expect(screen.getByText("react")).toBeInTheDocument()
    expect(screen.getByText("typescript")).toBeInTheDocument()
  })

  it("handles a repo that has never been pushed to", () => {
    render(<RepoCard repo={makeRepo({ pushed_at: null })} />)

    expect(screen.getByText("never pushed")).toBeInTheDocument()
  })
})

describe("RepoCard with a score", () => {
  it("renders without a ring or report card until it has a score", () => {
    render(<RepoCard repo={makeRepo()} />)
    expect(screen.queryByRole("img", { name: /Score/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("To fix")).not.toBeInTheDocument()
  })

  it("shows the ring and the report card once scored", () => {
    const repo = makeRepo({ name: "gitgrade" })
    render(
      <RepoCard
        repo={repo}
        score={{
          repo,
          outcomes: [
            {
              check: {
                id: "has-description",
                title: "Has a description",
                weight: 12,
                why: "w",
                howToFix: "h",
                run: () => "fail",
              },
              result: "fail",
            },
          ],
          earned: 0,
          possible: 12,
          score: 0,
          grade: "F",
        }}
      />,
    )
    expect(
      screen.getByRole("img", { name: "Score 0 out of 100, grade F" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("To fix")).toHaveTextContent("Has a description")
  })
})
