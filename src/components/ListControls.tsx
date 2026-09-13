import { useId } from "react"
import { ALL_GRADES, SORT_OPTIONS, type Filters, type SortKey } from "../listControls"
import type { Grade } from "../scoring"

/**
 * Sort and filter for the ranked list. The controls change what is on
 * screen and nothing else: the account grade above them is a fact about
 * the account and does not move when a filter hides a repo.
 *
 * Grade filters are toggle buttons rather than a dropdown so the current
 * state is visible without opening anything. Every grade starts on.
 */
export default function ListControls({
  sort,
  filters,
  onSortChange,
  onFiltersChange,
  shown,
  total,
}: {
  sort: SortKey
  filters: Filters
  onSortChange: (sort: SortKey) => void
  onFiltersChange: (filters: Filters) => void
  /** How many repos the current filters leave on screen. */
  shown: number
  total: number
}) {
  const sortId = useId()
  const forksId = useId()

  function toggleGrade(grade: Grade) {
    const grades = new Set(filters.grades)
    if (grades.has(grade)) grades.delete(grade)
    else grades.add(grade)
    onFiltersChange({ ...filters, grades })
  }

  return (
    <div
      role="group"
      aria-label="Sort and filter"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm"
    >
      <label className="flex items-center gap-2">
        <span id={sortId} className="text-muted">
          Sort
        </span>
        <select
          aria-labelledby={sortId}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-text"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Grades to show</legend>
        <span aria-hidden="true" className="text-muted">
          Show
        </span>
        {ALL_GRADES.map((grade) => {
          const on = filters.grades.has(grade)
          return (
            <button
              key={grade}
              type="button"
              aria-pressed={on}
              aria-label={`Grade ${grade}`}
              onClick={() => toggleGrade(grade)}
              className={`tabular h-7 min-w-7 rounded-md border px-2 font-medium transition-colors ${
                on
                  ? "border-accent-dim bg-accent-dim text-text"
                  : "border-border text-muted hover:bg-surface-raised"
              }`}
            >
              {grade}
            </button>
          )
        })}
      </fieldset>

      <label htmlFor={forksId} className="flex items-center gap-2">
        <input
          id={forksId}
          type="checkbox"
          checked={filters.hideForks}
          onChange={(event) =>
            onFiltersChange({ ...filters, hideForks: event.target.checked })
          }
          className="accent-accent"
        />
        <span>Hide forks</span>
      </label>

      <p role="status" className="tabular ml-auto text-xs text-muted">
        {shown === total ? `${total} repos` : `${shown} of ${total} repos`}
      </p>
    </div>
  )
}
