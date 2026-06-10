"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  ScrollText,
  Search,
  User,
} from "lucide-react"
import { auditApi, type AuditLogEntry } from "@/lib/api"
import { TableSkeleton } from "./skeletons"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const CATEGORY_META: Record<string, { label: string; cls: string }> = {
  auth: { label: "Sign-in", cls: "border-sky-200 bg-sky-50 text-sky-800" },
  users: { label: "Staff", cls: "border-rose-200 bg-rose-50 text-rose-800" },
  students: { label: "Students", cls: "border-violet-200 bg-violet-50 text-violet-800" },
  groups: { label: "Groups", cls: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  homework: { label: "Homework", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  control_works: { label: "Progress test", cls: "border-teal-200 bg-teal-50 text-teal-800" },
  exercises: { label: "Content", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  payments: { label: "Finance", cls: "border-lime-200 bg-lime-50 text-lime-800" },
  system: { label: "System", cls: "border-slate-200 bg-slate-50 text-slate-700" },
}

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  reset_password: "Reset password",
  regenerate_claim: "New login code",
  add_member: "Added to group",
  remove_member: "Removed from group",
  import_catalog: "Imported exercises",
  import_vocab: "Imported vocabulary",
  mark_paid: "Marked paid",
  mark_unpaid: "Unmarked payment",
}

type AuditDetails = Record<string, unknown>

function categoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      label: category.replace(/_/g, " "),
      cls: "border-slate-200 bg-slate-50 text-slate-700",
    }
  )
}

function roleLabel(role: string | null): string {
  if (role === "super_admin") return "Super Admin"
  if (role === "admin") return "Admin"
  if (role === "teacher") return "Teacher"
  if (role === "student") return "Student"
  return role ?? "—"
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ")
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null
}

function groupChange(d: AuditDetails | null) {
  const gc = d?.groupChange
  if (!gc || typeof gc !== "object") return null
  return gc as Record<string, unknown>
}

/** Human-readable description shown in the list. */
function describeEvent(log: AuditLogEntry): string {
  const who = log.actorName
  const what = log.targetLabel
  const d = log.details

  switch (`${log.category}.${log.action}`) {
    case "auth.login":
      return `${who} signed in`
    case "users.create":
      return `${who} added staff member ${what ?? "someone new"}`
    case "users.update":
      return `${who} changed ${what ?? "a staff member"}'s details`
    case "users.delete":
      return `${who} removed staff member ${what ?? "someone"}`
    case "users.reset_password":
      return `${who} reset the password for ${what ?? "a staff member"}`
    case "students.create": {
      const group = str(d?.groupName)
      return group
        ? `${who} added student ${what} to group «${group}»`
        : `${who} added student ${what ?? "someone new"}`
    }
    case "students.update": {
      const gc = groupChange(d)
      if (gc) {
        const from = str(gc.fromGroupName)
        const to = str(gc.toGroupName)
        if (from && to) return `${who} moved student ${what} from «${from}» to «${to}»`
        if (to) return `${who} added student ${what} to group «${to}»`
        if (from) return `${who} removed student ${what} from group «${from}»`
      }
      return `${who} updated student ${what ?? "profile"}`
    }
    case "students.delete": {
      const group = str(d?.groupName)
      return group
        ? `${who} removed student ${what} from group «${group}»`
        : `${who} removed student ${what ?? "someone"}`
    }
    case "students.regenerate_claim":
      return `${who} issued a new login code for ${what ?? "a student"}`
    case "groups.create":
      return `${who} created group «${what ?? "new group"}»`
    case "groups.update":
      return `${who} updated group «${what ?? "a group"}»`
    case "groups.delete":
      return `${who} deleted group «${what ?? "a group"}»`
    case "groups.add_member": {
      const student = str(d?.studentName)
      const group = str(d?.groupName) ?? what
      return student && group
        ? `${who} added student ${student} to group «${group}»`
        : `${who} added a student to group «${group ?? "unknown"}»`
    }
    case "groups.remove_member": {
      const student = str(d?.studentName)
      const group = str(d?.groupName) ?? what
      return student && group
        ? `${who} removed student ${student} from group «${group}»`
        : `${who} removed a student from group «${group ?? "unknown"}»`
    }
    case "homework.create": {
      const group = str(d?.groupName)
      const subject = str(d?.subject)
      const parts = [`${who} assigned homework «${what ?? "new task"}»`]
      if (group) parts.push(`to group «${group}»`)
      if (subject) parts.push(`(${subject})`)
      return parts.join(" ")
    }
    case "homework.delete":
      return `${who} deleted homework «${what ?? "a task"}»`
    case "control_works.create": {
      const group = str(d?.groupName)
      const steps = num(d?.stepCount)
      const parts = [`${who} created progress test «${what ?? "new test"}»`]
      if (group) parts.push(`for group «${group}»`)
      if (steps != null) parts.push(`— ${steps} section${steps === 1 ? "" : "s"}`)
      return parts.join(" ")
    }
    case "control_works.delete":
      return `${who} deleted progress test «${what ?? "a test"}»`
    case "payments.create": {
      const student = str(d?.studentName)
      const group = str(d?.groupName)
      const amount = num(d?.amount) ?? (what ? Number(what) : null)
      const parts = [`${who} recorded a payment`]
      if (amount != null && !Number.isNaN(amount)) parts.push(`of ${amount}`)
      if (student) parts.push(`for ${student}`)
      if (group) parts.push(`(${group})`)
      return parts.join(" ")
    }
    case "payments.update":
      return `${who} updated a payment record`
    case "payments.mark_paid": {
      const student = str(d?.studentName)
      const group = str(d?.groupName)
      const amount = num(d?.amount) ?? (what ? Number(what) : null)
      const period = str(d?.periodLabel)
      const parts = [`${who} marked payment as paid`]
      if (amount != null && !Number.isNaN(amount)) parts.push(`(${amount})`)
      if (student) parts.push(`for ${student}`)
      if (group) parts.push(`— ${group}`)
      if (period) parts.push(`[${period}]`)
      return parts.join(" ")
    }
    case "payments.mark_unpaid": {
      const student = str(d?.studentName)
      const group = str(d?.groupName)
      const amount = num(d?.amount) ?? (what ? Number(what) : null)
      const period = str(d?.periodLabel)
      const parts = [`${who} unmarked payment`]
      if (amount != null && !Number.isNaN(amount)) parts.push(`(${amount})`)
      if (student) parts.push(`for ${student}`)
      if (group) parts.push(`— ${group}`)
      if (period) parts.push(`[${period}]`)
      return parts.join(" ")
    }
    case "payments.delete":
      return `${who} deleted a payment record`
    case "exercises.import_catalog":
      return `${who} imported exercise content${what ? `: ${what}` : ""}`
    case "exercises.import_vocab":
      return `${who} imported vocabulary${what ? `: ${what}` : ""}`
    default:
      return `${who} — ${formatAction(log.action).toLowerCase()}${what ? `: ${what}` : ""}`
  }
}

function formatDetailsJson(details: Record<string, unknown> | null): string {
  if (!details) return "—"
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

export default function AuditSection() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [category, setCategory] = useState("all")
  const [action, setAction] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  const load = useCallback(
    async (opts?: { forceToast?: boolean; pageOverride?: number }) => {
      const currentPage = opts?.pageOverride ?? page
      try {
        const res = await auditApi.list({
          page: currentPage,
          limit: 50,
          category: category !== "all" ? category : undefined,
          action: action !== "all" ? action : undefined,
          search: search || undefined,
        })
        setLogs(res.items)
        setTotal(res.total)
        setPages(res.pages)
        setPage(res.page)
        if (opts?.forceToast) toast({ title: "Activity log refreshed" })
      } catch {
        toast({
          title: "Failed to load activity log",
          description: "Check your connection and try again.",
          variant: "destructive",
        })
      }
    },
    [page, category, action, search, toast],
  )

  useEffect(() => {
    auditApi.meta().then((m) => {
      setCategories(m.categories)
      setActions(m.actions)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load({ forceToast: true })
    setRefreshing(false)
  }

  const applySearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length
    const uniqueActors = new Set(logs.map((l) => l.actorId).filter(Boolean)).size
    return { todayCount, uniqueActors }
  }, [logs])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ScrollText} label="All events" value={total} />
        <StatCard icon={Clock} label="On this page" value={logs.length} />
        <StatCard icon={User} label="People involved" value={stats.uniqueActors} />
        <StatCard icon={Clock} label="Today" value={stats.todayCount} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryMeta(c).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {formatAction(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={applySearch}>
            Search
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <ScrollText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-900">No activity yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Actions by staff will show up here as they use the platform.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Who</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">What happened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const cat = categoryMeta(log.category)
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.actorName}</div>
                        <div className="text-xs text-slate-500">{roleLabel(log.actorType)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-[11px]", cat.cls)}>
                          {cat.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{describeEvent(log)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {page} of {pages} · {total} events
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => load({ pageOverride: page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => load({ pageOverride: page + 1 })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AuditDetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLogEntry | null
  onClose: () => void
}) {
  if (!log) return null

  const meta = categoryMeta(log.category)

  return (
    <Dialog open={Boolean(log)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{describeEvent(log)}</DialogTitle>
          <DialogDescription>{formatDate(log.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <DetailSection title="Summary">
            <DetailRow label="Area" value={meta.label} />
            <DetailRow label="Action" value={formatAction(log.action)} />
          </DetailSection>

          <DetailSection title="Who">
            <DetailRow label="Name" value={log.actorName} />
            <DetailRow label="Role" value={roleLabel(log.actorType)} />
            {log.actorId && <DetailRow label="User ID" value={log.actorId} mono />}
          </DetailSection>

          {(log.targetType || log.targetId || log.targetLabel) && (
            <DetailSection title="Subject">
              {log.targetLabel && <DetailRow label="Name" value={log.targetLabel} />}
              {log.targetType && <DetailRow label="Type" value={log.targetType} />}
              {log.targetId && <DetailRow label="ID" value={log.targetId} mono />}
            </DetailSection>
          )}

          <DetailSection title="Technical">
            <DetailRow label="Event ID" value={log.id} mono />
            <DetailRow label="Category" value={log.category} mono />
            <DetailRow label="Action code" value={log.action} mono />
            {log.ipAddress && <DetailRow label="IP address" value={log.ipAddress} mono />}
            {log.userAgent && <DetailRow label="Browser / device" value={log.userAgent} />}
          </DetailSection>

          {log.details && Object.keys(log.details).length > 0 && (
            <DetailSection title="Raw data">
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-700">
                {formatDetailsJson(log.details)}
              </pre>
            </DetailSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">{children}</div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className={cn("min-w-0 break-all text-slate-900", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ScrollText
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
