"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { skillBarFillColor } from "@/lib/language-profile"

export interface SkillProgressRow {
  key: string
  label: string
  icon: LucideIcon
  /** 0–100 bar fill */
  fillPercent: number
  /** IELTS band on the right; null when no data */
  ieltsBand: number | null
  hasData: boolean
}

interface SkillProgressBarsBlockProps {
  rows: SkillProgressRow[]
  className?: string
}

export function SkillProgressBarsBlock({ rows, className }: SkillProgressBarsBlockProps) {
  return (
    <div className={cn("space-y-4 rounded-xl border border-slate-200 bg-white p-4", className)}>
      {rows.map((row) => {
        const Icon = row.icon
        const fill = row.hasData ? Math.max(0, Math.min(100, row.fillPercent)) : 0
        const color = row.hasData ? skillBarFillColor(fill) : "#e2e8f0"

        return (
          <div key={row.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  row.hasData ? "text-slate-700" : "text-slate-300",
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  row.hasData ? "text-slate-800" : "text-slate-400",
                )}
              >
                {row.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${fill}%`, backgroundColor: color }}
                />
              </div>
              <span
                className={cn(
                  "w-10 shrink-0 text-right text-sm font-bold tabular-nums",
                  row.hasData ? "text-slate-900" : "text-slate-300",
                )}
              >
                {row.ieltsBand != null ? row.ieltsBand.toFixed(1) : "—"}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
