"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  AtSign,
  ClipboardCopy,
  KeyRound,
  Phone,
  RefreshCw,
  Send,
  Ticket,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  botApi,
  studentsApi,
  type BotInvite,
  type BotSubscriber,
  type StudentClaim,
} from "@/lib/api"
import { useAdminData } from "@/lib/admin-data-context"

const TTL_OPTIONS = [
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
]

const STATUS_META: Record<BotInvite["status"], { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
  used: { label: "Used", cls: "bg-slate-100 text-slate-600" },
  expired: { label: "Expired", cls: "bg-rose-100 text-rose-700" },
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Small pill showing a contact value; click to copy it to the clipboard. */
function CopyChip({
  icon,
  value,
  onCopy,
}: {
  icon: ReactNode
  value: string
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Click to copy"
      className="group inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-sky-100 hover:text-sky-700"
    >
      <span className="shrink-0 text-slate-400 group-hover:text-sky-600">{icon}</span>
      <span className="truncate">{value}</span>
      <ClipboardCopy className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-sky-500" />
    </button>
  )
}

export default function TelegramBotSection() {
  const { toast } = useToast()
  const { students } = useAdminData()
  const [studentId, setStudentId] = useState<string>("")
  const [ttl, setTtl] = useState<string>("72")
  const [invites, setInvites] = useState<BotInvite[]>([])
  const [subscribers, setSubscribers] = useState<BotSubscriber[]>([])
  const [claims, setClaims] = useState<StudentClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState<BotInvite | null>(null)
  const [pendingRemove, setPendingRemove] = useState<BotSubscriber | null>(null)

  const studentName = useMemo(
    () => students.find((s) => s.id === studentId)?.name ?? "",
    [students, studentId],
  )

  const refresh = async (sid: string) => {
    if (!sid) {
      setInvites([])
      setSubscribers([])
      setClaims([])
      return
    }
    setLoading(true)
    try {
      const [inv, subs, cls] = await Promise.all([
        botApi.listInvites(sid),
        botApi.listSubscribers(sid),
        botApi.listClaims(sid),
      ])
      setInvites(inv)
      setSubscribers(subs)
      setClaims(cls)
    } catch (err) {
      toast({
        title: "Could not load bot data",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh(studentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const createInvite = async () => {
    if (!studentId) {
      toast({ title: "Pick a student first", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const invite = await botApi.createInvite(studentId, Number(ttl))
      setInvites((prev) => [invite, ...prev])
      toast({
        title: "Invite code generated",
        description: `Code ${invite.code} — share it with the parent.`,
      })
    } catch (err) {
      toast({
        title: "Could not generate invite",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const regenerateClaim = async () => {
    if (!studentId) {
      toast({ title: "Pick a student first", variant: "destructive" })
      return
    }
    setRegenerating(true)
    try {
      const res = await studentsApi.regenerateClaim(studentId)
      await refresh(studentId)
      toast({
        title: "New access code generated",
        description: `Code ${res.code} — the student enters it in the bot.`,
      })
    } catch (err) {
      toast({
        title: "Could not generate code",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRegenerating(false)
    }
  }

  const copyText = async (value: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: label })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }
  const copyCode = (code: string) => copyText(code, "Code copied")

  const confirmRevoke = async () => {
    if (!pendingRevoke) return
    const id = pendingRevoke.id
    setPendingRevoke(null)
    try {
      await botApi.revokeInvite(id)
      setInvites((prev) => prev.filter((i) => i.id !== id))
      toast({ title: "Invite revoked" })
    } catch (err) {
      toast({
        title: "Could not revoke",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmRemove = async () => {
    if (!pendingRemove) return
    const id = pendingRemove.id
    setPendingRemove(null)
    try {
      await botApi.removeSubscriber(id)
      setSubscribers((prev) => prev.filter((s) => s.id !== id))
      toast({ title: "Subscriber removed" })
    } catch (err) {
      toast({
        title: "Could not remove",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Telegram bot</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Generate one-time invite codes so parents can subscribe to a student&apos;s
              activity in the Telegram bot. Codes are single-use and expire automatically.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={students.length === 0 ? "No students yet" : "Pick a student"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valid for</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger className="sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={createInvite}
              loading={creating}
              disabled={!studentId}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700"
            >
              <Ticket className="h-4 w-4" />
              Generate code
            </Button>
          </div>
          {studentName && (
            <p className="text-xs text-slate-500">
              Tell the parent to open the bot, press <b>Start</b>, and send the code.
            </p>
          )}
        </CardContent>
      </Card>

      {!studentId ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <KeyRound className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 font-medium text-slate-900">Pick a student</p>
          <p className="text-sm text-slate-500">
            Choose a student to manage their invite codes and subscribers.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
        {/* Student access codes */}
        <Card className="border-slate-200">
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Student access codes
                  <span className="ml-1.5 text-slate-400">({claims.length})</span>
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateClaim}
                loading={regenerating}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New code
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              A 6-digit one-time code the student enters in the bot to receive their
              login and password. Generating a new code resets the student&apos;s password.
            </p>
            {loading && claims.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : claims.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No access codes yet — generate one above.
              </p>
            ) : (
              <ul className="space-y-2">
                {claims.map((c) => {
                  const meta = STATUS_META[c.status]
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <code className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm font-bold tracking-[0.25em] text-white">
                        {c.code}
                      </code>
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            meta.cls,
                          )}
                        >
                          {meta.label}
                        </span>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {c.status === "used"
                            ? `Used ${formatDate(c.usedAt)}`
                            : `Expires ${formatDate(c.expiresAt)}`}
                        </p>
                      </div>
                      {c.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyCode(c.code)}
                          aria-label="Copy code"
                          className="h-8 w-8 text-slate-400 hover:text-slate-900"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Invites */}
          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Invite codes
                  <span className="ml-1.5 text-slate-400">({invites.length})</span>
                </h3>
              </div>
              {loading && invites.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
              ) : invites.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No codes yet — generate one above.
                </p>
              ) : (
                <ul className="space-y-2">
                  {invites.map((inv) => {
                    const meta = STATUS_META[inv.status]
                    return (
                      <li
                        key={inv.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <code className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-white">
                          {inv.code}
                        </code>
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              meta.cls,
                            )}
                          >
                            {meta.label}
                          </span>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {inv.status === "used"
                              ? `Used ${formatDate(inv.usedAt)}${inv.parentName ? ` · ${inv.parentName}` : ""}`
                              : `Expires ${formatDate(inv.expiresAt)}`}
                          </p>
                        </div>
                        {inv.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(inv.code)}
                            aria-label="Copy code"
                            className="h-8 w-8 text-slate-400 hover:text-slate-900"
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingRevoke(inv)}
                          aria-label="Revoke code"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Subscribers */}
          <Card className="border-slate-200">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Subscribed parents
                  <span className="ml-1.5 text-slate-400">({subscribers.length})</span>
                </h3>
              </div>
              {subscribers.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No parents subscribed yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {subscribers.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          <p className="truncate text-sm font-medium text-slate-900">
                            {sub.parentName || "Parent"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Since {formatDate(sub.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sub.phone ? (
                            <CopyChip
                              icon={<Phone className="h-3 w-3" />}
                              value={sub.phone}
                              onCopy={() => copyText(sub.phone!, "Phone copied")}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-400">
                              <Phone className="h-3 w-3" />
                              No phone shared
                            </span>
                          )}
                          {sub.username && (
                            <CopyChip
                              icon={<AtSign className="h-3 w-3" />}
                              value={sub.username}
                              onCopy={() => copyText(sub.username!, "Username copied")}
                            />
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingRemove(sub)}
                        aria-label="Remove subscriber"
                        className="h-8 w-8 shrink-0 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      <AlertDialog open={!!pendingRevoke} onOpenChange={(o) => !o && setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invite code?</AlertDialogTitle>
            <AlertDialogDescription>
              The code <b>{pendingRevoke?.code}</b> will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove?.parentName || "This parent"} will stop receiving updates about the
              student in Telegram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
