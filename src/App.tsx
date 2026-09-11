import { useState } from "react"
import Header from "./components/Header"
import HowItWorks from "./components/HowItWorks"
import OrbitField from "./components/OrbitField"
import RepoList from "./components/RepoList"
import SearchBar from "./components/SearchBar"
import { useRepos } from "./hooks/useRepos"
import { useScores } from "./hooks/useScores"

export default function App() {
  const [username, setUsername] = useState<string | null>(null)
  const repos = useRepos(username)
  // Straight out of state, so the reference is stable and the scan runs
  // once per repo list rather than once per render.
  const scores = useScores(repos.status === "loaded" ? repos.repos : null)

  const scanning = repos.status === "loading" || scores.status === "scoring"

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
              <SearchBar onSearch={setUsername} disabled={scanning} />
            </div>

            <p
              className="gg-rise mt-4 text-xs text-muted"
              style={{ "--delay": "320ms" } as React.CSSProperties}
            >
              Read only. No login, and nothing is ever written to your repos.
            </p>
          </div>
        </section>

        {/*
          The account grade goes above these cards in item 28.

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
          <RepoList state={repos} scores={scores} />
        </section>

        {repos.status === "idle" && <HowItWorks />}
      </main>
    </div>
  )
}
