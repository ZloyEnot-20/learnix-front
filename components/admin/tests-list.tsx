"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  BookOpen,
  Clock,
  FileText,
  Headphones,
  Layers,
  Mic,
  PenTool,
  Search,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type TestType = "reading" | "listening" | "writing" | "speaking"

interface Test {
  testId: string
  title: string
  type: TestType
  partCount?: number
  totalTime: number
  createdAt: string
  description?: string
}

interface TestsListProps {
  onTestsChanged: () => void
}

const TYPE_META: Record<
  TestType,
  { label: string; icon: typeof BookOpen; color: string }
> = {
  reading: { label: "Reading", icon: BookOpen, color: "#c1bffd" },
  listening: { label: "Listening", icon: Headphones, color: "#ffcc3e" },
  writing: { label: "Writing", icon: PenTool, color: "#a7e237" },
  speaking: { label: "Speaking", icon: Mic, color: "#9fcffb" },
}

const FILTERS: Array<{ key: "all" | TestType; label: string }> = [
  { key: "all", label: "All" },
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
]

export default function TestsList({ onTestsChanged }: TestsListProps) {
  const { toast } = useToast()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | TestType>("all")
  const [pendingDelete, setPendingDelete] = useState<Test | null>(null)

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = () => {
    const savedTests = JSON.parse(localStorage.getItem("adminTests") || "{}")
    const testArray = Object.values(savedTests) as Test[]
    setTests(
      testArray.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    )
    setLoading(false)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    const savedTests = JSON.parse(localStorage.getItem("adminTests") || "{}")
    delete savedTests[pendingDelete.testId]
    localStorage.setItem("adminTests", JSON.stringify(savedTests))

    toast({
      title: "Test deleted",
      description: `"${pendingDelete.title}" has been removed`,
    })

    setPendingDelete(null)
    loadTests()
    onTestsChanged()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tests.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.testId.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [tests, search, filter])

  const counts = useMemo(() => {
    const c: Record<"all" | TestType, number> = {
      all: tests.length,
      reading: 0,
      listening: 0,
      writing: 0,
      speaking: 0,
    }
    for (const t of tests) c[t.type] += 1
    return c
  }, [tests])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading tests…
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Existing Tests</CardTitle>
              <CardDescription>
                View and manage all created tests ({tests.length})
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or ID…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key
              const count = counts[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">
                {tests.length === 0 ? "No tests created yet" : "No tests match your search"}
              </p>
              <p className="text-sm text-slate-500">
                {tests.length === 0
                  ? 'Go to "Add Test" to create your first test'
                  : "Try a different keyword or filter"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((test) => {
                const meta = TYPE_META[test.type]
                const Icon = meta.icon
                return (
                  <div
                    key={test.testId}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: meta.color }}
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="h-5 w-5 text-slate-900/80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {test.title}
                          </h3>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                          {test.testId}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {test.totalTime} min
                          </span>
                          {typeof test.partCount === "number" && (
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5" />
                              {test.partCount} parts
                            </span>
                          )}
                          <span className="text-slate-400">
                            {new Date(test.createdAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(test)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  This will permanently remove{" "}
                  <span className="font-semibold text-foreground">
                    {pendingDelete.title}
                  </span>
                  . This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
