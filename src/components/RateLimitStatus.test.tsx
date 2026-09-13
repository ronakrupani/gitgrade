import { render, screen, waitFor } from "@testing-library/react"
import RateLimitStatus from "./RateLimitStatus"
import { recordRateLimit, resetRateLimit } from "../api/rateLimit"

function headers(remaining: number, reset: Date): Headers {
  return new Headers({
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-limit": "60",
    "x-ratelimit-reset": String(Math.floor(reset.getTime() / 1000)),
  })
}

const reset = new Date("2026-09-13T15:40:00Z")
const resetText = reset.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

/** A /rate_limit response carrying the same budget in its headers. */
function rateLimitResponse(remaining: number): Response {
  return new Response(
    JSON.stringify({
      resources: { core: { limit: 60, remaining, reset: Math.floor(reset.getTime() / 1000) } },
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...Object.fromEntries(headers(remaining, reset)) } },
  )
}

beforeEach(() => {
  resetRateLimit()
})

describe("RateLimitStatus", () => {
  it("asks the free endpoint on mount so there is a number before the first scan", async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(rateLimitResponse(58)))
    vi.stubGlobal("fetch", fetchMock)

    render(<RateLimitStatus />)

    expect(await screen.findByText("58 of 60 requests left")).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.github.com/rate_limit")
  })

  it("shows the remaining count and the reset time", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    recordRateLimit(headers(42, reset))
    render(<RateLimitStatus />)
    expect(screen.getByText("42 of 60 requests left")).toBeInTheDocument()
    expect(screen.getByText(`resets ${resetText}`)).toBeInTheDocument()
  })

  it("says plainly when the budget is gone, and when it comes back", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    recordRateLimit(headers(0, reset))
    render(<RateLimitStatus />)
    expect(screen.getByRole("status")).toHaveTextContent(
      `GitHub rate limit used up. Resets at ${resetText}.`,
    )
  })

  it("updates as responses come in", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    recordRateLimit(headers(42, reset))
    render(<RateLimitStatus />)
    recordRateLimit(headers(41, reset))
    await waitFor(() => expect(screen.getByText("41 of 60 requests left")).toBeInTheDocument())
  })

  it("renders nothing before any budget is known", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    const { container } = render(<RateLimitStatus />)
    expect(container).toBeEmptyDOMElement()
  })

  it("stays empty rather than guessing if the free endpoint is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))))
    const { container } = render(<RateLimitStatus />)
    await new Promise((r) => setTimeout(r, 0))
    expect(container).toBeEmptyDOMElement()
  })

  it("asks again once the window has reset", async () => {
    vi.useFakeTimers()
    const now = new Date("2026-09-13T15:39:58Z")
    vi.setSystemTime(now)
    const fetchMock = vi.fn(() => Promise.resolve(rateLimitResponse(60)))
    vi.stubGlobal("fetch", fetchMock)
    recordRateLimit(headers(0, reset))

    render(<RateLimitStatus />)
    expect(fetchMock).not.toHaveBeenCalled()

    // Reset is two seconds out, plus one second of slack in the hook.
    await vi.advanceTimersByTimeAsync(3100)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("uses no status colour, even when the budget is gone", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))
    recordRateLimit(headers(0, reset))
    const { container } = render(<RateLimitStatus />)
    expect(container.innerHTML).not.toMatch(/text-fail|text-pass/)
  })
})
