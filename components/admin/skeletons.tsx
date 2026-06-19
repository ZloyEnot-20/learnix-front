import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** A row of stat cards (e.g. totals at the top of a section). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Grid of card placeholders — groups, exercises, generic cards. */
export function CardGridSkeleton({
  count = 4,
  columns = 2,
  className,
}: {
  count?: number
  columns?: 2 | 3 | 4
  className?: string
}) {
  const cols =
    columns === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : columns === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2"
  return (
    <div className={cn("grid grid-cols-1 gap-4", cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Topic folder cards used on the exercises hub. */
export function TopicCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 justify-center"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-slate-200/80 bg-white p-6"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Level folder cards used on the exercises levels view. */
export function LevelFolderCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Table placeholder with a header row and N body rows. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-3 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-slate-100">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="py-3 px-3">
                  {c === 0 ? (
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2.5 w-36" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-3 w-20" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A card wrapping a table skeleton (header + table body). */
export function TableCardSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={rows} columns={columns} />
      </CardContent>
    </Card>
  )
}

/** Student detail modal — stat cards, homework & payment lists. */
export function StudentDetailModalSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-16" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <section>
        <Skeleton className="mb-3 h-3.5 w-36" />
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="h-px bg-slate-200" />

      <section>
        <Skeleton className="mb-3 h-3.5 w-32" />
        <ul className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/** IELTS profile block inside the student detail modal. */
export function StudentIeltsProfileSkeleton() {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-9 w-full rounded-md" />
          </div>
        ))}
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
            <Skeleton className="mt-2 h-3 w-16" />
            <Skeleton className="mt-1 h-6 w-10" />
            <Skeleton className="mt-2 h-4 w-20 rounded-full" />
          </div>
        ))}
      </div>

      <Skeleton className="h-48 w-full rounded-xl" />
    </section>
  )
}

/** Exercise statistics panel — summary cards, insights, table or topic accordion. */
export function ExerciseStatsSkeleton({ variant = "page" }: { variant?: "dialog" | "page" }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <Skeleton className="mx-auto h-7 w-14 rounded-full" />
            <Skeleton className="mx-auto mt-2 h-2.5 w-16" />
            <Skeleton className="mx-auto mt-1 h-2 w-12" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-full max-w-[220px]" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 min-w-[200px] flex-1 rounded-md" />
        <Skeleton className="h-3 w-40" />
      </div>

      {variant === "page" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
          <TableSkeleton rows={8} columns={8} />
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <div className="flex gap-3">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** A list of avatar rows — for member lists, simple lists. */
export function ListRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-40" />
          </div>
        </li>
      ))}
    </ul>
  )
}
