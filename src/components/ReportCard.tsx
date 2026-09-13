import { useId, useState } from "react"
import { partitionOutcomes, type CheckOutcome, type RepoScore } from "../scoring"

/** A dot in the status colour. The only place red or green appears. */
function Marker({ result }: { result: CheckOutcome["result"] }) {
  const tone =
    result === "pass" ? "bg-pass" : result === "fail" ? "bg-fail" : "bg-na"
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${tone}`}
    />
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`size-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * One check, as a row that opens to say why the rule matters and, when it
 * failed, exactly what to do. Closed by default: the title and the points
 * are the scan, the detail is the read.
 */
function CheckRow({ outcome }: { outcome: CheckOutcome }) {
  const { check, result } = outcome
  const [open, setOpen] = useState(false)
  const detailId = useId()

  const points =
    result === "fail" ? `-${check.weight}` : result === "pass" ? `+${check.weight}` : "n/a"

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-raised"
      >
        <Marker result={result} />
        <span className={result === "na" ? "text-muted" : ""}>{check.title}</span>
        <span
          className={`tabular ml-auto shrink-0 text-xs ${
            result === "fail" ? "text-fail" : result === "pass" ? "text-pass" : "text-muted"
          }`}
        >
          {points}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          id={detailId}
          className="mt-1 mb-2 ml-1 grid gap-1.5 border-l border-border pl-4 text-sm"
        >
          <p className="text-muted">{check.why}</p>
          {result === "fail" && (
            <p>
              <span className="text-muted">Fix: </span>
              {check.howToFix}
            </p>
          )}
          {result === "na" && (
            <p className="text-muted">
              Does not apply to this repo, so it counts neither for nor against it.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function Section({
  title,
  outcomes,
  muted = false,
}: {
  title: string
  outcomes: CheckOutcome[]
  muted?: boolean
}) {
  if (outcomes.length === 0) return null
  return (
    <section aria-label={title}>
      <h4
        className={`text-xs tracking-[0.15em] uppercase ${muted ? "text-na" : "text-muted"}`}
      >
        {title}
      </h4>
      <ul className="mt-1 divide-y divide-border">
        {outcomes.map((outcome) => (
          <CheckRow key={outcome.check.id} outcome={outcome} />
        ))}
      </ul>
    </section>
  )
}

/** Every check that ran on a repo, failures first. Each row expands. */
export default function ReportCard({ score }: { score: RepoScore }) {
  const { failed, passed, notApplicable } = partitionOutcomes(score.outcomes)

  return (
    <div className="grid gap-4">
      {failed.length === 0 && (
        <p className="text-sm text-muted">Every applicable check passed.</p>
      )}
      <Section title="To fix" outcomes={failed} />
      <Section title="Passing" outcomes={passed} />
      <Section title="Not applicable" outcomes={notApplicable} muted />
    </div>
  )
}
