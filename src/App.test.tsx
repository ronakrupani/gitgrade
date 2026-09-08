import { render, screen } from "@testing-library/react"
import App from "./App"

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
