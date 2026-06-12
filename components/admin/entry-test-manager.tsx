"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  ListChecks,
  PenTool,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react"

import { useAdminData } from "@/lib/admin-data-context"
import { TableSkeleton } from "./skeletons"
import { entryTestApi, authApi } from "@/lib/api"
import { invalidateStudents } from "@/lib/admin-cache"
import type {
  EntryTestStatus,
  EntryTestSubmission,
} from "@/lib/entry-test-storage"
import {
  CEFR_LEVELS,
  ENTRY_MC_TOTAL,
  ENTRY_READING_TOTAL,
  ENTRY_WRITING_PROMPT,
  MC_CRITERIA,
  READING_CRITERIA,
} from "@/lib/entry-test-content"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"
import { formatPhoneDisplay, isValidPhone, normalizePhone, emptyUzPhoneDisplay } from "@/lib/phone"
import { UzbekPhoneInput } from "@/components/ui/uzbek-phone-input"

const STATUS_META: Record<EntryTestStatus, { label: string; cls: string }> = {
  assigned: { label: "Assigned", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  awaiting_review: { label: "Needs grading", cls: "bg-violet-100 text-violet-800" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800" },
}

export default function EntryTestManager({
  createdByName: _createdByName,
}: {
  createdByName: string
}) {
  const { toast } = useToast()
  const { refreshAll } = useAdminData()
  const [tests, setTests] = useState<EntryTestSubmission[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ name: "", phone: emptyUzPhoneDisplay() })
  const [confirmation, setConfirmation] = useState<{ login: string; code: string } | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<EntryTestSubmission | null>(null)
  const [deleting, setDeleting] = useState(false)

  const publicStartUrl =
    typeof window !== "undefined" && orgId
      ? `${window.location.origin}/entry-test/start?org=${encodeURIComponent(orgId)}`
      : "/entry-test/start"

  const refresh = async () => {
    try {
      setTests(await entryTestApi.list("phone"))
    } catch {
      toast({
        title: "Failed to load entry tests",
        description: "Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    void authApi.me().then(({ user }) => setOrgId(user.orgId ?? null)).catch(() => {})
  }, [])

  const selected = useMemo(
    () => tests.find((t) => t.id === selectedId) ?? null,
    [tests, selectedId],
  )

  const resetAssignForm = () => {
    setAssignForm({ name: "", phone: emptyUzPhoneDisplay() })
    setConfirmation(null)
  }

  const assign = async () => {
    const name = assignForm.name.trim()
    const normalizedPhone = normalizePhone(assignForm.phone)
    if (!name) {
      toast({ title: "Name is required", variant: "warning" })
      return
    }
    if (!isValidPhone(normalizedPhone)) {
      toast({
        title: "Enter a valid Uzbekistan phone number",
        description: "Format: +998 XX XXX XX XX",
        variant: "warning",
      })
      return
    }
    if (tests.some((t) => t.phone === normalizedPhone)) {
      toast({
        title: "Phone number already registered",
        description: "This number is already assigned to an entry test candidate.",
        variant: "warning",
      })
      return
    }
    setAssigning(true)
    try {
      const res = await entryTestApi.registerCandidate({ name, phone: normalizedPhone })
      setConfirmation(res.confirmation)
      toast({
        title: "Entry test assigned",
        description: `${res.student.name} · ${res.group.name} group`,
      })
      invalidateStudents()
      await Promise.all([refresh(), refreshAll(true)])
    } catch (err) {
      toast({
        title: "Could not assign",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicStartUrl)
      toast({ title: "Link copied" })
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" })
    }
  }

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await entryTestApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refresh()
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const counts = useMemo(() => {
    return {
      total: tests.length,
      review: tests.filter((t) => t.status === "awaiting_review").length,
      graded: tests.filter((t) => t.status === "graded").length,
    }
  }, [tests])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entry Test</CardTitle>
          <CardDescription>
            Create a candidate, assign the test, and add them to the ENTRY TEST group. The candidate
            takes the test via the link below by entering their phone number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 text-sm">
            <span className="truncate font-mono text-xs text-slate-600">{publicStartUrl}</span>
            <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-1.5 shrink-0">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
              <a href={publicStartUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                {counts.total} candidates
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">
                {counts.review} awaiting review
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
                {counts.graded} graded
              </span>
            </div>
            <Button
              onClick={() => {
                resetAssignForm()
                setShowAssign(true)
              }}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Assign entry test
            </Button>
          </div>

          <EntryTestTable
            tests={tests}
            loading={loading}
            showPhone
            onSelect={setSelectedId}
            onDelete={setPendingDelete}
          />
        </CardContent>
      </Card>

      <Dialog
        open={showAssign}
        onOpenChange={(open) => {
          setShowAssign(open)
          if (!open) resetAssignForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {confirmation ? (
            <>
              <DialogHeader>
                <DialogTitle>Candidate created</DialogTitle>
                <DialogDescription>
                  The student was added to the ENTRY TEST group. Share the login code for the Telegram bot.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Login</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-semibold">{confirmation.login}</code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(confirmation.login, "Login")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Confirmation code</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-lg font-bold tracking-widest">
                      {confirmation.code}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(confirmation.code, "Code")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                <Button
                  onClick={() => {
                    setShowAssign(false)
                    resetAssignForm()
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Assign entry test</DialogTitle>
                <DialogDescription>
                  Enter the candidate&apos;s name and phone number. An account will be created, the test
                  assigned, and the student added to the ENTRY TEST group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="et-name">Name *</Label>
                  <Input
                    id="et-name"
                    value={assignForm.name}
                    onChange={(e) => setAssignForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ali Valiyev"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="et-phone">Phone *</Label>
                  <UzbekPhoneInput
                    id="et-phone"
                    value={assignForm.phone}
                    onChange={(phone) => setAssignForm((f) => ({ ...f, phone }))}
                  />
                  <p className="text-xs text-slate-500">Uzbekistan format · +998 is fixed</p>
                </div>
              </div>
              <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                <Button onClick={assign} loading={assigning} className="bg-primary hover:bg-primary/90">
                  Assign test
                </Button>
                <Button variant="outline" onClick={() => setShowAssign(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail / grading dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0">
          {selected && (
            <EntryTestDetail
              test={selected}
              onGraded={() => {
                refresh()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this entry test?"
        description={
          pendingDelete && (
            <>
              This will permanently remove the entry test for{" "}
              <span className="font-semibold text-foreground">{pendingDelete.studentName}</span>.
            </>
          )
        }
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  )
}

function EntryTestTable({
  tests,
  loading,
  showPhone = false,
  onSelect,
  onDelete,
}: {
  tests: EntryTestSubmission[]
  loading: boolean
  showPhone?: boolean
  onSelect: (id: string) => void
  onDelete: (test: EntryTestSubmission) => void
}) {
  if (loading && tests.length === 0) {
    return <TableSkeleton rows={5} columns={showPhone ? 7 : 6} />
  }
  if (tests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        {showPhone ? "No phone candidates yet." : "No entry tests assigned yet."}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="py-3 px-3 font-semibold">{showPhone ? "Candidate" : "Student"}</th>
            {showPhone && <th className="py-3 px-3 font-semibold">Phone</th>}
            <th className="py-3 px-3 font-semibold">Status</th>
            <th className="py-3 px-3 font-semibold">Grammar</th>
            <th className="py-3 px-3 font-semibold">Reading</th>
            <th className="py-3 px-3 font-semibold">Writing</th>
            <th className="py-3 px-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t, idx) => {
            const meta = STATUS_META[t.status]
            return (
              <tr
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "h-14 cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-200/50",
                  idx % 2 === 1 ? "bg-slate-100/70" : "bg-white",
                )}
              >
                <td className="py-3 px-3 font-medium text-slate-900">{t.studentName}</td>
                {showPhone && (
                  <td className="py-3 px-3 font-mono text-xs text-slate-600">
                    {t.phone ? formatPhoneDisplay(t.phone) : "—"}
                  </td>
                )}
                <td className="py-3 px-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      meta.cls,
                    )}
                  >
                    {meta.label}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-700">
                  {t.mcCompleted ? (
                    `${t.mcScore}/${ENTRY_MC_TOTAL} · ${t.mcLevel}`
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-700">
                  {t.readingCompleted ? (
                    `${t.readingScore}/${ENTRY_READING_TOTAL} · ${t.readingLevel}`
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-700">
                  {t.writingLevel != null ? (
                    <span className="font-semibold text-emerald-700">{t.writingLevel}</span>
                  ) : t.writingSubmitted ? (
                    <span className="text-violet-700">Needs grading</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(t)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EntryTestDetail({
  test,
  onGraded,
}: {
  test: EntryTestSubmission
  onGraded: () => void
}) {
  const { toast } = useToast()
  const [level, setLevel] = useState(test.writingLevel ?? "")
  const [overallLevel, setOverallLevel] = useState(test.overallLevel ?? "")
  const [feedback, setFeedback] = useState(test.writingFeedback ?? "")

  const [saving, setSaving] = useState(false)
  const submitGrade = async () => {
    if (!level) {
      toast({ title: "Pick a writing level", variant: "warning" })
      return
    }
    if (!overallLevel) {
      toast({ title: "Overall level is required", variant: "warning" })
      return
    }
    setSaving(true)
    try {
      await entryTestApi.grade(test.id, level, overallLevel, feedback)
      toast({ title: "Entry test graded", description: `${test.studentName} · ${overallLevel}` })
      onGraded()
    } catch (err) {
      toast({
        title: "Could not save grade",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
        <DialogTitle className="text-xl text-left">{test.studentName}</DialogTitle>
        <DialogDescription className="text-left">
          {test.phone && (
            <span className="mr-2 font-mono">{formatPhoneDisplay(test.phone)}</span>
          )}
          Assigned by {test.assignedBy} · {new Date(test.assignedAt).toLocaleDateString()}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-4">
          {/* Auto-scored sections */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultBox
              icon={ListChecks}
              title="Grammar (MC)"
              done={test.mcCompleted}
              detail={
                test.mcCompleted
                  ? `${test.mcScore}/${ENTRY_MC_TOTAL} correct`
                  : "Not completed"
              }
              level={test.mcLevel}
              criteria={MC_CRITERIA}
            />
            <ResultBox
              icon={BookOpen}
              title="Reading"
              done={test.readingCompleted}
              detail={
                test.readingCompleted
                  ? `${test.readingScore}/${ENTRY_READING_TOTAL} correct`
                  : "Not completed"
              }
              level={test.readingLevel}
              criteria={READING_CRITERIA}
            />
          </div>

          {/* Writing */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Writing</h3>
              {test.writingWordCount != null && (
                <span className="text-xs text-slate-500">· {test.writingWordCount} words</span>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                {ENTRY_WRITING_PROMPT.title}
              </p>
              <p className="mt-0.5 text-sm text-slate-700">{ENTRY_WRITING_PROMPT.prompt}</p>
            </div>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Student&apos;s answer
            </p>
            {test.writingText.trim() ? (
              <div className="mt-3 max-h-56 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {test.writingText}
              </div>
            ) : (
              <p className="mt-3 text-sm italic text-slate-400">No writing submitted yet.</p>
            )}

            {test.writingSubmitted ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500">Writing level</label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="A1 – B2+" />
                    </SelectTrigger>
                    <SelectContent>
                      {CEFR_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-500">Feedback</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional notes for the student"
                    className="mt-1 min-h-[60px]"
                  />
                </div>
              </div>
            ) : (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <ClipboardList className="h-3.5 w-3.5" />
                Waiting for the student to submit their writing.
              </p>
            )}
          </div>

          {/* Overall level hint — final placement, separate from sections */}
          {test.writingSubmitted && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span>
                Set the <strong>Overall level</strong> in the bar below based on the Grammar,
                Reading and Writing results. This is what the student will see as their final
                placement.
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {test.writingSubmitted && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-56">
            <label className="text-sm font-bold text-slate-900">Overall level</label>
            <Select value={overallLevel} onValueChange={setOverallLevel}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Required · A1 – B2+" />
              </SelectTrigger>
              <SelectContent side="top" sideOffset={4} className="z-[100]">
                {CEFR_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submitGrade} loading={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {test.overallLevel != null ? "Update grade" : "Save grade"}
          </Button>
        </div>
      )}
    </>
  )
}

function ResultBox({
  icon: Icon,
  title,
  done,
  detail,
  level,
  criteria,
}: {
  icon: typeof ListChecks
  title: string
  done: boolean
  detail: string
  level?: string
  criteria?: { range: string; level: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-700">{detail}</p>
      {done && level && (
        <span className="mt-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">
          {level}
        </span>
      )}

      {criteria && criteria.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
          >
            Scoring criteria
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <ul className="mt-2 space-y-1">
                {criteria.map((c) => (
                  <li
                    key={c.range}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1 text-xs",
                      done && level === c.level
                        ? "bg-sky-50 font-semibold text-sky-800"
                        : "text-slate-600",
                    )}
                  >
                    <span className="tabular-nums text-slate-500">{c.range}</span>
                    <span>{c.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
