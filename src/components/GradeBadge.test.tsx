import { render, screen } from "@testing-library/react"
import GradeBadge from "./GradeBadge"
import type { Grade } from "../scoring"

describe("GradeBadge", () => {
  it.each<Grade>(["A", "B", "C", "D", "F"])("renders the letter %s", (grade) => {
    render(<GradeBadge grade={grade} />)
    expect(screen.getByLabelText(`Grade ${grade}`)).toHaveTextContent(grade)
  })

  it("colours A and B as passing", () => {
    render(<GradeBadge grade="A" />)
    expect(screen.getByLabelText("Grade A")).toHaveClass("text-pass")
  })

  it("colours D and F as failing", () => {
    render(<GradeBadge grade="F" />)
    expect(screen.getByLabelText("Grade F")).toHaveClass("text-fail")
  })

  it("keeps C out of both status colours", () => {
    // The middle grade is neither good nor bad news. Painting it green or
    // red would be a claim the number does not support.
    render(<GradeBadge grade="C" />)
    const badge = screen.getByLabelText("Grade C")
    expect(badge).not.toHaveClass("text-pass")
    expect(badge).not.toHaveClass("text-fail")
  })

  it("never uses the accent colour, which belongs to the ring", () => {
    for (const grade of ["A", "B", "C", "D", "F"] as Grade[]) {
      const { unmount } = render(<GradeBadge grade={grade} />)
      expect(screen.getByLabelText(`Grade ${grade}`).className).not.toMatch(
        /accent/,
      )
      unmount()
    }
  })
})
