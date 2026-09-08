import { render, screen } from "@testing-library/react"
import OrbitField from "./OrbitField"
import { rubricPreview } from "../rubricPreview"

describe("OrbitField", () => {
  it("puts every rule from the rubric into an orbit", () => {
    const { container } = render(<OrbitField scanning={false} />)

    expect(container.querySelectorAll(".gg-chip")).toHaveLength(
      rubricPreview.length,
    )
  })

  it("is decorative, so it is hidden from assistive tech", () => {
    const { container } = render(<OrbitField scanning={false} />)

    // The same rules are available as real text in the rubric section, so
    // nothing is lost by hiding the animation. Screen readers should not
    // have to sit through thirteen chips to reach the input.
    const field = container.querySelector(".gg-orbit-field")
    expect(field).toHaveAttribute("aria-hidden", "true")

    // Nothing inside it is reachable as a labelled element either.
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })

  it("tightens the orbits while a scan is running", () => {
    const { container, rerender } = render(<OrbitField scanning={false} />)
    expect(container.querySelector(".gg-scanning")).toBeNull()

    rerender(<OrbitField scanning />)
    expect(container.querySelector(".gg-scanning")).not.toBeNull()
  })
})
