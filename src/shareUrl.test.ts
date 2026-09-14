import { readUsername, withUsername } from "./shareUrl"

describe("readUsername", () => {
  it("reads the user parameter", () => {
    expect(readUsername("?user=octocat")).toBe("octocat")
  })

  it("ignores other parameters", () => {
    expect(readUsername("?utm_source=x&user=octocat&ref=y")).toBe("octocat")
  })

  it("is null when the parameter is missing or blank", () => {
    expect(readUsername("")).toBeNull()
    expect(readUsername("?other=1")).toBeNull()
    expect(readUsername("?user=")).toBeNull()
    expect(readUsername("?user=%20%20")).toBeNull()
  })

  it("trims whitespace", () => {
    expect(readUsername("?user=%20octocat%20")).toBe("octocat")
  })
})

describe("withUsername", () => {
  it("adds the parameter to a bare URL", () => {
    expect(withUsername("https://gitgrade.example/", "octocat")).toBe(
      "https://gitgrade.example/?user=octocat",
    )
  })

  it("replaces an existing value rather than adding a second", () => {
    expect(withUsername("https://gitgrade.example/?user=old", "new")).toBe(
      "https://gitgrade.example/?user=new",
    )
  })

  it("keeps other parameters", () => {
    expect(withUsername("https://gitgrade.example/?ref=x", "octocat")).toBe(
      "https://gitgrade.example/?ref=x&user=octocat",
    )
  })

  it("removes the parameter on null", () => {
    expect(withUsername("https://gitgrade.example/?user=octocat", null)).toBe(
      "https://gitgrade.example/",
    )
  })

  it("encodes what needs encoding", () => {
    expect(withUsername("https://gitgrade.example/", "a b")).toBe(
      "https://gitgrade.example/?user=a+b",
    )
  })
})
