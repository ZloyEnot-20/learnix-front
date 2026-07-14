"use client"

import type { ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CAMBRIDGE } from "@/lib/books/cambridge-theme"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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
    <div
      className="mb-5 flex items-stretch overflow-hidden rounded-sm border"
      style={{ borderColor: CAMBRIDGE.line }}
    >
      <div
        className="flex w-14 shrink-0 items-center justify-center text-2xl font-bold text-white"
        style={{ backgroundColor: CAMBRIDGE.deep }}
      >
        {unitNumber}
      </div>
      <div className="flex-1 px-4 py-3" style={{ backgroundColor: CAMBRIDGE.mid }}>
        <p className="font-serif text-lg font-semibold text-white">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-sm" style={{ color: CAMBRIDGE.soft }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function CambridgeSectionBanner({ title }: { title: string }) {
  return (
    <div
      className="mb-4 border-y px-3 py-2"
      style={{
        backgroundColor: CAMBRIDGE.wash,
        borderColor: CAMBRIDGE.line,
      }}
    >
      <p
        className="text-center text-xs font-bold uppercase tracking-[0.14em]"
        style={{ color: CAMBRIDGE.note }}
      >
        {title}
      </p>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-20 w-4/5 rounded-xl" />
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
      ? `UNIT ${unit} · P.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`
      : `P.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`

  return (
    <div
      className={cn("flex min-h-[520px] flex-col overflow-hidden rounded-2xl border", className)}
      style={{
        backgroundColor: CAMBRIDGE.pageBg,
        borderColor: CAMBRIDGE.line,
      }}
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: CAMBRIDGE.line, backgroundColor: CAMBRIDGE.wash }}
      >
        <div className="min-w-0 flex-1 text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: CAMBRIDGE.mid }}
          >
            {eyebrow}
          </p>
          <p className="truncate font-serif text-base font-bold" style={{ color: CAMBRIDGE.deep }}>
            {title}
          </p>
          {subtitle ? (
            <p className="truncate text-xs" style={{ color: CAMBRIDGE.note }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {loading ? (
          <PageSkeleton />
        ) : (
          <div
            className="relative mx-auto max-w-3xl rounded-sm px-5 py-6 shadow-md sm:px-8 sm:py-8"
            style={{
              backgroundColor: CAMBRIDGE.page,
              boxShadow: `0 8px 28px ${CAMBRIDGE.deep}22`,
            }}
          >
            {children}
            <p
              className="mt-8 text-center font-serif text-sm tabular-nums"
              style={{ color: CAMBRIDGE.mid }}
            >
              {pageNum}
            </p>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t px-3 py-2.5"
        style={{ borderColor: CAMBRIDGE.line, backgroundColor: CAMBRIDGE.wash }}
      >
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={onPrev}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40"
          style={{
            backgroundColor: CAMBRIDGE.soft,
            color: CAMBRIDGE.deep,
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold" style={{ color: CAMBRIDGE.deep }}>
            Page {pageNum}
          </p>
          <p className="text-[11px]" style={{ color: CAMBRIDGE.note }}>
            {pageIndex + 1} of {pageCount || 1}
          </p>
        </div>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={onNext}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40"
          style={{
            backgroundColor: CAMBRIDGE.soft,
            color: CAMBRIDGE.deep,
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
