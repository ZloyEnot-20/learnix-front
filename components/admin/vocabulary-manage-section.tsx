"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { exercisesApi, type VocabDeckSummary } from "@/lib/api"
import { invalidateVocabDecks } from "@/lib/vocabulary-data"
import { CardGridSkeleton } from "./skeletons"

const STAGE_LABEL = "Stage 1 (A1)"
const STAGE_LEVEL = "A1" as const

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", hint: "Basic everyday words" },
  { value: "medium", label: "Medium", hint: "Common words with more detail" },
  { value: "hard", label: "Hard", hint: "Challenging words for strong beginners" },
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
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [topicPreset, setTopicPreset] = useState<string>(TOPIC_PRESETS[0])
  const [customTopic, setCustomTopic] = useState("")
  const [deckTitle, setDeckTitle] = useState("")
  const [selectedDeckSlug, setSelectedDeckSlug] = useState("")
  const [words, setWords] = useState<WordDraft[]>([emptyWord(), emptyWord(), emptyWord()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topic = topicPreset === "__custom__" ? customTopic.trim() : topicPreset

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true)
    try {
      const decks = await exercisesApi.orgVocabDecks()
      setOrgDecks(decks)
      setSelectedDeckSlug((prev) => prev || decks[0]?.slug || "")
    } catch {
      setOrgDecks([])
    } finally {
      setLoadingDecks(false)
    }
  }, [])

  useEffect(() => {
    void loadDecks()
  }, [loadDecks])

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

  const resetForm = () => {
    setDeckTitle("")
    setCustomTopic("")
    setWords([emptyWord(), emptyWord(), emptyWord()])
    setError(null)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        mode,
        level: STAGE_LEVEL,
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
            ? `"${result.deck.title}" is now available to your organization (${result.wordsAdded} words).`
            : `${result.wordsAdded} word${result.wordsAdded === 1 ? "" : "s"} added to "${result.deck.title}".`,
      })
      invalidateVocabDecks()
      onChanged?.()
      await loadDecks()
      if (mode === "create") {
        setMode("append")
        setSelectedDeckSlug(result.deck.slug)
      }
      resetForm()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save vocabulary."
      setError(msg)
      toast({ title: "Save failed", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-sm">
            <BookMarked className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Vocabulary — {STAGE_LABEL}</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Your organization only
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Add flashcard decks for beginners. Pick a topic and difficulty, enter words with
              translations — no JSON or technical setup required.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <Card className="border-slate-200">
            <CardContent className="space-y-5 p-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">1. Deck settings</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Words you add here are visible only to students in your organization.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Word difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label} — {opt.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Topic</Label>
                  <Select value={topicPreset} onValueChange={setTopicPreset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOPIC_PRESETS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom topic…</SelectItem>
                    </SelectContent>
                  </Select>
                  {topicPreset === "__custom__" && (
                    <Input
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Airport vocabulary"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <Label>Where to save</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                      mode === "create"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    New deck
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("append")}
                    disabled={orgDecks.length === 0}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                      mode === "append"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      orgDecks.length === 0 && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Layers className="h-4 w-4" />
                    Add to existing deck
                  </button>
                </div>

                {mode === "create" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="deck-title">Deck name</Label>
                    <Input
                      id="deck-title"
                      value={deckTitle}
                      onChange={(e) => setDeckTitle(e.target.value)}
                      placeholder={`e.g. ${topic || "Family"} — ${DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label}`}
                    />
                    <p className="text-[11px] text-slate-400">
                      Students will see this name in the vocabulary section.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Existing deck</Label>
                    {loadingDecks ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading your decks…
                      </div>
                    ) : orgDecks.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No organization decks yet — create your first deck above.
                      </p>
                    ) : (
                      <Select value={selectedDeckSlug} onValueChange={setSelectedDeckSlug}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a deck" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgDecks.map((d) => (
                            <SelectItem key={d.slug} value={d.slug}>
                              {d.title} ({d.wordCount} words)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">2. Words</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    English word, short definition, and at least one translation (Russian or Uzbek).
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addWordRow} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add row
                </Button>
              </div>

              <div className="space-y-3">
                {words.map((w, idx) => (
                  <div
                    key={w.key}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Word {idx + 1}
                      </span>
                      {words.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWordRow(w.key)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                          aria-label="Remove word"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>English word or phrase</Label>
                        <Input
                          value={w.term}
                          onChange={(e) => updateWord(w.key, { term: e.target.value })}
                          placeholder="e.g. neighbour"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Definition (English)</Label>
                        <Textarea
                          value={w.definition}
                          onChange={(e) => updateWord(w.key, { definition: e.target.value })}
                          placeholder="A person who lives near you"
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Translation (Russian)</Label>
                        <Input
                          value={w.translation}
                          onChange={(e) => updateWord(w.key, { translation: e.target.value })}
                          placeholder="сосед"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Translation (Uzbek)</Label>
                        <Input
                          value={w.translationUz}
                          onChange={(e) => updateWord(w.key, { translationUz: e.target.value })}
                          placeholder="qo‘shni"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500">
                {readyWords.length} of {words.length} row{words.length === 1 ? "" : "s"} ready to
                save
              </p>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  loading={saving}
                  className="gap-1.5 bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4" />
                  {mode === "create" ? "Create deck" : "Add words to deck"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Your organization decks</h3>
              <p className="text-xs text-slate-500">
                Only members of your organization can see and study these decks.
              </p>
              {loadingDecks ? (
                <CardGridSkeleton count={3} columns={2} className="grid-cols-1 gap-2" />
              ) : orgDecks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  No custom decks yet. Create your first one on the left.
                </div>
              ) : (
                <ul className="space-y-2">
                  {orgDecks.map((d) => (
                    <li
                      key={d.slug}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                    >
                      <p className="font-medium text-sm text-slate-900">{d.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {d.topic || "General"} · {d.wordCount} words ·{" "}
                        {DIFFICULTY_OPTIONS.find((x) => x.value === d.difficulty)?.label ?? "Medium"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardContent className="space-y-2 p-5 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Tips
              </div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-emerald-800/90">
                <li>Start with 5–15 words per deck — students learn better in small sets.</li>
                <li>Use clear, short definitions in simple English.</li>
                <li>More stages (A2, B1…) will be added here later.</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
