"use client"

import type { CSSProperties, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
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
    <header className="mb-3 text-center" style={font}>
      <p
        className="font-light uppercase leading-tight tracking-[1.5px] max-[650px]:text-lg"
        style={{ color: TEXTBOOK.heading, fontSize: TEXTBOOK.type.unitTitle }}
      >
        Unit {unitNumber}
        {title ? `: ${title}` : ""}
      </p>
      {subtitle ? (
        <p
          className="mt-1 font-semibold"
          style={{ color: TEXTBOOK.headingAccent, fontSize: TEXTBOOK.type.unitSubtitle }}
        >
          {subtitle}
        </p>
      ) : null}
      <div
        className="mx-auto mt-2 h-[2px] w-full"
        style={{ backgroundColor: TEXTBOOK.heading }}
      />
    </header>
  )
}

export function CambridgeSectionBanner({ title }: { title: string }) {
  return (
    <h2
      className="mb-2 pl-2.5 font-bold"
      style={{
        ...font,
        color: TEXTBOOK.heading,
        fontSize: TEXTBOOK.type.section,
        borderLeft: `3px solid ${TEXTBOOK.accent}`,
      }}
    >
      {title}
    </h2>
  )
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[900px] space-y-3 rounded-lg bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.1)]">
      <Skeleton className="mx-auto h-6 w-2/3" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-14 w-4/5 rounded-md" />
    </div>
  )
}

/** Scales page content down so a typical sheet fits without scrolling. */
function FitScale({ children, className }: { children: ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      const available = outer.clientHeight
      const needed = inner.scrollHeight
      if (available <= 0 || needed <= 0) {
        setScale(1)
        return
      }
      setScale(needed > available ? Math.max(0.55, available / needed) : 1)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [children])

  return (
    <div ref={outerRef} className={cn("min-h-0 flex-1 overflow-hidden", className)}>
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
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
  compact = false,
  fitPage = false,
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
  /** Slimmer chrome for the live classroom layout. */
  compact?: boolean
  /** Scale the sheet to fit the available height (no vertical scroll). */
  fitPage?: boolean
}) {
  const eyebrow =
    unit != null
      ? `Unit ${unit} · p.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`
      : `p.${pageNum} · ${pageIndex + 1}/${pageCount || 1}`

  const sheet = loading ? (
    <PageSkeleton />
  ) : (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[900px] rounded-lg",
        compact ? "px-3 py-3 sm:px-5 sm:py-4" : "px-4 py-5 max-[650px]:px-4 max-[650px]:py-4 sm:px-8 sm:py-7",
      )}
      style={{
        backgroundColor: TEXTBOOK.content,
        boxShadow: TEXTBOOK.shadow,
        color: TEXTBOOK.text,
      }}
    >
      {children}
      <p
        className={cn("text-center text-sm tabular-nums", compact ? "mt-4" : "mt-10")}
        style={{ color: TEXTBOOK.muted }}
      >
        {pageNum}
      </p>
    </div>
  )

  return (
    <div
      className={cn("flex min-h-0 flex-col rounded-lg", className)}
      style={{
        ...font,
        backgroundColor: TEXTBOOK.pageBg,
        boxShadow: TEXTBOOK.shadow,
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-b",
          compact ? "px-2.5 py-1.5" : "px-4 py-3 gap-3",
        )}
        style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.content }}
      >
        <div className="min-w-0 flex-1 text-center">
          <p
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: TEXTBOOK.muted }}
          >
            {eyebrow}
          </p>
          {!compact ? (
            <>
              <p className="truncate text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
                {title}
              </p>
              {subtitle ? (
                <p className="truncate text-xs" style={{ color: TEXTBOOK.muted }}>
                  {subtitle}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {fitPage ? (
        <FitScale className={cn(compact ? "px-2 py-2" : "px-3 py-4 sm:px-5 sm:py-6")}>{sheet}</FitScale>
      ) : (
        <div className={cn(compact ? "min-h-0 flex-1 overflow-y-auto px-2 py-2" : "px-3 py-4 max-[650px]:px-2 sm:px-5 sm:py-6")}>
          {sheet}
        </div>
      )}

      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-t",
          compact ? "px-2 py-1.5" : "px-3 py-2.5 gap-3",
        )}
        style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.content }}
      >
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={onPrev}
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold disabled:opacity-40",
            compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
          )}
          style={{
            backgroundColor: TEXTBOOK.accentSoft,
            color: TEXTBOOK.headingAccent,
          }}
        >
          <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Prev
        </button>
        <div className="text-center">
          <p
            className={cn("font-semibold", compact ? "text-[11px]" : "text-xs")}
            style={{ color: TEXTBOOK.heading }}
          >
            Page {pageNum}
          </p>
          {!compact ? (
            <p className="text-[11px]" style={{ color: TEXTBOOK.muted }}>
              {pageIndex + 1} of {pageCount || 1}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={onNext}
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-semibold disabled:opacity-40",
            compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm",
          )}
          style={{
            backgroundColor: TEXTBOOK.accentSoft,
            color: TEXTBOOK.headingAccent,
          }}
        >
          Next
          <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
    </div>
  )
}
