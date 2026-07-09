"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { exercisesApi, type VocabDeckSummary } from "@/lib/api"
import { invalidateVocabDecks } from "@/lib/vocabulary-data"
import { CEFR_LEVELS, type CefrLevel } from "./manage-exercises-section"
import { CardGridSkeleton } from "./skeletons"

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const

const TOPIC_PRESETS = [
  "Personal information",
  "Family",
  "Friends",
  "Food & drink",
  "Travel",
  "Work & study",
  "Health",
  "Shopping",
  "Home",
  "Hobbies",
] as const

type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]["value"]
type DeckMode = "create" | "append"

interface WordDraft {
  key: string
  term: string
  definition: string
  translation: string
  translationUz: string
}

function emptyWord(): WordDraft {
  return {
    key: crypto.randomUUID(),
    term: "",
    definition: "",
    translation: "",
    translationUz: "",
  }
}

function wordIsComplete(w: WordDraft): boolean {
  return Boolean(w.term.trim() && w.definition.trim() && (w.translation.trim() || w.translationUz.trim()))
}

interface VocabularyManageSectionProps {
  onChanged?: () => void
}

export function VocabularyManageSection({ onChanged }: VocabularyManageSectionProps) {
  const { toast } = useToast()
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [orgDecks, setOrgDecks] = useState<VocabDeckSummary[]>([])
  const [mode, setMode] = useState<DeckMode>("create")
  const [level, setLevel] = useState<CefrLevel>("A1")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [topicPreset, setTopicPreset] = useState<string>(TOPIC_PRESETS[0])
  const [customTopic, setCustomTopic] = useState("")
  const [deckTitle, setDeckTitle] = useState("")
  const [selectedDeckSlug, setSelectedDeckSlug] = useState("")
  const [words, setWords] = useState<WordDraft[]>([emptyWord(), emptyWord()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topic = topicPreset === "__custom__" ? customTopic.trim() : topicPreset
  const decksForLevel = useMemo(
    () => orgDecks.filter((d) => d.level === level),
    [orgDecks, level],
  )

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true)
    try {
      const decks = await exercisesApi.orgVocabDecks()
      setOrgDecks(decks)
      setSelectedDeckSlug((prev) => {
        const stillValid = decks.some((d) => d.slug === prev && d.level === level)
        if (stillValid) return prev
        return decks.find((d) => d.level === level)?.slug ?? ""
      })
    } catch {
      setOrgDecks([])
    } finally {
      setLoadingDecks(false)
    }
  }, [level])

  useEffect(() => {
    void loadDecks()
  }, [loadDecks])

  useEffect(() => {
    setSelectedDeckSlug((prev) => {
      const stillValid = decksForLevel.some((d) => d.slug === prev)
      if (stillValid) return prev
      return decksForLevel[0]?.slug ?? ""
    })
    if (decksForLevel.length === 0 && mode === "append") setMode("create")
  }, [decksForLevel, mode])

  const readyWords = useMemo(() => words.filter(wordIsComplete), [words])

  const canSave = useMemo(() => {
    if (readyWords.length === 0) return false
    if (!topic) return false
    if (mode === "create" && !deckTitle.trim()) return false
    if (mode === "append" && !selectedDeckSlug) return false
    return true
  }, [readyWords.length, topic, mode, deckTitle, selectedDeckSlug])

  const updateWord = (key: string, patch: Partial<WordDraft>) => {
    setWords((prev) => prev.map((w) => (w.key === key ? { ...w, ...patch } : w)))
  }

  const addWordRow = () => setWords((prev) => [...prev, emptyWord()])

  const removeWordRow = (key: string) => {
    setWords((prev) => (prev.length <= 1 ? prev : prev.filter((w) => w.key !== key)))
  }

  const resetRows = () => {
    setDeckTitle("")
    setCustomTopic("")
    setWords([emptyWord(), emptyWord()])
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
        difficulty,
        topic,
        deckSlug: mode === "append" ? selectedDeckSlug : undefined,
        title: mode === "create" ? deckTitle.trim() : undefined,
        words: readyWords.map((w) => ({
          term: w.term.trim(),
          definition: w.definition.trim(),
          translation: w.translation.trim(),
          translationUz: w.translationUz.trim(),
        })),
      }
      const result = await exercisesApi.manageVocab(payload)
      toast({
        title: mode === "create" ? "Deck created" : "Words added",
        description:
          mode === "create"
            ? `"${result.deck.title}" · ${level} (${result.wordsAdded} words)`
            : `${result.wordsAdded} word${result.wordsAdded === 1 ? "" : "s"} added to "${result.deck.title}".`,
      })
      invalidateVocabDecks()
      onChanged?.()
      await loadDecks()
      if (mode === "create") {
        setMode("append")
        setSelectedDeckSlug(result.deck.slug)
      }
      resetRows()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save vocabulary."
      setError(msg)
      toast({ title: "Save failed", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
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
            <Label className="text-xs text-slate-500">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Topic</Label>
            <Select value={topicPreset} onValueChange={setTopicPreset}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPIC_PRESETS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {topicPreset === "__custom__" ? (
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Custom topic"
                className="h-9"
              />
            ) : null}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
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
                New deck
              </button>
              <button
                type="button"
                onClick={() => setMode("append")}
                disabled={decksForLevel.length === 0}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium",
                  mode === "append"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                  decksForLevel.length === 0 && "cursor-not-allowed opacity-50",
                )}
              >
                Existing deck
              </button>
            </div>
            {mode === "create" ? (
              <Input
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder={`Deck name · ${level}`}
                className="h-9"
              />
            ) : loadingDecks ? (
              <div className="flex h-9 items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading decks…
              </div>
            ) : decksForLevel.length === 0 ? (
              <p className="text-xs text-slate-500">No decks at {level} yet — create one first.</p>
            ) : (
              <Select value={selectedDeckSlug} onValueChange={setSelectedDeckSlug}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select deck" />
                </SelectTrigger>
                <SelectContent>
                  {decksForLevel.map((d) => (
                    <SelectItem key={d.slug} value={d.slug}>
                      {d.title} ({d.wordCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="hidden border-b border-slate-100 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_2rem] sm:gap-2">
          <span>Word</span>
          <span>Definition</span>
          <span>RU</span>
          <span>UZ</span>
          <span />
        </div>

        <div className="divide-y divide-slate-100">
          {words.map((w) => (
            <div
              key={w.key}
              className="grid gap-2 px-3 py-2 sm:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_2rem] sm:items-start sm:gap-2"
            >
              <Input
                value={w.term}
                onChange={(e) => updateWord(w.key, { term: e.target.value })}
                placeholder="English"
                className="h-8 text-sm"
              />
              <Input
                value={w.definition}
                onChange={(e) => updateWord(w.key, { definition: e.target.value })}
                placeholder="Short definition"
                className="h-8 text-sm"
              />
              <Input
                value={w.translation}
                onChange={(e) => updateWord(w.key, { translation: e.target.value })}
                placeholder="Russian"
                className="h-8 text-sm"
              />
              <Input
                value={w.translationUz}
                onChange={(e) => updateWord(w.key, { translationUz: e.target.value })}
                placeholder="Uzbek"
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWordRow(w.key)}
                disabled={words.length <= 1}
                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                aria-label="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
          <Button type="button" variant="outline" size="sm" onClick={addWordRow} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add row
          </Button>
          <span className="text-xs text-slate-500">
            {readyWords.length}/{words.length} ready
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
          Visible only to your organization · Exercises → {level} → Vocabulary
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
          {mode === "create" ? "Create deck" : "Add words"}
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <p className="text-xs font-medium text-slate-700">Your decks</p>
        {loadingDecks ? (
          <CardGridSkeleton count={2} columns={2} className="mt-2 grid-cols-1 gap-2 sm:grid-cols-2" />
        ) : orgDecks.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">No custom decks yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {orgDecks.map((d) => (
              <li
                key={d.slug}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
              >
                <span className="font-medium text-slate-900">{d.title}</span>
                <span className="text-slate-400"> · </span>
                {d.level} · {d.wordCount} words
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
