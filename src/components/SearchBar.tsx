import { useState, type FormEvent } from "react"

interface SearchBarProps {
  onSearch: (username: string) => void
  disabled?: boolean
}

export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const username = value.trim()
    if (username) onSearch(username)
  }

  return (
    <form onSubmit={handleSubmit} className="gg-console flex items-center gap-2 p-2">
      <label htmlFor="username" className="sr-only">
        GitHub username
      </label>
      <span
        aria-hidden="true"
        className="tabular pl-3 text-sm text-muted select-none"
      >
        github.com/
      </span>
      <input
        id="username"
        name="username"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="username"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent py-2 text-base text-text outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={disabled}
        className="shrink-0 rounded-lg bg-accent px-5 py-2.5 font-medium text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        Grade
      </button>
    </form>
  )
}
