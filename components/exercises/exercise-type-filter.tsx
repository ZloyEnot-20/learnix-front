"use client"

import { useMemo } from "react"
import {
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_ORDER,
  type GrammarExercise,
  type GrammarExerciseType,
} from "@/lib/grammar-types"
import { cn } from "@/lib/utils"

export type ExerciseTypeValue = "all" | GrammarExerciseType

/**
 * Pill filter for exercise types inside a topic folder.
 * Shows every supported type with a live count; types with zero exercises
 * are disabled so users see what's available without dead-ending.
 */
export default function ExerciseTypeFilter({
  exercises,
  value,
  onChange,
}: {
  exercises: GrammarExercise[]
  value: ExerciseTypeValue
  onChange: (value: ExerciseTypeValue) => void
}) {
  const counts = useMemo(() => {
    const c = {} as Record<GrammarExerciseType, number>
    for (const t of EXERCISE_TYPE_ORDER) c[t] = 0
    for (const ex of exercises) {
      if (c[ex.type] != null) c[ex.type] += 1
    }
    return c
  }, [exercises])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill
        active={value === "all"}
        count={exercises.length}
        label="All types"
        onClick={() => onChange("all")}
      />
      {EXERCISE_TYPE_ORDER.map((t) => {
        const count = counts[t]
        return (
          <Pill
            key={t}
            active={value === t}
            count={count}
            label={EXERCISE_TYPE_LABELS[t]}
            disabled={count === 0}
            onClick={() => onChange(t)}
          />
        )
      })}
    </div>
  )
}

function Pill({
  active,
  count,
  label,
  disabled,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
        disabled && "cursor-not-allowed opacity-40 hover:border-slate-200 hover:text-slate-600",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-white/15" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
  )
}
