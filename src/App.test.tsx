import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App"
import { makeRepo } from "./test/fixtures"

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

describe("App search", () => {
  it("fetches and renders the repos for the submitted username", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([makeRepo({ name: "gitgrade" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    )

    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    expect(await screen.findByRole("link", { name: "gitgrade" })).toBeInTheDocument()
  })
})

describe("App scoring", () => {
  it("grades every repo once its README and root listing arrive", async () => {
    const repo = makeRepo({ name: "gitgrade", description: "Grades profiles" })
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/readme")) {
          return Promise.resolve(new Response("# gitgrade", { status: 200 }))
        }
        if (url.endsWith("/contents/")) {
          return Promise.resolve(
            new Response(JSON.stringify([{ name: ".gitignore", path: ".gitignore", type: "file" }]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify([repo]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
      }),
    )

    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    // The ring only appears after the second round of requests, so its
    // presence proves the whole pipeline ran: list, contexts, engine, UI.
    const rings = await screen.findAllByRole("img", { name: /Score \d+ out of 100/ })
    // Two rings: the account grade at the top and the one repo below it.
    expect(rings).toHaveLength(2)
    expect(screen.getByRole("region", { name: "Account grade" })).toHaveTextContent("github.com/octocat")
    expect(screen.getByLabelText("To fix")).toBeInTheDocument()
    expect(screen.getByLabelText("Passing")).toHaveTextContent("Has a description")
  })

  it("leaves archived repos out of the list and the average, and says so", async () => {
    const live = makeRepo({ id: 1, name: "live", description: "Kept" })
    const archived = makeRepo({ id: 2, name: "old", archived: true })
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/readme")) return Promise.resolve(new Response("# x", { status: 200 }))
        if (url.endsWith("/contents/")) {
          return Promise.resolve(
            new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify([live, archived]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
      }),
    )

    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    await screen.findByRole("region", { name: "Account grade" })
    expect(screen.getAllByRole("article")).toHaveLength(1)
    expect(screen.queryByRole("link", { name: "old" })).not.toBeInTheDocument()
    expect(screen.getByText(/1 archived repo not counted\./)).toBeInTheDocument()
  })
})

describe("App unknown username", () => {
  it("says the account does not exist and names what was typed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    )

    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocatt")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No GitHub account called octocatt.",
    )
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})

describe("App sort and filter", () => {
  function stubTwoRepos() {
    const good = makeRepo({ id: 1, name: "good", description: "Has one", topics: ["x"] })
    const bad = makeRepo({ id: 2, name: "bad" })
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/readme")) {
          const body = url.includes("/good/") ? "# good\n\n" + "x".repeat(500) : null
          return Promise.resolve(new Response(body, { status: body ? 200 : 404 }))
        }
        if (url.endsWith("/contents/")) {
          return Promise.resolve(
            new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
          )
        }
        return Promise.resolve(
          new Response(JSON.stringify([good, bad]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
      }),
    )
  }

  const names = () => screen.getAllByRole("article").map((el) => el.querySelector("h3")!.textContent)

  it("ranks worst first by default and flips on request, without moving the account grade", async () => {
    stubTwoRepos()
    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))
    await screen.findByRole("region", { name: "Account grade" })

    expect(names()).toEqual(["bad", "good"])
    const accountBefore = screen.getByRole("region", { name: "Account grade" }).textContent

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "best")
    expect(names()).toEqual(["good", "bad"])
    expect(screen.getByRole("region", { name: "Account grade" }).textContent).toBe(accountBefore)
  })

  it("filters by grade and reports the count", async () => {
    stubTwoRepos()
    render(<App />)
    await userEvent.type(screen.getByLabelText("GitHub username"), "octocat")
    await userEvent.click(screen.getByRole("button", { name: "Grade" }))
    await screen.findByRole("region", { name: "Account grade" })

    // "bad" has no README and nothing else, so it is an F. Turn F off.
    await userEvent.click(screen.getByRole("button", { name: "Grade F" }))
    expect(names()).toEqual(["good"])
    expect(screen.getByText("1 of 2 repos")).toBeInTheDocument()
  })
})
