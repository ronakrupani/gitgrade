import {
  clearCache,
  evictExpired,
  isFresh,
  readCache,
  TTL_MS,
  writeCache,
  type CacheEntry,
} from "./cache"

function entry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    status: 200,
    contentType: "application/json",
    body: "[]",
    storedAt: 1_000_000,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe("cache", () => {
  it("round trips an entry by URL", () => {
    writeCache("https://api.github.com/x", entry({ body: "hello" }))
    expect(readCache("https://api.github.com/x")).toEqual(entry({ body: "hello" }))
  })

  it("misses on a URL it has not seen", () => {
    expect(readCache("https://api.github.com/nope")).toBeNull()
  })

  it("is fresh inside the TTL and stale after it", () => {
    const e = entry({ storedAt: 0 })
    expect(isFresh(e, TTL_MS - 1)).toBe(true)
    expect(isFresh(e, TTL_MS)).toBe(false)
  })

  it("has a one hour TTL, matching the rate limit window", () => {
    expect(TTL_MS).toBe(60 * 60 * 1000)
  })

  it("returns a stale entry from readCache, leaving the decision to the caller", () => {
    // On exhaustion the client serves stale rather than nothing, so the
    // read must not throw stale entries away.
    writeCache("u", entry({ storedAt: 0 }))
    expect(readCache("u")).not.toBeNull()
  })

  it("treats a corrupt entry as a miss", () => {
    localStorage.setItem("gitgrade:cache:u", "{not json")
    expect(readCache("u")).toBeNull()
    localStorage.setItem("gitgrade:cache:v", JSON.stringify({ body: 1 }))
    expect(readCache("v")).toBeNull()
  })

  it("evicts only expired entries, and only its own keys", () => {
    writeCache("old", entry({ storedAt: 0 }))
    writeCache("new", entry({ storedAt: TTL_MS * 10 }))
    localStorage.setItem("gitgrade:token", "not ours to touch")
    localStorage.setItem("someone-else", "leave it")

    evictExpired(TTL_MS * 10 + 1)

    expect(readCache("old")).toBeNull()
    expect(readCache("new")).not.toBeNull()
    expect(localStorage.getItem("gitgrade:token")).toBe("not ours to touch")
    expect(localStorage.getItem("someone-else")).toBe("leave it")
  })

  it("clears every cache entry and nothing else", () => {
    writeCache("a", entry())
    writeCache("b", entry())
    localStorage.setItem("someone-else", "leave it")

    clearCache()

    expect(readCache("a")).toBeNull()
    expect(readCache("b")).toBeNull()
    expect(localStorage.getItem("someone-else")).toBe("leave it")
  })

  it("survives a storage that throws on every call", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {
        throw new Error("SecurityError")
      },
      removeItem: () => {
        throw new Error("SecurityError")
      },
      key: () => {
        throw new Error("SecurityError")
      },
      get length() {
        throw new Error("SecurityError")
      },
      clear: () => {},
    }
    vi.stubGlobal("localStorage", broken)
    try {
      expect(() => writeCache("u", entry())).not.toThrow()
      expect(readCache("u")).toBeNull()
      expect(() => evictExpired()).not.toThrow()
      expect(() => clearCache()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("evicts expired entries and retries when the store is full", () => {
    writeCache("old", entry({ storedAt: 0 }))
    const realSet = Storage.prototype.setItem
    let calls = 0
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k, v) {
      calls++
      // First attempt fails as if over quota; the retry succeeds.
      if (calls === 1) throw new DOMException("quota", "QuotaExceededError")
      return realSet.call(this, k, v)
    })

    writeCache("new", entry({ storedAt: TTL_MS * 10 }))

    expect(readCache("old")).toBeNull()
    expect(readCache("new")).not.toBeNull()
    vi.restoreAllMocks()
  })
})
