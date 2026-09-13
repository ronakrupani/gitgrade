import {
  ALL_GRADES,
  applyControls,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type Filters,
} from "./listControls"
import { gradeFor, rankWorstFirst, type RepoScore } from "./scoring"
import { makeRepo } from "./test/fixtures"

function scored(
  name: string,
  score: number,
  extra: Partial<Parameters<typeof makeRepo>[0]> = {},
): RepoScore {
  return {
    repo: makeRepo({ name, ...extra }),
    outcomes: [],
    earned: score,
    possible: 100,
    score,
    grade: gradeFor(score),
  }
}

const names = (scores: RepoScore[]) => scores.map((s) => s.repo.name)

describe("applyControls", () => {
  const scores = [
    scored("a-best", 95, { pushed_at: "2025-01-01T00:00:00Z" }),
    scored("b-worst", 30, { pushed_at: "2026-06-01T00:00:00Z", fork: true }),
    scored("c-mid", 70, { pushed_at: "2026-01-01T00:00:00Z" }),
    scored("d-never", 50, { pushed_at: null }),
  ]

  it("reproduces the plain account view with the defaults", () => {
    expect(applyControls(scores, DEFAULT_SORT, DEFAULT_FILTERS)).toEqual(
      rankWorstFirst(scores),
    )
  })

  it("sorts worst first", () => {
    expect(names(applyControls(scores, "worst", DEFAULT_FILTERS))).toEqual([
      "b-worst",
      "d-never",
      "c-mid",
      "a-best",
    ])
  })

  it("sorts best first as the exact reverse", () => {
    expect(names(applyControls(scores, "best", DEFAULT_FILTERS))).toEqual([
      "a-best",
      "c-mid",
      "d-never",
      "b-worst",
    ])
  })

  it("sorts by most recent push, with never pushed last", () => {
    expect(names(applyControls(scores, "pushed", DEFAULT_FILTERS))).toEqual([
      "b-worst",
      "c-mid",
      "a-best",
      "d-never",
    ])
  })

  it("sorts by name", () => {
    expect(names(applyControls(scores, "name", DEFAULT_FILTERS))).toEqual([
      "a-best",
      "b-worst",
      "c-mid",
      "d-never",
    ])
  })

  it("keeps only the selected grades", () => {
    const filters: Filters = { grades: new Set(["A", "F"]), hideForks: false }
    expect(names(applyControls(scores, "worst", filters))).toEqual(["b-worst", "a-best"])
  })

  it("hides forks when asked", () => {
    const filters: Filters = { grades: new Set(ALL_GRADES), hideForks: true }
    expect(names(applyControls(scores, "worst", filters))).not.toContain("b-worst")
    expect(applyControls(scores, "worst", filters)).toHaveLength(3)
  })

  it("can filter everything out", () => {
    const filters: Filters = { grades: new Set(), hideForks: false }
    expect(applyControls(scores, "worst", filters)).toEqual([])
  })

  it("does not mutate the input", () => {
    const before = names(scores)
    applyControls(scores, "best", DEFAULT_FILTERS)
    applyControls(scores, "name", DEFAULT_FILTERS)
    expect(names(scores)).toEqual(before)
  })
})
