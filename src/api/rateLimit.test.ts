import {
  getRateLimit,
  parseRateLimitHeaders,
  recordRateLimit,
  resetRateLimit,
  subscribeRateLimit,
} from "./rateLimit"

function headers(values: Record<string, string>): Headers {
  return new Headers(values)
}

beforeEach(() => {
  resetRateLimit()
})

describe("parseRateLimitHeaders", () => {
  it("reads limit, remaining, and reset", () => {
    const parsed = parseRateLimitHeaders(
      headers({
        "x-ratelimit-limit": "60",
        "x-ratelimit-remaining": "41",
        "x-ratelimit-reset": "1700000000",
      }),
    )

    expect(parsed).toEqual({
      limit: 60,
      remaining: 41,
      reset: new Date(1700000000 * 1000),
    })
  })

  it("returns null when the headers are absent", () => {
    expect(parseRateLimitHeaders(headers({}))).toBeNull()
  })

  it("returns null when only some of the headers are present", () => {
    expect(
      parseRateLimitHeaders(headers({ "x-ratelimit-remaining": "41" })),
    ).toBeNull()
  })

  it("returns null rather than NaN for a malformed header", () => {
    expect(
      parseRateLimitHeaders(
        headers({
          "x-ratelimit-limit": "sixty",
          "x-ratelimit-remaining": "41",
          "x-ratelimit-reset": "1700000000",
        }),
      ),
    ).toBeNull()
  })

  it("reads a zero remaining count rather than treating it as missing", () => {
    const parsed = parseRateLimitHeaders(
      headers({
        "x-ratelimit-limit": "60",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1700000000",
      }),
    )

    expect(parsed?.remaining).toBe(0)
  })
})

describe("the recorded budget", () => {
  const valid = {
    "x-ratelimit-limit": "60",
    "x-ratelimit-remaining": "17",
    "x-ratelimit-reset": "1700000000",
  }

  it("is null before any response has been seen", () => {
    expect(getRateLimit()).toBeNull()
  })

  it("holds the most recent response's headers", () => {
    recordRateLimit(headers(valid))
    expect(getRateLimit()?.remaining).toBe(17)

    recordRateLimit(headers({ ...valid, "x-ratelimit-remaining": "16" }))
    expect(getRateLimit()?.remaining).toBe(16)
  })

  it("is left alone by a response carrying no rate limit headers", () => {
    recordRateLimit(headers(valid))
    recordRateLimit(headers({}))

    expect(getRateLimit()?.remaining).toBe(17)
  })

  it("notifies subscribers, and stops after unsubscribe", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeRateLimit(listener)

    recordRateLimit(headers(valid))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].remaining).toBe(17)

    unsubscribe()
    recordRateLimit(headers(valid))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
