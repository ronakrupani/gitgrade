import RateLimitStatus from "./RateLimitStatus"

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <a
          href="/"
          className="text-base font-semibold tracking-tight text-text hover:text-accent"
        >
          GitGrade
        </a>
        <RateLimitStatus />
      </div>
    </header>
  )
}
