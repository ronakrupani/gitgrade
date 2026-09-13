import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import TokenField from "./TokenField"
import { getToken, resetTokenListeners, setToken } from "../api/token"

beforeEach(() => {
  resetTokenListeners()
  setToken(null)
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
})

describe("TokenField", () => {
  it("is closed by default and offers itself to someone hitting the limit", () => {
    render(<TokenField />)
    const toggle = screen.getByRole("button", { name: "Hitting the limit? Use a token" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("GitHub token")).not.toBeInTheDocument()
  })

  it("shows the warning next to the field, not behind a link", async () => {
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: /Use a token/ }))
    const input = screen.getByLabelText("GitHub token")
    expect(input).toHaveAccessibleDescription(/stored only in this browser/)
    expect(input).toHaveAccessibleDescription(/sent only to api\.github\.com/)
    expect(input).toHaveAccessibleDescription(/anyone who can open this browser can read it/)
    expect(input).toHaveAccessibleDescription(/no permissions at all/)
  })

  it("masks the token as it is typed", async () => {
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: /Use a token/ }))
    expect(screen.getByLabelText("GitHub token")).toHaveAttribute("type", "password")
  })

  it("saves the token and asks for the new budget", async () => {
    const fetchMock = vi.fn((_url: string) => new Promise<Response>(() => {}))
    vi.stubGlobal("fetch", fetchMock)
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: /Use a token/ }))
    await userEvent.type(screen.getByLabelText("GitHub token"), "github_pat_abc")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(getToken()).toBe("github_pat_abc")
    expect(fetchMock.mock.calls.map((c) => c[0])).toContain("https://api.github.com/rate_limit")
    expect(screen.getByRole("button", { name: "Using your token" })).toBeInTheDocument()
  })

  it("does not save an empty field", async () => {
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: /Use a token/ }))
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("clears a saved token", async () => {
    setToken("github_pat_abc")
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: "Using your token" }))
    await userEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(getToken()).toBeNull()
    expect(screen.getByRole("button", { name: /Use a token/ })).toBeInTheDocument()
  })

  it("never shows the saved token back", async () => {
    setToken("github_pat_secret")
    render(<TokenField />)
    await userEvent.click(screen.getByRole("button", { name: "Using your token" }))
    expect(screen.getByLabelText("GitHub token")).toHaveValue("")
    expect(document.body.textContent).not.toContain("github_pat_secret")
  })
})
