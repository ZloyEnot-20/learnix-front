"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

interface MonthPickerProps {
  /** Selected month in `YYYY-MM` format. */
  value: string
  onChange: (value: string) => void
  className?: string
  "aria-label"?: string
}

function parseValue(value: string): { year: number; month: number } | null {
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return null
  return { year, month: month - 1 }
}

function toValue(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

/** Branded month selector: a trigger button + popover with a year stepper and month grid. */
export function MonthPicker({ value, onChange, className, ...rest }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseValue(value)
  const now = new Date()
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear())

  const label = useMemo(() => {
    if (!parsed) return "Pick a month"
    return new Date(parsed.year, parsed.month, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }, [parsed])

  const select = (month: number) => {
    onChange(toValue(viewYear, month))
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && parsed) setViewYear(parsed.year)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={rest["aria-label"] ?? "Select month"}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => setViewYear((y) => y - 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold tabular-nums text-slate-900">{viewYear}</span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => setViewYear((y) => y + 1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS_SHORT.map((m, idx) => {
            const isSelected = parsed?.year === viewYear && parsed?.month === idx
            const isCurrent = now.getFullYear() === viewYear && now.getMonth() === idx
            return (
              <button
                key={m}
                type="button"
                onClick={() => select(idx)}
                className={cn(
                  "rounded-md py-2 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-700 hover:bg-slate-100",
                  !isSelected && isCurrent && "ring-1 ring-inset ring-slate-300",
                )}
              >
                {m}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
