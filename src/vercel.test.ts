import vercel from "../vercel.json"

/**
 * The deploy config is data, so the promises it makes are testable. The
 * one that matters is section 7: the token goes to api.github.com and
 * nowhere else. The client enforces that in code; the CSP enforces it in
 * the browser, so a future bug in the client still cannot leak it.
 */
function csp(): Map<string, string[]> {
  const all = vercel.headers.find((h) => h.source === "/(.*)")!
  const value = all.headers.find((h) => h.key === "Content-Security-Policy")!.value
  return new Map(
    value.split(";").map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/)
      return [name, sources]
    }),
  )
}

describe("the deploy config", () => {
  it("lets the page talk to api.github.com and nothing else", () => {
    expect(csp().get("connect-src")).toEqual(["'self'", "https://api.github.com"])
  })

  it("loads scripts only from the deploy itself, never inline or remote", () => {
    expect(csp().get("script-src")).toEqual(["'self'"])
  })

  it("refuses to be framed", () => {
    expect(csp().get("frame-ancestors")).toEqual(["'none'"])
  })

  it("allows inline styles, which React style props need", () => {
    // The orbit sets --delay and --orbit-r through style attributes.
    expect(csp().get("style-src")).toContain("'unsafe-inline'")
  })

  it("caches hashed assets for a year and nothing else that long", () => {
    const assets = vercel.headers.find((h) => h.source === "/assets/(.*)")!
    const cache = assets.headers.find((h) => h.key === "Cache-Control")!.value
    expect(cache).toContain("immutable")
    const all = vercel.headers.find((h) => h.source === "/(.*)")!
    expect(all.headers.find((h) => h.key === "Cache-Control")).toBeUndefined()
  })
})
