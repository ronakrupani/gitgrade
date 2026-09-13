/**
 * A placeholder block the shape of the content it stands in for. The
 * caller sets the size and the radius: a text line is rounded-md, a ring
 * is rounded-full, and a default here would fight whichever one lost the
 * cascade. Purely visual: every skeleton is aria-hidden, and the container that shows them
 * carries the loading announcement instead, so a screen reader hears
 * "Loading repos" once rather than a dozen empty boxes.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={`gg-skeleton bg-surface-raised ${className}`}
    />
  )
}

/** The shape of a repo card before the repo list has arrived. */
export function RepoCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="rounded-md h-4 w-40" />
            <Skeleton className="rounded-md h-3 w-16" />
          </div>
          <Skeleton className="rounded-md mt-3 h-3 w-3/4" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
        <RingSkeleton />
      </div>
    </div>
  )
}

/** The ring and badge, before the score is known. Same footprint as ScoreRing at 72. */
export function RingSkeleton() {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <Skeleton className="size-[72px] rounded-full" />
      <Skeleton className="rounded-md h-7 w-7" />
    </div>
  )
}

/**
 * The check list, before the score is known. Sits exactly where the
 * report card will, so the card does not jump when it lands.
 */
export function ReportSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="rounded-md h-3 w-12" />
      <Skeleton className="rounded-md h-4 w-full" />
      <Skeleton className="rounded-md h-4 w-full" />
      <Skeleton className="rounded-md h-4 w-5/6" />
    </div>
  )
}
