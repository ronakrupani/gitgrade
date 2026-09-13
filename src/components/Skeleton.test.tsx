import { render, screen } from "@testing-library/react"
import Skeleton, { RepoCardSkeleton, ReportSkeleton, RingSkeleton } from "./Skeleton"

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    render(<Skeleton />)
    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true")
  })

  it("carries the animation class so reduced motion can switch it off", () => {
    render(<Skeleton />)
    expect(screen.getByTestId("skeleton")).toHaveClass("gg-skeleton")
  })

  it("uses only the surface token for colour, never a status colour", () => {
    render(
      <>
        <RepoCardSkeleton />
        <RingSkeleton />
        <ReportSkeleton />
      </>,
    )
    for (const el of screen.getAllByTestId("skeleton")) {
      expect(el.className).not.toMatch(/pass|fail|accent/)
    }
  })

  it("exposes nothing readable: no text, no roles", () => {
    const { container } = render(<RepoCardSkeleton />)
    expect(container).toHaveTextContent("")
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
