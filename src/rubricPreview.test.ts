import { rubricPreview } from "./rubricPreview"
import { checks } from "./checks"

describe("the rubric preview", () => {
  it("adds up to 100 points", () => {
    const total = rubricPreview.reduce((sum, entry) => sum + entry.weight, 0)
    expect(total).toBe(100)
  })

  it("has no duplicate ids", () => {
    const ids = rubricPreview.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("is sorted heaviest first, which is the order the orbit reads in", () => {
    const weights = rubricPreview.map((entry) => entry.weight)
    expect([...weights].sort((a, b) => b - a)).toEqual(weights)
  })

  it("matches every check that has actually been implemented", () => {
    // Guards the one real risk in keeping a second list: the landing page
    // advertising a rule that scores differently, or is titled differently,
    // from the one the engine runs.
    for (const check of checks) {
      const entry = rubricPreview.find((e) => e.id === check.id)
      expect(entry, `${check.id} is missing from the rubric preview`).toBeDefined()
      expect(entry!.title).toBe(check.title)
      expect(entry!.weight).toBe(check.weight)
    }
  })
})
