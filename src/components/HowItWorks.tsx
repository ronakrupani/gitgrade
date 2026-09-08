import { rubricPreview } from "../rubricPreview"
import { useReveal } from "../hooks/useReveal"

const STEPS = [
  {
    n: "01",
    title: "Type a username",
    body: "No login, no token, no account. GitGrade reads the same public data anyone looking at your profile can see.",
  },
  {
    n: "02",
    title: "Every public repo gets scored",
    body: "Thirteen rules, 100 points. Rules that do not apply are dropped from the denominator, so a Python library is not marked down for having no deployed URL.",
  },
  {
    n: "03",
    title: "Worst repo first",
    body: "The result is a work queue, not a leaderboard. Failed checks lead, sorted by the points they cost, each with the exact fix.",
  },
]

function Section({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="gg-reveal"
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-32">
      <Section>
        <h2 className="text-sm font-medium tracking-widest text-muted uppercase">
          How it works
        </h2>
      </Section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <Section key={step.n} delay={index * 90}>
            <div className="h-full rounded-xl border border-border bg-surface p-6">
              <span className="tabular text-sm text-accent">{step.n}</span>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          </Section>
        ))}
      </div>

      <Section delay={120}>
        <h2 className="mt-24 text-sm font-medium tracking-widest text-muted uppercase">
          The rubric
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          All of it, in the open. A score you cannot audit is a score you
          cannot act on.
        </p>
      </Section>

      <Section delay={160}>
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {rubricPreview.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-raised"
            >
              <span className="flex-1 text-sm">{entry.title}</span>
              <span
                aria-hidden="true"
                className="hidden h-1 w-32 overflow-hidden rounded-full bg-accent-dim sm:block"
              >
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(entry.weight / 15) * 100}%` }}
                />
              </span>
              <span className="tabular w-12 text-right text-sm text-muted">
                {entry.weight} pt
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
