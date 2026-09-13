import { render, screen } from "@testing-library/react"
import AccountSummary from "./AccountSummary"
import { makeRepo } from "../test/fixtures"
import { gradeFor, type RepoScore } from "../scoring"

function scored(name: string, score: number): RepoScore {
  return {
    repo: makeRepo({ name }),
    outcomes: [],
    earned: score,
    possible: 100,
    score,
    grade: gradeFor(score),
  }
}

describe("AccountSummary", () => {
  it("shows the plain mean of the repo scores as the account grade", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90), scored("b", 60)]} />)
    expect(screen.getByRole("img", { name: "Score 75 out of 100, grade B" })).toBeInTheDocument()
  })

  it("names the account", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90)]} />)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("github.com/octocat")
  })

  it("says how many repos went into the average and that the list is worst first", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90), scored("b", 60)]} />)
    expect(screen.getByText(/Average of 2 repos, worst first below\./)).toBeInTheDocument()
  })

  it("uses the singular for one repo", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90)]} />)
    expect(screen.getByText(/Average of 1 repo,/)).toBeInTheDocument()
  })

  it("says how many archived repos were left out", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90)]} archivedCount={2} />)
    expect(screen.getByText(/2 archived repos not counted\./)).toBeInTheDocument()
  })

  it("says nothing about archived repos when there were none", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90)]} />)
    expect(screen.queryByText(/archived/)).not.toBeInTheDocument()
  })

  it("is a landmark a screen reader can jump to", () => {
    render(<AccountSummary username="octocat" scores={[scored("a", 90)]} />)
    expect(screen.getByRole("banner", { name: "Account grade" })).toBeInTheDocument()
  })
})
