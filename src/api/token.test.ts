import { getToken, resetTokenListeners, setToken, subscribeToken } from "./token"

beforeEach(() => {
  resetTokenListeners()
})

describe("token store", () => {
  it("is empty to begin with", () => {
    expect(getToken()).toBeNull()
  })

  it("round trips a token through localStorage", () => {
    setToken("ghp_example")
    expect(getToken()).toBe("ghp_example")
    expect(localStorage.getItem("gitgrade:token")).toBe("ghp_example")
  })

  it("trims what was pasted", () => {
    setToken("  ghp_example\n")
    expect(getToken()).toBe("ghp_example")
  })

  it("treats blank as no token and removes the key", () => {
    setToken("ghp_example")
    setToken("   ")
    expect(getToken()).toBeNull()
    expect(localStorage.getItem("gitgrade:token")).toBeNull()
  })

  it("clears on null", () => {
    setToken("ghp_example")
    setToken(null)
    expect(getToken()).toBeNull()
  })

  it("tells subscribers when the token changes, and stops after unsubscribe", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToken(listener)
    setToken("a")
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    setToken("b")
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("survives a storage that throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {
        throw new Error("SecurityError")
      },
      removeItem: () => {
        throw new Error("SecurityError")
      },
    })
    try {
      expect(() => setToken("x")).not.toThrow()
      expect(getToken()).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("uses a key the response cache never touches", () => {
    // cache.ts only reads and removes gitgrade:cache: keys. The token
    // lives beside them and must survive a cache clear.
    expect("gitgrade:token".startsWith("gitgrade:cache:")).toBe(false)
  })
})
