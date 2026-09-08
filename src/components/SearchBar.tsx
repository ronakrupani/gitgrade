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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <label htmlFor="username" className="sr-only">
        GitHub username
      </label>
      <input
        id="username"
        name="username"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="GitHub username"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-accent px-4 py-2 font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
      >
        Grade
      </button>
    </form>
  )
}
