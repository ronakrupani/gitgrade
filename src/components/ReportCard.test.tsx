import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

describe("ReportCard expandable rows", () => {
  const failed: RepoScore = score([
    {
      check: {
        id: "has-description",
        title: "Has a description",
        weight: 12,
        why: "It is the only text shown in search results.",
        howToFix: "Add a one line description in the About panel.",
        run: () => "fail",
      },
      result: "fail",
    },
  ])

  it("keeps the detail closed until the row is clicked", () => {
    render(<ReportCard score={failed} />)
    const row = screen.getByRole("button", { name: /Has a description/ })
    expect(row).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(/only text shown/)).not.toBeInTheDocument()
  })

  it("opens to show why the rule matters and how to fix it", async () => {
    render(<ReportCard score={failed} />)
    const row = screen.getByRole("button", { name: /Has a description/ })
    await userEvent.click(row)

    expect(row).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("It is the only text shown in search results.")).toBeInTheDocument()
    expect(screen.getByText("Add a one line description in the About panel.")).toBeInTheDocument()
  })

  it("closes again on a second click", async () => {
    render(<ReportCard score={failed} />)
    const row = screen.getByRole("button", { name: /Has a description/ })
    await userEvent.click(row)
    await userEvent.click(row)
    expect(row).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(/only text shown/)).not.toBeInTheDocument()
  })

  it("links the button to the panel it controls", async () => {
    render(<ReportCard score={failed} />)
    const row = screen.getByRole("button", { name: /Has a description/ })
    await userEvent.click(row)
    const panelId = row.getAttribute("aria-controls")
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId!)).toHaveTextContent(/only text shown/)
  })

  it("shows why but no fix on a passing row", async () => {
    render(
      <ReportCard
        score={score([
          {
            check: {
              ...failed.outcomes[0].check,
              why: "Topics are how people find you.",
              howToFix: "Add three topics.",
            },
            result: "pass",
          },
        ])}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Has a description/ }))
    expect(screen.getByText("Topics are how people find you.")).toBeInTheDocument()
    expect(screen.queryByText("Add three topics.")).not.toBeInTheDocument()
    expect(screen.queryByText(/^Fix:/)).not.toBeInTheDocument()
  })

  it("explains a not-applicable row instead of offering a fix", async () => {
    render(
      <ReportCard
        score={score([
          { check: { ...failed.outcomes[0].check, howToFix: "Deploy it." }, result: "na" },
        ])}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Has a description/ }))
    expect(screen.getByText(/Does not apply to this repo/)).toBeInTheDocument()
    expect(screen.queryByText("Deploy it.")).not.toBeInTheDocument()
  })

  it("opens rows independently", async () => {
    render(
      <ReportCard
        score={score([
          { check: check("a", 10, "Alpha"), result: "fail" },
          { check: check("b", 8, "Beta"), result: "fail" },
        ])}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /Alpha/ }))
    expect(screen.getByRole("button", { name: /Alpha/ })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: /Beta/ })).toHaveAttribute("aria-expanded", "false")
  })
})
