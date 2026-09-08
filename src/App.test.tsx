import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"
import { makeRepo } from "./test/fixtures"

describe("App shell", () => {
  it("renders the product name in the header", () => {
    render(<App />)
    expect(screen.getByRole("link", { name: "GitGrade" })).toBeInTheDocument()
  })

  it("renders the tagline", () => {
    render(<App />)
    expect(
      screen.getByRole("heading", {
        name: "See your GitHub the way a recruiter sees it.",
      }),
    ).toBeInTheDocument()
  })

  it("renders a labelled username input and a submit button", () => {
    render(<App />)
    expect(screen.getByLabelText("GitHub username")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Grade" })).toBeInTheDocument()
  })
})

describe("App results area", () => {
  it("shows nothing in the results area until a username is submitted", () => {
    render(<App />)
    expect(screen.getByLabelText("Results")).toBeEmptyDOMElement()
  })
})

describe("App search", () => {
  it("fetches and renders the repos for the submitted username", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([makeRepo({ name: "gitgrade" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    )

    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    expect(await screen.findByRole("link", { name: "gitgrade" })).toBeInTheDocument()
  })
})
