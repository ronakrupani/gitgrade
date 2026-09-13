import { render, screen } from "@testing-library/react"
import ErrorState, { Notice } from "./ErrorState"
import { GitHubError } from "../api/errors"
import { recordRateLimit, resetRateLimit } from "../api/rateLimit"

beforeEach(() => {
  resetRateLimit()
})

describe("Notice", () => {
  it("is a status region by default, with a title and a body", () => {
    render(<Notice title="Nothing here">Yet.</Notice>)
    const notice = screen.getByRole("status")
    expect(notice).toHaveTextContent("Nothing here")
    expect(notice).toHaveTextContent("Yet.")
  })

  it("never uses a status colour", () => {
    // Section 8b: red and green belong to check rows and the grade badge.
    const { container } = render(<Notice title="x">y</Notice>)
    expect(container.innerHTML).not.toMatch(/text-fail|text-pass|bg-fail|bg-pass/)
  })
})

describe("ErrorState", () => {
  it("names the username that was not found", () => {
    render(
      <ErrorState error={new GitHubError("not-found", "Not found on GitHub.", 404)} username="octocatt" />,
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("No GitHub account called octocatt.")
    expect(alert).toHaveTextContent(/Check the spelling/)
  })

  it("falls back to a plain not found when there is no username to name", () => {
    render(<ErrorState error={new GitHubError("not-found", "Not found on GitHub.", 404)} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Not found on GitHub.")
  })

  it("says when the rate limit resets if the client has seen the headers", () => {
    const reset = new Date("2026-09-12T15:40:00Z")
    recordRateLimit(
      new Headers({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-limit": "60",
        "x-ratelimit-reset": String(Math.floor(reset.getTime() / 1000)),
      }),
    )
    render(<ErrorState error={new GitHubError("rate-limited", "GitHub's rate limit is used up.", 403)} />)
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("GitHub's rate limit is used up.")
    expect(alert).toHaveTextContent(
      `It resets at ${reset.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`,
    )
    expect(alert).toHaveTextContent(/60 requests an hour/)
  })

  it("still explains the limit when no headers have been seen", () => {
    render(<ErrorState error={new GitHubError("rate-limited", "GitHub's rate limit is used up.", 403)} />)
    expect(screen.getByRole("alert")).toHaveTextContent(/resets within the hour/)
  })

  it("tells a network failure apart from a GitHub failure", () => {
    render(<ErrorState error={new GitHubError("network", "Could not reach GitHub. Check your connection.")} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach GitHub.")
    expect(screen.getByRole("alert")).toHaveTextContent(/Check your connection/)
  })

  it("shows the status on an unexpected http error", () => {
    render(<ErrorState error={new GitHubError("http", "GitHub returned 502.", 502)} />)
    expect(screen.getByRole("alert")).toHaveTextContent("GitHub returned an error.")
    expect(screen.getByRole("alert")).toHaveTextContent("GitHub returned 502.")
  })

  it("does not tell someone to wait for a problem that waiting will not fix", () => {
    // A 403 with budget left is a blocked account, and the client reports
    // it as http, not rate-limited. The words follow the kind.
    render(<ErrorState error={new GitHubError("http", "GitHub returned 403.", 403)} />)
    expect(screen.getByRole("alert")).not.toHaveTextContent(/rate limit|resets/)
  })

  it("is an alert, so it is announced when it appears", () => {
    render(<ErrorState error={new GitHubError("network", "x")} />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})
