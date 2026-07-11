"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  countListeningsByQuestionType,
  listeningQuestionTypeLabel,
} from "@/lib/listening-question-types"
import type { IeltsListeningSummary } from "@/lib/listening-data"

export function ListeningTypeFilters({
  types,
  listenings,
  activeType,
  onChange,
}: {
  types: string[]
  listenings: IeltsListeningSummary[]
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
            activeType === null && "bg-amber-500 text-white hover:bg-amber-500/90",
          )}
          onClick={() => onChange(null)}
        >
          All · {listenings.length}
        </Button>
        {types.map((type) => {
          const typeCount = countListeningsByQuestionType(listenings, type)
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={activeType === type ? "default" : "outline"}
              className={cn(
                "rounded-full",
                activeType === type && "bg-amber-500 text-white hover:bg-amber-500/90",
              )}
              onClick={() => onChange(activeType === type ? null : type)}
            >
              {listeningQuestionTypeLabel(type)} · {typeCount}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
