"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  countReadingsByQuestionType,
  readingQuestionTypeLabel,
} from "@/lib/reading-question-types"
import type { IeltsReadingSummary } from "@/lib/reading-data"

export function ReadingTypeFilters({
  types,
  readings,
  activeType,
  onChange,
}: {
  types: string[]
  readings: IeltsReadingSummary[]
  activeType: string | null
  onChange: (type: string | null) => void
}) {
  if (types.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Question type
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeType === null ? "default" : "outline"}
          className={cn(
            "rounded-full",
            activeType === null && "bg-sky-600 text-white hover:bg-sky-600/90",
          )}
          onClick={() => onChange(null)}
        >
          All · {readings.length}
        </Button>
        {types.map((type) => {
          const typeCount = countReadingsByQuestionType(readings, type)
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={activeType === type ? "default" : "outline"}
              className={cn(
                "rounded-full",
                activeType === type && "bg-sky-600 text-white hover:bg-sky-600/90",
              )}
              onClick={() => onChange(activeType === type ? null : type)}
            >
              {readingQuestionTypeLabel(type)} · {typeCount}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
