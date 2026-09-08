import { useState } from "react"
import Header from "./components/Header"
import SearchBar from "./components/SearchBar"

export default function App() {
  const [username, setUsername] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 pb-24">
        <section className="py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            See your GitHub the way a recruiter sees it.
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Every public repo on an account, scored against a checklist of repo
            hygiene rules, ranked worst first, with the exact fix for every
            failed check.
          </p>
          <div className="mt-6 max-w-md">
            <SearchBar onSearch={setUsername} />
          </div>
        </section>

        {/* The repo list renders here in item 6, the account grade in item 28. */}
        <section aria-label="Results" id="results">
          {username && <p className="text-muted">Grading {username}</p>}
        </section>
      </main>
    </div>
  )
}
