import { useEffect, useMemo, useState } from "react"
import Header from "./components/Header"
import AccountSummary from "./components/AccountSummary"
import HowItWorks from "./components/HowItWorks"
import ListControls from "./components/ListControls"
import OrbitField from "./components/OrbitField"
import RepoList from "./components/RepoList"
import SearchBar from "./components/SearchBar"
import TokenField from "./components/TokenField"
import { useRepos } from "./hooks/useRepos"
import { useScores } from "./hooks/useScores"
import {
  applyControls,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type Filters,
  type SortKey,
} from "./listControls"
import { readUsername, withUsername } from "./shareUrl"

export default function App() {
  // A page opened from a shared link starts scanning straight away.
  const [username, setUsername] = useState<string | null>(() =>
    readUsername(window.location.search),
  )
  const repos = useRepos(username)

  function search(name: string) {
    setUsername(name)
    // replaceState, not pushState: the address bar should hold a link
    // worth sharing, but Back should leave the site, not step through
    // every username tried.
    window.history.replaceState(null, "", withUsername(window.location.href, name))
  }

  useEffect(() => {
    // Back and forward across a full navigation still land on a URL with
    // a username in it, and the page should show that username.
    function onPopState() {
      setUsername(readUsername(window.location.search))
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])
  // Straight out of state, so the reference is stable and the scan runs
  // once per repo list rather than once per render.
  const scores = useScores(repos.status === "loaded" ? repos.repos : null)

  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const scanning = repos.status === "loading" || scores.status === "scoring"

  const scored = scores.status === "scored" ? scores.scores : null
  // Only for the "4 of 13 repos" count. RepoList runs the same function
  // on the same inputs, and both are cheap enough that sharing the result
  // would be a bigger change than the duplication.
  const shown = useMemo(
    () => (scored ? applyControls(scored, sort, filters).length : 0),
    [scored, sort, filters],
  )

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <div className="gg-backdrop">
        <div className="gg-grid" />
        <div className="gg-bloom" />
      </div>

      <div className="relative z-10">
        <Header />
      </div>

      <main>
        <section className="relative grid min-h-[86vh] place-items-center overflow-hidden px-6">
          <OrbitField scanning={scanning} />

          <div className="relative z-10 w-full max-w-lg text-center">
            <p
              className="gg-rise text-xs tracking-[0.2em] text-muted uppercase"
              style={{ "--delay": "0ms" } as React.CSSProperties}
            >
              Thirteen rules. One hundred points.
            </p>

            <h1
              className="gg-rise gg-headline mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
              style={{ "--delay": "80ms" } as React.CSSProperties}
            >
              See your GitHub the way a recruiter sees it.
            </h1>

            <p
              className="gg-rise mx-auto mt-5 max-w-md text-muted text-balance"
              style={{ "--delay": "160ms" } as React.CSSProperties}
            >
              Every public repo on an account, scored against a checklist of
              repo hygiene rules, ranked worst first, with the exact fix for
              every failed check.
            </p>

            <div
              className="gg-rise mt-9"
              style={{ "--delay": "240ms" } as React.CSSProperties}
            >
              <SearchBar
                onSearch={search}
                disabled={scanning}
                initialValue={username ?? ""}
              />
            </div>

            <p
              className="gg-rise mt-4 text-xs text-muted"
              style={{ "--delay": "320ms" } as React.CSSProperties}
            >
              Read only. No login, and nothing is ever written to your repos.
            </p>

            <div
              className="gg-rise mt-3"
              style={{ "--delay": "400ms" } as React.CSSProperties}
            >
              <TokenField />
            </div>
          </div>
        </section>

        {/*
          The bottom padding only applies once there is a list to sit above.
          Idle renders nothing here and hands the page to HowItWorks, which
          brings its own pb-32, so padding both would double the gap.
        */}
        <section
          aria-label="Results"
          id="results"
          className={`relative z-10 mx-auto w-full max-w-3xl px-6 ${
            repos.status === "idle" ? "" : "pb-32"
          }`}
        >
          {username !== null &&
            repos.status === "loaded" &&
            scores.status === "scored" &&
            scores.scores.length > 0 && (
              <div className="mb-6 grid gap-4">
                <AccountSummary
                  username={username}
                  scores={scores.scores}
                  archivedCount={repos.archivedCount}
                />
                <ListControls
                  sort={sort}
                  filters={filters}
                  onSortChange={setSort}
                  onFiltersChange={setFilters}
                  shown={shown}
                  total={scores.scores.length}
                />
              </div>
            )}
          <RepoList
            state={repos}
            scores={scores}
            username={username ?? undefined}
            sort={sort}
            filters={filters}
          />
        </section>

        {repos.status === "idle" && <HowItWorks />}
      </main>
    </div>
  )
}
