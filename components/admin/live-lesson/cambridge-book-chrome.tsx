"use client"

import type { CSSProperties, ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TEXTBOOK } from "@/lib/books/textbook-theme"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const font: CSSProperties = { fontFamily: TEXTBOOK.font }

export function CambridgeUnitHeader({
  unitNumber,
  title,
  subtitle,
}: {
  unitNumber: number
  title: string
  subtitle?: string
}) {
  return (
    <header className="mb-5 text-center" style={font}>
      <p
        className="text-[32px] font-light uppercase leading-tight tracking-[2px] max-[650px]:text-2xl"
        style={{ color: TEXTBOOK.heading }}
      >
        Unit {unitNumber}
        {title ? `: ${title}` : ""}
      </p>
      {subtitle ? (
        <p
          className="mt-2 text-[20px] font-semibold"
          style={{ color: TEXTBOOK.headingAccent }}
        >
          {subtitle}
        </p>
      ) : null}
      <div
        className="mx-auto mt-5 h-[3px] w-full"
        style={{ backgroundColor: TEXTBOOK.heading }}
      />
    </header>
  )
}

export function CambridgeSectionBanner({ title }: { title: string }) {
  return (
    <h2
      className="mb-5 pl-[15px] text-2xl font-bold max-[650px]:text-xl"
      style={{
        ...font,
        color: TEXTBOOK.heading,
        borderLeft: `4px solid ${TEXTBOOK.accent}`,
      }}
    >
      {title}
    </h2>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[900px] space-y-4 rounded-lg bg-white p-8 shadow-[0_2px_20px_rgba(0,0,0,0.1)]">
      <Skeleton className="mx-auto h-8 w-2/3" />
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-20 w-4/5 rounded-md" />
    </div>
  )
}

export function CambridgeBookChrome({
  title,
  unit,
  subtitle,
  pageNum,
  pageIndex,
  pageCount,
  onPrev,
  onNext,
  canPrev,
  canNext,
  loading,
  children,
  className,
}: {
  title: string
  unit?: number | null
  subtitle?: string
  pageNum: number
  pageIndex: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  canNext: boolean
  loading?: boolean
  children: ReactNode
  className?: string
}) {
  const eyebrow =
    unit != null
      ? `Unit ${unit} · p.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`
      : `p.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`

  return (
    <div
      className={cn("flex min-h-[520px] flex-col overflow-hidden rounded-lg", className)}
      style={{
        ...font,
        backgroundColor: TEXTBOOK.pageBg,
        boxShadow: TEXTBOOK.shadow,
      }}
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.content }}
      >
        <div className="min-w-0 flex-1 text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: TEXTBOOK.muted }}
          >
            {eyebrow}
          </p>
          <p className="truncate text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-xs" style={{ color: TEXTBOOK.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 max-[650px]:px-2 sm:px-5 sm:py-6">
        {loading ? (
          <PageSkeleton />
        ) : (
          <div
            className="relative mx-auto w-full max-w-[900px] rounded-lg px-5 py-6 max-[650px]:px-5 max-[650px]:py-5 sm:px-[50px] sm:py-10"
            style={{
              backgroundColor: TEXTBOOK.content,
              boxShadow: TEXTBOOK.shadow,
              color: TEXTBOOK.text,
            }}
          >
            {children}
            <p
              className="mt-10 text-center text-sm tabular-nums"
              style={{ color: TEXTBOOK.muted }}
            >
              {pageNum}
            </p>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t px-3 py-2.5"
        style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.content }}
      >
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={onPrev}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-40"
          style={{
            backgroundColor: TEXTBOOK.accentSoft,
            color: TEXTBOOK.headingAccent,
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: TEXTBOOK.heading }}>
            Page {pageNum}
          </p>
          <p className="text-[11px]" style={{ color: TEXTBOOK.muted }}>
            {pageIndex + 1} of {pageCount || 1}
          </p>
        </div>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={onNext}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-40"
          style={{
            backgroundColor: TEXTBOOK.accentSoft,
            color: TEXTBOOK.headingAccent,
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
