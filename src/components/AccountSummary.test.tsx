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
    expect(screen.getByRole("region", { name: "Account grade" })).toBeInTheDocument()
  })
})

describe("AccountSummary findings", () => {
  const readme = {
    id: "readme-exists",
    title: "Has a README",
    weight: 15,
    why: "w",
    howToFix: "Add a README.md in the repo root.",
    run: () => "pass" as const,
  }
  const image = { ...readme, id: "readme-has-image", title: "README has an image", weight: 10 }

  function withOutcomes(name: string, score: number, fails: (typeof readme)[], passes: (typeof readme)[]): RepoScore {
    return {
      ...scored(name, score),
      outcomes: [
        ...fails.map((check) => ({ check, result: "fail" as const })),
        ...passes.map((check) => ({ check, result: "pass" as const })),
      ],
    }
  }

  it("names the one fix worth the most, on the worst repo", () => {
    render(
      <AccountSummary
        username="octocat"
        scores={[
          withOutcomes("fine", 90, [image], [readme]),
          withOutcomes("rough", 40, [readme, image], []),
        ]}
      />,
    )
    expect(screen.getByText(/If you fix one thing:/).closest("p")).toHaveTextContent(
      "If you fix one thing: rough, add a README.md in the repo root.",
    )
  })

  it("lists the patterns as fractions of the repos they applied to", () => {
    render(
      <AccountSummary
        username="octocat"
        scores={[
          withOutcomes("a", 50, [image], [readme]),
          withOutcomes("b", 50, [image], [readme]),
          withOutcomes("c", 90, [], [readme, image]),
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "Across the account" })
    expect(list).toHaveTextContent("2 of 3 repos")
    expect(list).toHaveTextContent("fail readme has an image")
    expect(list).toHaveTextContent("-20")
  })

  it("says nothing extra when every check passes everywhere", () => {
    render(<AccountSummary username="octocat" scores={[withOutcomes("a", 100, [], [readme])]} />)
    expect(screen.queryByText(/If you fix one thing/)).not.toBeInTheDocument()
    expect(screen.queryByRole("list", { name: "Across the account" })).not.toBeInTheDocument()
  })

  it("keeps the grade line and the count exactly as before", () => {
    render(<AccountSummary username="octocat" scores={[withOutcomes("a", 40, [readme], [])]} />)
    expect(screen.getByRole("img", { name: "Score 40 out of 100, grade D" })).toBeInTheDocument()
    expect(screen.getByText(/Average of 1 repo, worst first below\./)).toBeInTheDocument()
  })
})
