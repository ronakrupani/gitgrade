import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SearchBar from "./SearchBar"

describe("SearchBar", () => {
  it("submits the trimmed username", async () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)

    await userEvent.type(screen.getByLabelText("GitHub username"), "  octocat  ")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    expect(onSearch).toHaveBeenCalledWith("octocat")
  })

  it("submits when Enter is pressed in the input", async () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)

    await userEvent.type(
      screen.getByLabelText("GitHub username"),
      "octocat{enter}",
    )

    expect(onSearch).toHaveBeenCalledWith("octocat")
  })

  it("does not submit an empty username", async () => {
    const onSearch = vi.fn()
    render(<SearchBar onSearch={onSearch} />)

    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    expect(onSearch).not.toHaveBeenCalled()
  })
})
