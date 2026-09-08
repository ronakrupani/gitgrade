import { rubricPreview } from "../rubricPreview"

/**
 * The rubric, orbiting the input.
 *
 * Three rings turning at different speeds and in alternating directions.
 * The heaviest rules sit on the innermost ring, so the things worth the
 * most points are the ones closest to the middle.
 *
 * Entirely decorative, so the whole field is hidden from assistive tech.
 * The same rules are listed as text in the section below the fold.
 */

interface Ring {
  /** How many rubric entries this ring carries. */
  take: number
  radius: string
  /** Radius while a scan is running. The rings pull inward. */
  tight: string
  duration: string
  reverse: boolean
  /** Hidden on narrow screens, where the outer rings run off the edge. */
  className: string
}

const RINGS: Ring[] = [
  {
    take: 5,
    radius: "clamp(255px, 25vw, 350px)",
    tight: "clamp(190px, 18vw, 250px)",
    duration: "58s",
    reverse: false,
    className: "",
  },
  {
    take: 4,
    radius: "clamp(370px, 35vw, 500px)",
    tight: "clamp(270px, 25vw, 355px)",
    duration: "84s",
    reverse: true,
    className: "hidden sm:block",
  },
  {
    take: 4,
    radius: "clamp(500px, 46vw, 660px)",
    tight: "clamp(360px, 33vw, 470px)",
    duration: "112s",
    reverse: false,
    className: "hidden lg:block",
  },
]

export default function OrbitField({ scanning }: { scanning: boolean }) {
  let cursor = 0

  return (
    <div
      aria-hidden="true"
      className={`gg-orbit-field ${scanning ? "gg-scanning" : ""}`}
    >
      {RINGS.map((ring, ringIndex) => {
        const entries = rubricPreview.slice(cursor, cursor + ring.take)
        cursor += ring.take

        const vars = {
          "--orbit-r": ring.radius,
          "--orbit-r-tight": ring.tight,
          "--dur": ring.duration,
          "--dir": ring.reverse ? "reverse" : "normal",
          "--dir-reverse": ring.reverse ? "normal" : "reverse",
        } as React.CSSProperties

        return (
          <div key={ring.radius} className={`gg-orbit-group ${ring.className}`}>
            <div
              className={`gg-ring ${ringIndex === 1 ? "gg-ring--dashed" : ""}`}
              style={vars}
            />
            {ringIndex === 0 && (
              <div className="gg-sweep" style={vars} />
            )}
            <div className="gg-orbit" style={vars}>
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="gg-slot"
                  style={
                    {
                      "--a": `${(360 / entries.length) * index + ringIndex * 18}deg`,
                    } as React.CSSProperties
                  }
                >
                  <div className="gg-slot-fix">
                    <span className="gg-chip">
                      {entry.title}
                      <span className="gg-chip-weight">{entry.weight}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
