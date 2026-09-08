/**
 * The published rubric, in the order it appears in the spec.
 *
 * This drives the orbit on the landing page, which has to show all thirteen
 * rules before most of them are implemented. The registry in src/checks is
 * the source of truth for scoring; this list is the source of truth for
 * marketing. The test alongside this file asserts that every registered
 * check appears here with the same title and weight, so the two cannot
 * drift apart.
 */
export interface RubricEntry {
  id: string
  title: string
  weight: number
}

export const rubricPreview: RubricEntry[] = [
  { id: "readme-exists", title: "Has a README", weight: 15 },
  { id: "has-description", title: "Has a description", weight: 12 },
  { id: "readme-substantial", title: "README says something", weight: 10 },
  { id: "readme-has-image", title: "README has an image", weight: 10 },
  { id: "readme-has-run-steps", title: "Explains how to run it", weight: 10 },
  { id: "has-license", title: "Has a license", weight: 8 },
  { id: "no-placeholder-text", title: "No leftover placeholders", weight: 8 },
  { id: "not-empty-fork", title: "Not an untouched fork", weight: 8 },
  { id: "has-topics", title: "Has topics", weight: 6 },
  { id: "has-homepage", title: "Live link for a web project", weight: 5 },
  { id: "recently-updated", title: "Touched in the last year", weight: 4 },
  { id: "has-gitignore", title: "Has a .gitignore", weight: 2 },
  { id: "has-release", title: "Has a tagged release", weight: 2 },
]
