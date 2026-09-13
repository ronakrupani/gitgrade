import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ListControls from "./ListControls"
import { ALL_GRADES, DEFAULT_FILTERS, DEFAULT_SORT, type Filters, type SortKey } from "../listControls"

function setup(overrides: Partial<React.ComponentProps<typeof ListControls>> = {}) {
  const onSortChange = vi.fn<(s: SortKey) => void>()
  const onFiltersChange = vi.fn<(f: Filters) => void>()
  render(
    <ListControls
      sort={DEFAULT_SORT}
      filters={DEFAULT_FILTERS}
      onSortChange={onSortChange}
      onFiltersChange={onFiltersChange}
      shown={13}
      total={13}
      {...overrides}
    />,
  )
  return { onSortChange, onFiltersChange }
}

describe("ListControls", () => {
  it("offers every sort and starts on worst first", () => {
    setup()
    const select = screen.getByRole("combobox", { name: "Sort" })
    expect(select).toHaveValue("worst")
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Worst first",
      "Best first",
      "Recently pushed",
      "Name",
    ])
  })

  it("reports a sort change", async () => {
    const { onSortChange } = setup()
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "name")
    expect(onSortChange).toHaveBeenCalledWith("name")
  })

  it("shows every grade as a pressed toggle to begin with", () => {
    setup()
    for (const grade of ALL_GRADES) {
      expect(screen.getByRole("button", { name: `Grade ${grade}` })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    }
  })

  it("turns a grade off without touching the others", async () => {
    const { onFiltersChange } = setup()
    await userEvent.click(screen.getByRole("button", { name: "Grade A" }))
    const next = onFiltersChange.mock.calls[0][0]
    expect(next.grades.has("A")).toBe(false)
    expect([...next.grades].sort()).toEqual(["B", "C", "D", "F"])
    expect(next.hideForks).toBe(false)
  })

  it("turns a grade back on", async () => {
    const { onFiltersChange } = setup({
      filters: { grades: new Set(["B", "C"]), hideForks: false },
    })
    expect(screen.getByRole("button", { name: "Grade A" })).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(screen.getByRole("button", { name: "Grade A" }))
    expect(onFiltersChange.mock.calls[0][0].grades.has("A")).toBe(true)
  })

  it("toggles hiding forks", async () => {
    const { onFiltersChange } = setup()
    await userEvent.click(screen.getByRole("checkbox", { name: "Hide forks" }))
    expect(onFiltersChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, hideForks: true })
  })

  it("says how many repos are on screen when a filter is hiding some", () => {
    setup({ shown: 4, total: 13 })
    expect(screen.getByRole("status")).toHaveTextContent("4 of 13 repos")
  })

  it("just gives the count when nothing is hidden", () => {
    setup({ shown: 13, total: 13 })
    expect(screen.getByRole("status")).toHaveTextContent("13 repos")
    expect(screen.getByRole("status")).not.toHaveTextContent("of")
  })

  it("uses the accent for the on state, never a status colour", () => {
    // The grade toggles are labelled A to F but they are controls, not
    // grades. Colouring A green and F red here would spread the status
    // colours off the badge and the check rows, which 8b forbids.
    setup()
    for (const grade of ALL_GRADES) {
      const button = screen.getByRole("button", { name: `Grade ${grade}` })
      expect(button.className).not.toMatch(/pass|fail/)
    }
  })
})
