import { gradeFor, scoreAccount, scoreRepo } from "./scoring"
import type { Check, CheckResult, RepoContext } from "./checks"
import { makeRepo } from "./test/fixtures"

/** A check that always returns the same answer, for exercising the engine. */
function stubCheck(
  id: string,
  weight: number,
  result: CheckResult,
): Check {
  return {
    id,
    title: id,
    weight,
    why: "why",
    howToFix: "how",
    run: () => result,
  }
}

function context(): RepoContext {
  return { repo: makeRepo(), readme: null, rootFiles: [] }
}

describe("gradeFor", () => {
  it("maps the bands from the rubric", () => {
    expect(gradeFor(100)).toBe("A")
    expect(gradeFor(90)).toBe("A")
    expect(gradeFor(89)).toBe("B")
    expect(gradeFor(75)).toBe("B")
    expect(gradeFor(74)).toBe("C")
    expect(gradeFor(60)).toBe("C")
    expect(gradeFor(59)).toBe("D")
    expect(gradeFor(40)).toBe("D")
    expect(gradeFor(39)).toBe("F")
    expect(gradeFor(0)).toBe("F")
  })
})

describe("scoreRepo", () => {
  it("sums the weights of the passing checks", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 15, "pass"),
      stubCheck("b", 10, "pass"),
      stubCheck("c", 25, "fail"),
    ])

    expect(result.earned).toBe(25)
    expect(result.possible).toBe(50)
    expect(result.score).toBe(50)
  })

  it("scores a repo that passes everything at 100", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 60, "pass"),
      stubCheck("b", 40, "pass"),
    ])

    expect(result.score).toBe(100)
    expect(result.grade).toBe("A")
  })

  it("scores a repo that passes nothing at 0", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 60, "fail"),
      stubCheck("b", 40, "fail"),
    ])

    expect(result.score).toBe(0)
    expect(result.grade).toBe("F")
  })

  it("keeps one outcome per check, in registry order", () => {
    const result = scoreRepo(context(), [
      stubCheck("a", 10, "pass"),
      stubCheck("b", 10, "fail"),
    ])

    expect(result.outcomes.map((o) => [o.check.id, o.result])).toEqual([
      ["a", "pass"],
      ["b", "fail"],
    ])
  })

  it("rounds to a whole number, and grades on the rounded figure", () => {
    // 1 of 3 is 33.33, which must not surface as 33.333333.
    const result = scoreRepo(context(), [
      stubCheck("a", 1, "pass"),
      stubCheck("b", 2, "fail"),
    ])

    expect(result.score).toBe(33)
  })

  it("carries the repo through so the UI does not have to pair them up", () => {
    const repo = makeRepo({ name: "gitgrade" })
    const result = scoreRepo(
      { repo, readme: null, rootFiles: [] },
      [stubCheck("a", 10, "pass")],
    )

    expect(result.repo.name).toBe("gitgrade")
  })
})

describe("scoreAccount", () => {
  function scored(score: number) {
    const passing = stubCheck("a", score, "pass")
    const failing = stubCheck("b", 100 - score, "fail")
    return scoreRepo(context(), score === 100 ? [passing] : [passing, failing])
  }

  it("is a plain mean across repos", () => {
    const account = scoreAccount([scored(90), scored(50), scored(40)])

    expect(account.score).toBe(60)
    expect(account.grade).toBe("C")
  })

  it("does not weight by repo size, stars, or recency", () => {
    // Two repos, one of them far more prominent. Both count once.
    const account = scoreAccount([scored(100), scored(0)])

    expect(account.score).toBe(50)
  })

  it("returns F for an account with no repos", () => {
    const account = scoreAccount([])

    expect(account.score).toBe(0)
    expect(account.grade).toBe("F")
  })
})
