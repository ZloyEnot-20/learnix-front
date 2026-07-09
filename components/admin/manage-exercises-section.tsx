"use client"

import { useState } from "react"
import { BookMarked, Mic2, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { VocabularyManageSection } from "./vocabulary-manage-section"
import { SpeakingManageSection } from "./speaking-manage-section"

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export type CefrLevel = (typeof CEFR_LEVELS)[number]

type ContentTab = "vocabulary" | "speaking" | "writing"

const TABS: {
  id: ContentTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  badge?: string
}[] = [
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked },
  { id: "speaking", label: "Speaking", icon: Mic2 },
  { id: "writing", label: "Writing", icon: PenLine, disabled: true, badge: "Soon" },
]

interface ManageExercisesSectionProps {
  onChanged?: () => void
}

export function ManageExercisesSection({ onChanged }: ManageExercisesSectionProps) {
  const [tab, setTab] = useState<ContentTab>("vocabulary")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-px">
        {TABS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px",
                item.disabled && "cursor-not-allowed opacity-45",
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {item.badge ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tab === "vocabulary" ? <VocabularyManageSection onChanged={onChanged} /> : null}
      {tab === "speaking" ? <SpeakingManageSection onChanged={onChanged} /> : null}
    </div>
  )
}
