"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  ClipboardCopy,
  FileJson,
  FilePlus2,
  FileText,
  FolderPlus,
  ListChecks,
  Save,
  Sparkles,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  CONTENT_EXAMPLES,
  parseContent,
  saveContent,
  type ContentKind,
} from "@/lib/manage-content"

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
    id: "exercise",
    label: "Questions / Exercise",
    icon: ListChecks,
    blurb:
      "Add a grammar or vocabulary exercise with its questions. New topics appear automatically.",
    hint: "Required: slug, title, topic, type, content.questions (or content.pairs for matching).",
  },
  {
    id: "topic",
    label: "Topic folder",
    icon: FolderPlus,
    blurb: "Create an empty topic folder that you can later fill with exercises.",
    hint: "Required: slug, title. Optional: description, levels, counts.",
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

interface ManageContentSectionProps {
  /** Called after a successful save so the shell can refresh badges/counts. */
  onChanged?: () => void
}

export default function ManageContentSection({ onChanged }: ManageContentSectionProps) {
  const { toast } = useToast()
  const [kind, setKind] = useState<ContentKind>("exercise")
  const [raw, setRaw] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showExample, setShowExample] = useState(true)

  const active = useMemo(() => KINDS.find((k) => k.id === kind)!, [kind])
  const example = CONTENT_EXAMPLES[kind]

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
    setRaw(example)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    if (!raw.trim()) {
      setError("Paste some JSON first.")
      return
    }
    const parsed = parseContent(kind, raw)
    if (!parsed.ok) {
      setError(parsed.error ?? "Validation failed.")
      return
    }
    setSaving(true)
    try {
      const count = await saveContent(kind, parsed.items)
      toast({
        title: "Saved",
        description: `${count} ${active.label.toLowerCase()} item${count === 1 ? "" : "s"} added.`,
      })
      setRaw("")
      onChanged?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again."
      setError(msg)
      toast({ title: "Could not save", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
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
              Upload new questions, topics, tests and vocabulary as JSON. Paste a single
              object or an array of objects.
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <active.icon className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">{active.label}</h3>
              </div>
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
            </div>
            <p className="text-xs text-slate-500">{active.blurb}</p>

            <Textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                if (error) setError(null)
              }}
              spellCheck={false}
              placeholder={`Paste ${active.label.toLowerCase()} JSON here…`}
              className="min-h-[340px] font-mono text-xs leading-relaxed"
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
    </div>
  )
}
