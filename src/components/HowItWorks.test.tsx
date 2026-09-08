import { render, screen } from "@testing-library/react"
import HowItWorks from "./HowItWorks"
import { rubricPreview } from "../rubricPreview"

describe("HowItWorks", () => {
  it("lists every rule with its weight", () => {
    render(<HowItWorks />)

    for (const entry of rubricPreview) {
      expect(screen.getByText(entry.title)).toBeInTheDocument()
    }
  })

  it("shows the content when IntersectionObserver is unavailable", () => {
    // The reveal animation must never be the reason content is invisible.
    render(<HowItWorks />)

    for (const section of document.querySelectorAll(".gg-reveal")) {
      expect(section.getAttribute("data-visible")).toBe("true")
    }
  })

  it("explains the na denominator, which is the least obvious rule", () => {
    render(<HowItWorks />)

    expect(
      screen.getByText(/dropped from the denominator/),
    ).toBeInTheDocument()
  })
})
