import "@testing-library/jest-dom/vitest"

// The response cache lives in localStorage and jsdom keeps it between
// tests. Every test starts with an empty one, so a fixture served to one
// test is never served from cache to the next.
beforeEach(() => {
  localStorage.clear()
})
