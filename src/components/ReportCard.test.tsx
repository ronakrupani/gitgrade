import { render, screen, within } from "@testing-library/react"
import ReportCard from "./ReportCard"
import { makeRepo } from "../test/fixtures"
import type { Check } from "../checks"
import type { CheckOutcome, RepoScore } from "../scoring"

function check(id: string, weight: number, title = id): Check {
  return { id, title, weight, why: "w", howToFix: "h", run: () => "pass" }
}

function score(outcomes: CheckOutcome[]): RepoScore {
  return {
    repo: makeRepo(),
    outcomes,
    earned: 0,
    possible: 0,
    score: 0,
    grade: "F",
  }
}

describe("ReportCard", () => {
  it("lists the failures under To fix, heaviest first", () => {
    render(
      <ReportCard
        score={score([
          { check: check("topics", 6, "Has topics"), result: "fail" },
          { check: check("readme", 15, "Has a README"), result: "fail" },
        ])}
      />,
    )
    const rows = within(screen.getByLabelText("To fix")).getAllByRole("listitem")
    expect(rows[0]).toHaveTextContent("Has a README")
    expect(rows[1]).toHaveTextContent("Has topics")
  })

  it("shows the points lost on each failure", () => {
    render(
      <ReportCard
        score={score([{ check: check("readme", 15, "Has a README"), result: "fail" }])}
      />,
    )
    expect(screen.getByText("-15")).toHaveClass("text-fail")
  })

  it("lists passing checks under Passing with their points", () => {
    render(
      <ReportCard
        score={score([{ check: check("desc", 12, "Has a description"), result: "pass" }])}
      />,
    )
    const section = screen.getByLabelText("Passing")
    expect(within(section).getByText("Has a description")).toBeInTheDocument()
    expect(within(section).getByText("+12")).toHaveClass("text-pass")
  })

  it("lists not-applicable checks last and without points", () => {
    render(
      <ReportCard
        score={score([
          { check: check("home", 5, "Live link for a web project"), result: "na" },
          { check: check("readme", 15, "Has a README"), result: "fail" },
        ])}
      />,
    )
    const section = screen.getByLabelText("Not applicable")
    expect(within(section).getByText("Live link for a web project")).toBeInTheDocument()
    expect(within(section).getByText("n/a")).toBeInTheDocument()
    // Order in the document: To fix, then Not applicable.
    const labels = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))
    expect(labels).toEqual(["To fix", "Not applicable"])
  })

  it("omits any section that would be empty", () => {
    render(
      <ReportCard
        score={score([{ check: check("readme", 15, "Has a README"), result: "pass" }])}
      />,
    )
    expect(screen.queryByLabelText("To fix")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Not applicable")).not.toBeInTheDocument()
  })

  it("says so when nothing failed, without being smug about it", () => {
    render(
      <ReportCard
        score={score([{ check: check("readme", 15, "Has a README"), result: "pass" }])}
      />,
    )
    expect(screen.getByText("Every applicable check passed.")).toBeInTheDocument()
  })
})
