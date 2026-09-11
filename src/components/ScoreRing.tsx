import type { Grade } from "../scoring"
import GradeBadge from "./GradeBadge"

/** Stroke width as a fraction of the diameter, so every size looks alike. */
const STROKE_RATIO = 0.09

/**
 * A score out of 100 as a ring, with the number in the middle and the
 * letter grade beside it.
 *
 * The ring is always accent blue on an accent-dim track. It does not go
 * red at an F or green at an A; that job belongs to the badge, so the page
 * has one accent and the status colours stay rare enough to mean something.
 */
export default function ScoreRing({
  score,
  grade,
  size = 96,
}: {
  score: number
  grade: Grade
  /** Diameter in pixels. */
  size?: number
}) {
  const stroke = size * STROKE_RATIO
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  // Clamped so a bad input cannot draw more than a full ring or less than
  // none. The score is already an integer from the engine.
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      role="img"
      aria-label={`Score ${clamped} out of 100, grade ${grade}`}
      className="inline-flex items-center gap-4"
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-accent-dim"
            strokeWidth={stroke}
          />
          <circle
            data-testid="score-ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="gg-ring stroke-accent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <span
          aria-hidden="true"
          className="tabular absolute inset-0 grid place-items-center font-semibold"
          style={{ fontSize: size * 0.3 }}
        >
          {clamped}
        </span>
      </div>

      <GradeBadge grade={grade} size={size >= 96 ? "lg" : "md"} />
    </div>
  )
}
