import type { Grade } from "../scoring"

/**
 * The badge is the one place outside check rows where the status colours
 * appear. The ring next to it stays accent blue at every grade, so this is
 * what tells you at a glance whether the number is good news.
 *
 * Three tiers, not five: A and B read as fine, C as middling, D and F as
 * work to do. Five colours would turn the account view into a rainbow.
 */
const TONE: Record<Grade, string> = {
  A: "border-pass/40 bg-pass/10 text-pass",
  B: "border-pass/40 bg-pass/10 text-pass",
  C: "border-na/40 bg-na/10 text-muted",
  D: "border-fail/40 bg-fail/10 text-fail",
  F: "border-fail/40 bg-fail/10 text-fail",
}

export default function GradeBadge({
  grade,
  size = "md",
}: {
  grade: Grade
  size?: "md" | "lg"
}) {
  const dimensions =
    size === "lg" ? "h-12 min-w-12 px-3 text-2xl" : "h-7 min-w-7 px-2 text-sm"

  return (
    <span
      aria-label={`Grade ${grade}`}
      className={`tabular inline-flex items-center justify-center rounded-md border font-semibold ${dimensions} ${TONE[grade]}`}
    >
      {grade}
    </span>
  )
}
