import "@testing-library/jest-dom/vitest"

// The response cache lives in localStorage and jsdom keeps it between
// tests. Every test starts with an empty one, so a fixture served to one
// test is never served from cache to the next.
beforeEach(() => {
  localStorage.clear()
  // A search writes ?user= into the address bar, and jsdom keeps it
  // between tests. Every test starts at the root, so a username one test
  // searched for is never auto-scanned by the next.
  window.history.replaceState(null, "", "/")
})
