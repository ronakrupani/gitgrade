import { render, screen } from "@testing-library/react"
import ScoreRing from "./ScoreRing"
import motionCss from "../styles/motion.css?raw"

/** Class names the orbit on the landing page owns in motion.css. */
function orbitClasses(): Set<string> {
  const orbit = motionCss.slice(0, motionCss.indexOf("Score ring fill"))
  return new Set([...orbit.matchAll(/\.(gg-[a-z-]+)/g)].map((m) => m[1]))
}

describe("ScoreRing", () => {
  it("describes itself to assistive tech in one sentence", () => {
    render(<ScoreRing score={84} grade="B" />)
    expect(
      screen.getByRole("img", { name: "Score 84 out of 100, grade B" }),
    ).toBeInTheDocument()
  })

  it("shows the number in the middle", () => {
    render(<ScoreRing score={84} grade="B" />)
    expect(screen.getByText("84")).toBeInTheDocument()
  })

  it("shows the grade badge beside it", () => {
    render(<ScoreRing score={84} grade="B" />)
    expect(screen.getByLabelText("Grade B")).toBeInTheDocument()
  })

  it("draws the fill as a fraction of the circumference", () => {
    render(<ScoreRing score={25} grade="F" />)
    const fill = screen.getByTestId("score-ring-fill")
    const circumference = Number(fill.getAttribute("stroke-dasharray"))
    const offset = Number(fill.getAttribute("stroke-dashoffset"))
    // A quarter score leaves three quarters of the ring as track.
    expect(offset / circumference).toBeCloseTo(0.75, 5)
  })

  it("draws a full ring at 100", () => {
    render(<ScoreRing score={100} grade="A" />)
    const fill = screen.getByTestId("score-ring-fill")
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 5)
  })

  it("draws no fill at 0", () => {
    render(<ScoreRing score={0} grade="F" />)
    const fill = screen.getByTestId("score-ring-fill")
    const circumference = Number(fill.getAttribute("stroke-dasharray"))
    const offset = Number(fill.getAttribute("stroke-dashoffset"))
    expect(offset).toBeCloseTo(circumference, 5)
  })

  it("clamps a score outside 0 to 100 rather than overdrawing", () => {
    render(<ScoreRing score={140} grade="A" />)
    expect(
      screen.getByRole("img", { name: "Score 100 out of 100, grade A" }),
    ).toBeInTheDocument()
    const fill = screen.getByTestId("score-ring-fill")
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 5)
  })

  it("keeps the ring accent blue at every grade", () => {
    // Section 8b: the ring does not go red at an F or green at an A. The
    // badge carries that meaning so the page keeps a single accent.
    for (const [score, grade] of [
      [98, "A"],
      [12, "F"],
    ] as const) {
      const { unmount } = render(<ScoreRing score={score} grade={grade} />)
      const fill = screen.getByTestId("score-ring-fill")
      expect(fill).toHaveClass("stroke-accent")
      expect(fill.getAttribute("class")).not.toMatch(/pass|fail/)
      unmount()
    }
  })

  it("renders at the size it is given", () => {
    const { container } = render(<ScoreRing score={50} grade="D" size={64} />)
    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("width", "64")
    expect(svg).toHaveAttribute("height", "64")
  })

  it("shares no class name with the orbit on the landing page", () => {
    // jsdom applies no CSS, so a collision like this renders fine in every
    // test and breaks in the browser. The fill circle once used .gg-ring,
    // which the orbit positions with a translate, and it ended up drawn
    // from the corner of the svg and clipped to a quarter arc.
    const { container } = render(<ScoreRing score={63} grade="C" />)
    const owned = orbitClasses()
    expect(owned.has("gg-ring")).toBe(true) // the guard is only useful if this holds

    for (const el of container.querySelectorAll("[class]")) {
      for (const cls of el.classList) {
        expect(owned, `${cls} is an orbit class`).not.toContain(cls)
      }
    }
  })
})
