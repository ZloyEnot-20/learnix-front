"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { exercisesApi, type SpeakingSetSummary } from "@/lib/api"
import { invalidateExercises } from "@/lib/exercises-cache"
import { CEFR_LEVELS, type CefrLevel } from "./manage-exercises-section"
import { CardGridSkeleton } from "./skeletons"

type SetMode = "create" | "append"

interface PromptDraft {
  key: string
  text: string
  hint: string
}

function emptyPrompt(): PromptDraft {
  return { key: crypto.randomUUID(), text: "", hint: "" }
}

function promptIsComplete(p: PromptDraft): boolean {
  return Boolean(p.text.trim())
}

interface SpeakingManageSectionProps {
  onChanged?: () => void
}

export function SpeakingManageSection({ onChanged }: SpeakingManageSectionProps) {
  const { toast } = useToast()
  const [loadingSets, setLoadingSets] = useState(true)
  const [orgSets, setOrgSets] = useState<SpeakingSetSummary[]>([])
  const [mode, setMode] = useState<SetMode>("create")
  const [level, setLevel] = useState<CefrLevel>("A1")
  const [setTitle, setSetTitle] = useState("")
  const [selectedSlug, setSelectedSlug] = useState("")
  const [prompts, setPrompts] = useState<PromptDraft[]>([emptyPrompt(), emptyPrompt()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setsForLevel = useMemo(
    () => orgSets.filter((s) => s.level === level),
    [orgSets, level],
  )

  const loadSets = useCallback(async () => {
    setLoadingSets(true)
    try {
      const sets = await exercisesApi.orgSpeakingSets()
      setOrgSets(sets)
      setSelectedSlug((prev) => {
        const stillValid = sets.some((s) => s.slug === prev && s.level === level)
        if (stillValid) return prev
        return sets.find((s) => s.level === level)?.slug ?? ""
      })
    } catch {
      setOrgSets([])
    } finally {
      setLoadingSets(false)
    }
  }, [level])

  useEffect(() => {
    void loadSets()
  }, [loadSets])

  useEffect(() => {
    setSelectedSlug((prev) => {
      const stillValid = setsForLevel.some((s) => s.slug === prev)
      if (stillValid) return prev
      return setsForLevel[0]?.slug ?? ""
    })
    if (setsForLevel.length === 0 && mode === "append") setMode("create")
  }, [setsForLevel, mode])

  const readyPrompts = useMemo(() => prompts.filter(promptIsComplete), [prompts])

  const canSave = useMemo(() => {
    if (readyPrompts.length === 0) return false
    if (mode === "create" && !setTitle.trim()) return false
    if (mode === "append" && !selectedSlug) return false
    return true
  }, [readyPrompts.length, mode, setTitle, selectedSlug])

  const updatePrompt = (key: string, patch: Partial<PromptDraft>) => {
    setPrompts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  const addPromptRow = () => setPrompts((prev) => [...prev, emptyPrompt()])

  const removePromptRow = (key: string) => {
    setPrompts((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.key !== key)))
  }

  const resetRows = () => {
    setSetTitle("")
    setPrompts([emptyPrompt(), emptyPrompt()])
    setError(null)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        mode,
        level,
        title: mode === "create" ? setTitle.trim() : undefined,
        exerciseSlug: mode === "append" ? selectedSlug : undefined,
        prompts: readyPrompts.map((p) => ({
          text: p.text.trim(),
          hint: p.hint.trim(),
        })),
      }
      const result = await exercisesApi.manageSpeaking(payload)
      toast({
        title: mode === "create" ? "Speaking set created" : "Prompts added",
        description:
          mode === "create"
            ? `"${result.exercise.title}" · ${level} (${result.promptsAdded} prompts)`
            : `${result.promptsAdded} prompt${result.promptsAdded === 1 ? "" : "s"} added.`,
      })
      invalidateExercises()
      onChanged?.()
      await loadSets()
      if (mode === "create") {
        setMode("append")
        setSelectedSlug(result.exercise.slug)
      }
      resetRows()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save speaking prompts."
      setError(msg)
      toast({ title: "Save failed", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">CEFR level</Label>
            <div className="flex flex-wrap gap-1">
              {CEFR_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    level === lvl
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Save to</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  mode === "create"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                New set
              </button>
              <button
                type="button"
                onClick={() => setMode("append")}
                disabled={setsForLevel.length === 0}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  mode === "append"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                  setsForLevel.length === 0 && "cursor-not-allowed opacity-50",
                )}
              >
                Existing set
              </button>
            </div>
            {mode === "create" ? (
              <Input
                value={setTitle}
                onChange={(e) => setSetTitle(e.target.value)}
                placeholder={`Set name · ${level}`}
                className="h-9"
              />
            ) : loadingSets ? (
              <div className="flex h-9 items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading sets…
              </div>
            ) : setsForLevel.length === 0 ? (
              <p className="text-xs text-slate-500">No sets at {level} yet — create one first.</p>
            ) : (
              <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select set" />
                </SelectTrigger>
                <SelectContent>
                  {setsForLevel.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.title} ({s.questionCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="text-xs text-slate-500">
            Add a question and a hint — what the student should describe or talk about.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {prompts.map((p) => (
            <div key={p.key} className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_1fr_2rem] sm:gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400 sm:sr-only">Question</Label>
                <Input
                  value={p.text}
                  onChange={(e) => updatePrompt(p.key, { text: e.target.value })}
                  placeholder="Question, e.g. Describe your hometown"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400 sm:sr-only">Hint</Label>
                <Textarea
                  value={p.hint}
                  onChange={(e) => updatePrompt(p.key, { hint: e.target.value })}
                  placeholder="Hint: mention location, size, what you like…"
                  rows={1}
                  className="min-h-8 resize-none py-1.5 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePromptRow(p.key)}
                disabled={prompts.length <= 1}
                className="h-8 w-8 self-start p-0 text-slate-400 hover:text-rose-600"
                aria-label="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
          <Button type="button" variant="outline" size="sm" onClick={addPromptRow} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add row
          </Button>
          <span className="text-xs text-slate-500">
            {readyPrompts.length}/{prompts.length} ready
          </span>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Visible only to your organization · Exercises → {level} → Speaking
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          loading={saving}
          size="sm"
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {mode === "create" ? "Create set" : "Add prompts"}
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <p className="text-xs font-medium text-slate-700">Your speaking sets</p>
        {loadingSets ? (
          <CardGridSkeleton count={2} columns={2} className="mt-2 grid-cols-1 gap-2 sm:grid-cols-2" />
        ) : orgSets.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">No custom speaking sets yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {orgSets.map((s) => (
              <li
                key={s.slug}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
              >
                <span className="font-medium text-slate-900">{s.title}</span>
                <span className="text-slate-400"> · </span>
                {s.level} · {s.questionCount} prompts
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
