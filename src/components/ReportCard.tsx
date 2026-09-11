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

function CheckRow({ outcome }: { outcome: CheckOutcome }) {
  const { check, result } = outcome
  const points =
    result === "fail" ? `-${check.weight}` : result === "pass" ? `+${check.weight}` : "n/a"

  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <Marker result={result} />
      <span className={result === "na" ? "text-muted" : ""}>{check.title}</span>
      <span
        className={`tabular ml-auto shrink-0 text-xs ${
          result === "fail" ? "text-fail" : result === "pass" ? "text-pass" : "text-muted"
        }`}
      >
        {points}
      </span>
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

/**
 * Every check that ran on a repo, failures first. Rows are flat here;
 * item 25 makes them expand to show why and how to fix.
 */
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
