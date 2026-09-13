import { rankWorstFirst, type Grade, type RepoScore } from "./scoring"

export type SortKey = "worst" | "best" | "pushed" | "name"

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "worst", label: "Worst first" },
  { key: "best", label: "Best first" },
  { key: "pushed", label: "Recently pushed" },
  { key: "name", label: "Name" },
]

export const ALL_GRADES: Grade[] = ["A", "B", "C", "D", "F"]

export interface Filters {
  /** Grades to show. Every grade is on by default. */
  grades: ReadonlySet<Grade>
  hideForks: boolean
}

/** The state the page loads with, which reproduces the plain account view. */
export const DEFAULT_SORT: SortKey = "worst"
export const DEFAULT_FILTERS: Filters = {
  grades: new Set(ALL_GRADES),
  hideForks: false,
}

/** Never pushed sorts as oldest. */
function pushedAt(score: RepoScore): number {
  return score.repo.pushed_at ? new Date(score.repo.pushed_at).getTime() : 0
}

/**
 * The scores the list shows, in the order it shows them. Filtering first,
 * then sorting, both pure, so the controls can be tested without a DOM
 * and the account grade above the list is never affected: it is a fact
 * about the account, not about what is currently on screen.
 */
export function applyControls(
  scores: RepoScore[],
  sort: SortKey,
  filters: Filters,
): RepoScore[] {
  const kept = scores.filter(
    (score) =>
      filters.grades.has(score.grade) && !(filters.hideForks && score.repo.fork),
  )

  switch (sort) {
    case "worst":
      return rankWorstFirst(kept)
    case "best":
      return rankWorstFirst(kept).reverse()
    case "pushed":
      return [...kept].sort(
        (a, b) => pushedAt(b) - pushedAt(a) || a.repo.name.localeCompare(b.repo.name),
      )
    case "name":
      return [...kept].sort((a, b) => a.repo.name.localeCompare(b.repo.name))
  }
}
