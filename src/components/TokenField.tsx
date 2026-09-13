import { useId, useState, useSyncExternalStore, type FormEvent } from "react"
import { fetchRateLimit } from "../api/github"
import { getToken, setToken, subscribeToken } from "../api/token"

/**
 * An optional field for the visitor's own GitHub token. Closed by default
 * behind one line of text; most people never need it, and the ones who
 * do are the ones who just hit the limit.
 *
 * Section 7, verbatim in spirit: the token is theirs, it lives in their
 * localStorage, it goes to api.github.com only, and the warning sits
 * next to the field rather than behind a link.
 */
export default function TokenField() {
  const stored = useSyncExternalStore(subscribeToken, getToken, () => null)
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)
  const inputId = useId()
  const helpId = useId()

  function save(event: FormEvent) {
    event.preventDefault()
    setToken(draft)
    setDraft("")
    // The next response will carry the new budget in its headers; ask the
    // free endpoint now so the header updates without waiting for a scan.
    fetchRateLimit().catch(() => {})
  }

  function clear() {
    setToken(null)
    fetchRateLimit().catch(() => {})
  }

  return (
    <div className="text-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="text-muted underline-offset-2 hover:text-text hover:underline"
      >
        {stored ? "Using your token" : "Hitting the limit? Use a token"}
      </button>

      {open && (
        <form
          onSubmit={save}
          className="mt-3 grid gap-2 rounded-lg border border-border bg-surface p-3 text-left"
        >
          <label htmlFor={inputId} className="font-medium text-text">
            GitHub token
          </label>
          <p id={helpId} className="text-muted">
            Raises the limit from 60 requests an hour to 5,000. It is stored
            only in this browser and sent only to api.github.com, but anyone
            who can open this browser can read it. Use a fine-grained token
            with no permissions at all: public data needs none.
          </p>
          <div className="flex gap-2">
            <input
              id={inputId}
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={stored ? "Saved. Paste a new one to replace it." : "github_pat_…"}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={helpId}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
            >
              Save
            </button>
            {stored && (
              <button
                type="button"
                onClick={clear}
                className="rounded-md border border-border px-3 py-1.5 text-muted hover:bg-surface-raised hover:text-text"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
