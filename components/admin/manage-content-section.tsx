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
  ArrowRight,
  BookMarked,
  CheckCircle2,
  ClipboardCopy,
  DownloadCloud,
  FileJson,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/folder-colors"
import {
  CONTENT_EXAMPLES,
  parseContent,
  saveContent,
  type ContentKind,
} from "@/lib/manage-content"
import { getTopicsMeta, peekTopicsMeta } from "@/lib/exercises-cache"
import type { TopicMeta } from "@/lib/grammar-utils"
import { OCR_HANDOFF_KEY } from "@/lib/ocr-to-exercise"

interface KindMeta {
  id: ContentKind
  label: string
  icon: React.ComponentType<{ className?: string }>
  blurb: string
  /** Fields the uploaded JSON must contain. */
  hint: string
}

const KINDS: KindMeta[] = [
  {
    id: "topic",
    label: "Topic folder",
    icon: FolderPlus,
    blurb: "Create an empty topic folder that you can later fill with exercises.",
    hint: "Required: slug, title. Optional: description, levels, counts.",
  },
  {
    id: "exercise",
    label: "Questions / Exercise",
    icon: ListChecks,
    blurb:
      "Add a grammar or vocabulary exercise with its questions. Pick the folder it belongs to.",
    hint: "Required: slug, title, type, content.questions (or content.pairs for matching).",
  },
  {
    id: "test",
    label: "IELTS test",
    icon: FileText,
    blurb: "Register an IELTS test card (reading / listening / writing / speaking).",
    hint: "Required: testId, title, type, totalTime.",
  },
  {
    id: "vocabulary",
    label: "Vocabulary deck",
    icon: BookMarked,
    blurb: "Add a vocabulary deck for flashcards and quizzes.",
    hint: "Required: slug, title, words[] (each: id, term, partOfSpeech, definition).",
  },
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Flatten URL entries into a clean list. Any entry that is a JSON array string
 * (e.g. ["https://a", "https://b"]) is expanded into its individual links, so a
 * whole array of links can be pasted into a single field.
 */
function expandUrlEntries(entries: string[]): string[] {
  const out: string[] = []
  for (const entry of entries) {
    const value = entry.trim()
    if (!value) continue
    if (value.startsWith("[")) {
      try {
        const arr = JSON.parse(value)
        if (Array.isArray(arr)) {
          for (const u of arr) {
            if (typeof u === "string" && u.trim()) out.push(u.trim())
          }
          continue
        }
      } catch {
        /* not a JSON array — fall through and keep as a plain URL */
      }
    }
    out.push(value)
  }
  return out
}

const QUESTION_TYPES = new Set([
  "fill-in-the-blank",
  "multiple-choice",
  "matching",
  "word-formation",
  "sentence-transformation",
  "true-false",
  "error-correction",
  "word-order",
])

/** Map common type names from external sources onto our canonical question types. */
const TYPE_ALIASES: Record<string, string> = {
  transformation: "sentence-transformation",
  "sentence-transform": "sentence-transformation",
  rewrite: "sentence-transformation",
  "click-edit-error-correction": "error-correction",
  "error-correction": "error-correction",
  "error correction": "error-correction",
  correction: "error-correction",
  "word-order": "word-order",
  "word-ordering": "word-order",
  ordering: "word-order",
  reorder: "word-order",
  scramble: "word-order",
  unscramble: "word-order",
  "word-form": "word-formation",
  wordformation: "word-formation",
  "gap-fill": "fill-in-the-blank",
  gapfill: "fill-in-the-blank",
  cloze: "fill-in-the-blank",
  gap: "fill-in-the-blank",
  fill: "fill-in-the-blank",
  mcq: "multiple-choice",
  choice: "multiple-choice",
  "multiple-choices": "multiple-choice",
  truefalse: "true-false",
  "true-or-false": "true-false",
  tf: "true-false",
  match: "matching",
}

const DIFFICULTIES = new Set(["easy", "medium", "hard", "mixed"])

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]

/** True if a level string carries a recognisable CEFR band (e.g. "A1", "B1-B2"). */
function looksLikeCefr(level: unknown): boolean {
  if (typeof level !== "string") return false
  const up = level.toUpperCase()
  return CEFR.some((c) => up.includes(c))
}

/** Guess the question type from the content when the response doesn't give one. */
function inferQuestionType(obj: Record<string, unknown>): string {
  const content = (obj.content ?? {}) as { questions?: unknown[]; pairs?: unknown[] }
  if (Array.isArray(content.pairs) && content.pairs.length > 0) return "matching"
  const first = (Array.isArray(content.questions) ? content.questions[0] : null) as Record<
    string,
    unknown
  > | null
  if (first) {
    if (Array.isArray(first.scrambled) && Array.isArray(first.correct)) return "word-order"
    if (Array.isArray(first.segments) && first.segments.length > 0) return "error-correction"
    if (typeof first.correctBool === "boolean") return "true-false"
    if (Array.isArray(first.options) && first.options.length > 0) return "multiple-choice"
    if (Array.isArray(first.blanks) || Array.isArray(first.acceptableAnswers))
      return "fill-in-the-blank"
  }
  return "fill-in-the-blank"
}

/** Pick the first non-empty string from a list of candidate values. */
function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v
  }
  return ""
}

/**
 * Normalise a single fetched question onto the uploader schema. Sources vary in
 * how they name fields: the prompt may be `text`, `question`, `prompt` or
 * `sentence`; the answer may be `answer` or `correctAnswer`; transformation
 * answers may ship a flat `acceptableAnswers` list (full sentences) which we
 * keep as tolerant `accepted` alternatives.
 */
function normalizeFetchedQuestion(
  q: Record<string, unknown>,
  type: string,
): Record<string, unknown> {
  const out = { ...q }

  if (typeof out.id !== "number") {
    const n = Number(out.id)
    out.id = Number.isFinite(n) ? n : 0
  }

  if (typeof out.text !== "string" || out.text.trim().length === 0) {
    out.text = firstString(out.text, out.question, out.prompt, out.sentence)
  }

  // Word-order questions carry no prompt sentence — synthesise readable text
  // from the fixed + scrambled words so the schema (text is required) passes.
  if (type === "word-order" && (typeof out.text !== "string" || out.text.length === 0)) {
    const parts = [out.prefix, out.scrambled, out.suffix]
      .filter((p): p is string[] => Array.isArray(p))
      .flat()
      .filter((w) => typeof w === "string")
    out.text = parts.join(" ")
  }

  if (
    type === "sentence-transformation" ||
    type === "word-formation" ||
    type === "error-correction"
  ) {
    if (typeof out.answer !== "string" || out.answer.length === 0) {
      out.answer = firstString(out.answer, out.correctAnswer)
    }
    if (
      Array.isArray(out.acceptableAnswers) &&
      out.acceptableAnswers.every((a) => typeof a === "string")
    ) {
      out.accepted = out.acceptableAnswers as string[]
      delete out.acceptableAnswers
    }
  }

  return out
}

/**
 * Map a fetched exercise onto the uploader schema. The API returns `id` instead
 * of `slug`, and sometimes puts the category ("grammar" / "vocabulary") in
 * `type` — in that case the real question type is inferred from the content.
 *
 * `fallbackLevel` (the target folder's level) is used when the response has no
 * usable CEFR level, so imported exercises stay grouped under the chosen folder
 * instead of scattering into other/"Other" level folders.
 */
function normalizeFetchedExercise(
  item: Record<string, unknown>,
  fallbackLevel: string,
): Record<string, unknown> {
  const obj = { ...item }
  if (obj.slug == null && obj.id != null) obj.slug = obj.id

  const rawType = typeof obj.type === "string" ? obj.type.toLowerCase().trim() : ""
  if (QUESTION_TYPES.has(rawType)) {
    obj.type = rawType
  } else if (TYPE_ALIASES[rawType]) {
    obj.type = TYPE_ALIASES[rawType]
  } else {
    if (rawType === "grammar" || rawType === "vocabulary") {
      if (obj.category == null) obj.category = rawType
    }
    obj.type = inferQuestionType(obj)
  }

  // Different sources name the prompt/answer fields differently (e.g. `question`
  // + `correctAnswer` instead of `text` + `answer`). Normalise each question so
  // it matches the uploader schema and the exercise player can render it.
  const content = obj.content as { questions?: unknown[]; pairs?: unknown[] } | undefined
  if (content && Array.isArray(content.questions)) {
    obj.content = {
      ...content,
      questions: content.questions.map((q) =>
        normalizeFetchedQuestion((q ?? {}) as Record<string, unknown>, obj.type as string),
      ),
    }
  }

  // Category must be grammar/vocabulary or the schema rejects it; anything else
  // becomes "grammar" so the exercise still imports and shows up.
  if (obj.category !== "grammar" && obj.category !== "vocabulary") {
    obj.category = "grammar"
  }

  // The source sometimes puts a CEFR band ("A1-A2") in `difficulty`. Salvage it
  // as the level (if none yet) and fall back to a valid difficulty value.
  const diff = obj.difficulty
  if (typeof diff !== "string" || !DIFFICULTIES.has(diff)) {
    if (looksLikeCefr(diff) && !looksLikeCefr(obj.level)) obj.level = diff
    obj.difficulty = "mixed"
  }

  // Keep the exercise in the chosen folder's level band.
  if (!looksLikeCefr(obj.level)) {
    obj.level = looksLikeCefr(fallbackLevel) ? fallbackLevel : "A1"
  }

  return obj
}

/** Inject a chosen topic slug into pasted exercise JSON (single object or array). */
function withTopic(raw: string, topic: string): string {
  const json = JSON.parse(raw)
  const list = Array.isArray(json) ? json : [json]
  for (const item of list) {
    if (item && typeof item === "object") (item as Record<string, unknown>).topic = topic
  }
  return JSON.stringify(list, null, 2)
}

/** Inject CEFR level into vocabulary deck JSON when omitted in the payload. */
function withDeckLevel(raw: string, level: string): string {
  const json = JSON.parse(raw)
  const list = Array.isArray(json) ? json : [json]
  for (const item of list) {
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>
      if (!obj.level) obj.level = level
    }
  }
  return JSON.stringify(list, null, 2)
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]

interface ManageContentSectionProps {
  /** Called after a successful save so the shell can refresh badges/counts. */
  onChanged?: () => void
}

export default function ManageContentSection({ onChanged }: ManageContentSectionProps) {
  const { toast } = useToast()
  const [kind, setKind] = useState<ContentKind>("topic")
  const [raw, setRaw] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showExample, setShowExample] = useState(true)

  // Topic folders (shared by the folder manager + the exercise folder picker).
  const [topics, setTopics] = useState<TopicMeta[]>(() => peekTopicsMeta() ?? [])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>("")

  // Exercise input source: paste JSON or fetch one/more URLs (GET → save).
  const [exerciseSource, setExerciseSource] = useState<"json" | "url">("json")
  const [urls, setUrls] = useState<string[]>([""])
  const [fetching, setFetching] = useState(false)
  const [vocabLevel, setVocabLevel] = useState("A2")

  // New-folder form.
  const [folderForm, setFolderForm] = useState({
    title: "",
    slug: "",
    slugTouched: false,
    description: "",
    levels: "A1",
    color: FOLDER_COLORS[0].id,
  })
  const [creatingFolder, setCreatingFolder] = useState(false)

  const active = useMemo(() => KINDS.find((k) => k.id === kind)!, [kind])
  const example = CONTENT_EXAMPLES[kind]

  const reloadTopics = useCallback(async () => {
    setTopicsLoading(true)
    try {
      setTopics(await getTopicsMeta(true))
    } catch {
      /* keep whatever we have */
    } finally {
      setTopicsLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadTopics()
  }, [reloadTopics])

  // Pick up a draft handed over from the OCR section ("To exercise JSON").
  useEffect(() => {
    try {
      const draft = window.sessionStorage.getItem(OCR_HANDOFF_KEY)
      if (draft) {
        window.sessionStorage.removeItem(OCR_HANDOFF_KEY)
        setKind("exercise")
        setRaw(draft)
        toast({
          title: "Loaded from OCR",
          description: "Review the draft, pick a folder, then validate & save.",
        })
      }
    } catch {
      /* sessionStorage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchKind = (next: ContentKind) => {
    setKind(next)
    setError(null)
  }

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(example)
      toast({ title: "Example copied" })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const loadExample = () => {
    if (kind === "exercise" && selectedFolder) {
      try {
        setRaw(withTopic(example, selectedFolder))
      } catch {
        setRaw(example)
      }
    } else {
      setRaw(example)
    }
    setError(null)
  }

  const createFolder = async () => {
    setError(null)
    const title = folderForm.title.trim()
    const folderSlug = (folderForm.slug.trim() || slugify(title)).trim()
    if (!title || !folderSlug) {
      setError("A folder needs at least a title.")
      return
    }
    const topic: TopicMeta = {
      slug: folderSlug,
      title,
      description: folderForm.description.trim(),
      levels: folderForm.levels.trim() || "A1",
      exerciseCount: 0,
      questionCount: 0,
      totalMinutes: 0,
      color: folderForm.color,
    }
    setCreatingFolder(true)
    try {
      await saveContent("topic", [topic])
      toast({ title: "Folder created", description: title })
      setFolderForm({
        title: "",
        slug: "",
        slugTouched: false,
        description: "",
        levels: "A1",
        color: FOLDER_COLORS[0].id,
      })
      await reloadTopics()
      onChanged?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again."
      setError(msg)
      toast({ title: "Could not create folder", description: msg, variant: "destructive" })
    } finally {
      setCreatingFolder(false)
    }
  }

  const startAddExercise = (folderSlug: string) => {
    setSelectedFolder(folderSlug)
    setKind("exercise")
    setError(null)
    try {
      setRaw(withTopic(example, folderSlug))
    } catch {
      /* leave the textarea as-is */
    }
  }

  const handleSave = async () => {
    setError(null)
    if (!raw.trim()) {
      setError("Paste some JSON first.")
      return
    }
    if (kind === "exercise" && !selectedFolder) {
      setError("Choose a topic folder for this exercise first.")
      return
    }
    let rawToParse = raw
    if (kind === "exercise" && selectedFolder) {
      try {
        rawToParse = withTopic(raw, selectedFolder)
      } catch {
        /* let parseContent surface the JSON syntax error below */
      }
    }
    if (kind === "vocabulary") {
      try {
        rawToParse = withDeckLevel(raw, vocabLevel.trim() || "A1")
      } catch {
        /* let parseContent surface the JSON syntax error below */
      }
    }
    const parsed = parseContent(kind, rawToParse)
    if (!parsed.ok) {
      setError(parsed.error ?? "Validation failed.")
      return
    }
    setSaving(true)
    try {
      const count = await saveContent(kind, parsed.items)
      toast({
        title: "Saved",
        description:
          kind === "vocabulary"
            ? `${count} deck${count === 1 ? "" : "s"} saved for level ${vocabLevel}. Open Exercises → ${vocabLevel} → Vocabulary.`
            : `${count} ${active.label.toLowerCase()} item${count === 1 ? "" : "s"} added.`,
      })
      setRaw("")
      if (kind === "exercise") void reloadTopics()
      // Vocabulary is localStorage-only; exercises catalogue refresh is not needed.
      if (kind === "topic" || kind === "exercise" || kind === "test") onChanged?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again."
      setError(msg)
      toast({ title: "Could not save", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateUrl = (index: number, value: string) =>
    setUrls((list) => list.map((u, i) => (i === index ? value : u)))
  const addUrl = () => setUrls((list) => [...list, ""])
  const removeUrl = (index: number) =>
    setUrls((list) => (list.length <= 1 ? [""] : list.filter((_, i) => i !== index)))

  /** Expand a pasted JSON array of links into separate input fields. */
  const handleUrlPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim()
    if (!text.startsWith("[")) return
    let arr: unknown
    try {
      arr = JSON.parse(text)
    } catch {
      return // not valid JSON — let the default paste happen
    }
    if (!Array.isArray(arr)) return
    const cleaned = arr.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    if (cleaned.length === 0) return
    e.preventDefault()
    setUrls((list) => {
      const next = [...list]
      next.splice(index, 1, ...cleaned.map((u) => u.trim()))
      return next
    })
    setError(null)
  }

  /** GET each link, treat the JSON response as exercise(s), and save them into
   *  the selected folder. The API returns `id` instead of `slug`, so map it. */
  const importFromUrls = async () => {
    setError(null)
    if (!selectedFolder) {
      setError("Choose a topic folder for these exercises first.")
      return
    }
    const list = expandUrlEntries(urls)
    if (list.length === 0) {
      setError("Add at least one link.")
      return
    }
    const folderLevel = topics.find((t) => t.slug === selectedFolder)?.levels ?? "A1"
    setFetching(true)
    try {
      const collected: Record<string, unknown>[] = []
      for (const url of list) {
        let res: Response
        try {
          res = await fetch(url, { headers: { Accept: "application/json" } })
        } catch {
          throw new Error(`Could not reach ${url} (network or CORS error).`)
        }
        if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
        let data: unknown
        try {
          data = await res.json()
        } catch {
          throw new Error(`${url} did not return valid JSON.`)
        }
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (!item || typeof item !== "object") continue
          const obj = normalizeFetchedExercise(item as Record<string, unknown>, folderLevel)
          obj.topic = selectedFolder
          collected.push(obj)
        }
      }
      if (collected.length === 0) {
        throw new Error("No exercises found in the responses.")
      }
      const parsed = parseContent("exercise", JSON.stringify(collected))
      if (!parsed.ok) {
        setError(parsed.error ?? "Validation failed.")
        return
      }
      const count = await saveContent("exercise", parsed.items)
      toast({
        title: "Imported from links",
        description: `${count} exercise${count === 1 ? "" : "s"} added from ${list.length} link${
          list.length === 1 ? "" : "s"
        }.`,
      })
      setUrls([""])
      void reloadTopics()
      onChanged?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again."
      setError(msg)
      toast({ title: "Could not import from links", description: msg, variant: "destructive" })
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8102E] to-[#A00D25] text-white shadow-sm">
            <FileJson className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Manage exercises</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Create topic folders, then upload questions, tests and vocabulary into them.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const Icon = k.icon
          const isActive = k.id === kind
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => switchKind(k.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4" />
              {k.label}
            </button>
          )
        })}
      </div>

      {kind === "topic" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* New folder form */}
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">New topic folder</h3>
              </div>
              <p className="text-xs text-slate-500">{active.blurb}</p>

              <div className="space-y-1.5">
                <Label htmlFor="folder-title">Title *</Label>
                <Input
                  id="folder-title"
                  value={folderForm.title}
                  onChange={(e) =>
                    setFolderForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: f.slugTouched ? f.slug : slugify(e.target.value),
                    }))
                  }
                  placeholder="Present Simple"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="folder-slug">Slug *</Label>
                <Input
                  id="folder-slug"
                  value={folderForm.slug}
                  onChange={(e) =>
                    setFolderForm((f) => ({
                      ...f,
                      slug: slugify(e.target.value),
                      slugTouched: true,
                    }))
                  }
                  placeholder="present-simple"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Used in the URL. Auto-filled from the title — edit if needed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="folder-desc">Description</Label>
                  <Input
                    id="folder-desc"
                    value={folderForm.description}
                    onChange={(e) =>
                      setFolderForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Daily routines and general facts."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="folder-levels">Levels</Label>
                  <Input
                    id="folder-levels"
                    value={folderForm.levels}
                    onChange={(e) =>
                      setFolderForm((f) => ({ ...f, levels: e.target.value }))
                    }
                    placeholder="A1-A2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Folder colour</Label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map((c) => {
                    const selected = folderForm.color === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        aria-pressed={selected}
                        onClick={() => setFolderForm((f) => ({ ...f, color: c.id }))}
                        className={cn(
                          "h-7 w-7 rounded-full ring-2 ring-offset-2 transition-transform",
                          c.dot,
                          selected ? "ring-slate-900 scale-110" : "ring-transparent hover:scale-105",
                        )}
                      />
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400">
                  Used to tint this folder’s level on the Exercises page.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={createFolder}
                  loading={creatingFolder}
                  className="gap-1.5 bg-[#C8102E] hover:bg-[#A00D25]"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create folder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing folders */}
          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Existing folders {topics.length > 0 && `(${topics.length})`}
                  </h3>
                </div>
                {topicsLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              <FolderList topics={topics} loading={topicsLoading} onAddExercise={startAddExercise} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <active.icon className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">{active.label}</h3>
                </div>
                {!(kind === "exercise" && exerciseSource === "url") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadExample}
                    className="gap-1.5"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Use example
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">{active.blurb}</p>

              {kind === "exercise" && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm">
                  {(["json", "url"] as const).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => {
                        setExerciseSource(src)
                        setError(null)
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
                        exerciseSource === src
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {src === "json" ? (
                        <FileJson className="h-4 w-4" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      {src === "json" ? "Paste JSON" : "From link(s)"}
                    </button>
                  ))}
                </div>
              )}

              {kind === "vocabulary" && (
                <div className="space-y-1.5">
                  <Label>CEFR level *</Label>
                  <Select value={vocabLevel} onValueChange={setVocabLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose level for this deck" />
                    </SelectTrigger>
                    <SelectContent>
                      {CEFR_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Applied when <code className="rounded bg-slate-100 px-1">level</code> is
                    omitted in the JSON. The deck appears under this level in Exercises →
                    Vocabulary.
                  </p>
                </div>
              )}

              {kind === "exercise" && (
                <div className="space-y-1.5">
                  <Label>Topic folder *</Label>
                  <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the folder for this exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t.slug} value={t.slug}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    The exercise is filed under this folder — no need to set{" "}
                    <code className="rounded bg-slate-100 px-1">topic</code> in the JSON.
                  </p>
                </div>
              )}

              {kind === "exercise" && exerciseSource === "url" ? (
                <>
                  <div className="space-y-2">
                    {urls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={url}
                          onChange={(e) => {
                            updateUrl(i, e.target.value)
                            if (error) setError(null)
                          }}
                          onPaste={(e) => handleUrlPaste(i, e)}
                          spellCheck={false}
                          inputMode="url"
                          placeholder="https://api.example.com/exercises/123"
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeUrl(i)}
                          aria-label="Remove link"
                          className="shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addUrl}
                      className="gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add link
                    </Button>
                  </div>

                  <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Each link is fetched with a GET request and its JSON response is saved into the
                    selected folder. <code className="rounded bg-slate-100 px-1">id</code> in the
                    response is used as the exercise slug. Tip: paste a whole array{" "}
                    <code className="rounded bg-slate-100 px-1">[&quot;url1&quot;, &quot;url2&quot;]</code>{" "}
                    into a field to add many links at once.
                  </p>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUrls([""])
                        setError(null)
                      }}
                      disabled={urls.every((u) => !u.trim())}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={importFromUrls}
                      loading={fetching}
                      className="gap-1.5 bg-[#C8102E] hover:bg-[#A00D25]"
                    >
                      <DownloadCloud className="h-4 w-4" />
                      Fetch &amp; save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Textarea
                    value={raw}
                    onChange={(e) => {
                      setRaw(e.target.value)
                      if (error) setError(null)
                    }}
                    spellCheck={false}
                    placeholder={`Paste ${active.label.toLowerCase()} JSON here…`}
                    className="min-h-[320px] font-mono text-xs leading-relaxed"
                  />

                  <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {active.hint}
                  </p>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRaw("")
                        setError(null)
                      }}
                      disabled={!raw}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      loading={saving}
                      className="gap-1.5 bg-[#C8102E] hover:bg-[#A00D25]"
                    >
                      <Save className="h-4 w-4" />
                      Validate &amp; save
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Example format</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExample((v) => !v)}
                    className="text-slate-500"
                  >
                    {showExample ? "Hide" : "Show"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyExample}
                    className="gap-1.5"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                This is the exact shape the uploader expects for a{" "}
                <span className="font-medium text-slate-700">{active.label.toLowerCase()}</span>.
                Wrap several in a <code className="rounded bg-slate-100 px-1">[ ... ]</code> array to
                add many at once.
              </p>
              {showExample && (
                <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
                  <code>{example}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function FolderList({
  topics,
  loading,
  onAddExercise,
}: {
  topics: TopicMeta[]
  loading: boolean
  onAddExercise: (slug: string) => void
}) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <div className="rounded-full bg-white p-3 shadow-sm">
          <Folder className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-900">No folders yet</p>
        <p className="text-xs text-slate-500">
          {loading ? "Loading…" : "Create your first topic folder on the left."}
        </p>
      </div>
    )
  }
  return (
    <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
      {topics.map((t) => (
        <div
          key={t.slug}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
            <p className="truncate text-[11px] text-slate-500">
              <code className="rounded bg-slate-100 px-1">{t.slug}</code>
              {t.levels ? ` · ${t.levels}` : ""}
              {` · ${t.exerciseCount} exercise${t.exerciseCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddExercise(t.slug)}
            className="shrink-0 gap-1.5"
          >
            Add exercise
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
