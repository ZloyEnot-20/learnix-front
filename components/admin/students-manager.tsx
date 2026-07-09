"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Copy,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserMinus,
  Users,
  Wallet,
  X,
} from "lucide-react"
import type { Group, Student } from "@/lib/admin-storage"
import { studentMonthlyFee } from "@/lib/admin-storage"
import {
  studentsApi,
  type StudentIeltsSummary,
  type StudentLanguageProfileSummary,
} from "@/lib/api"
import { invalidateStudents } from "@/lib/admin-cache"
import { useAdminData } from "@/lib/admin-data-context"
import { StatCardsSkeleton, TableSkeleton } from "./skeletons"
import { StudentDetailModal } from "./student-detail-modal"
import { ReadinessBadge } from "./student-ielts-profile-section"
import { useToast } from "@/hooks/use-toast"
import { cn, formatMoney, formatLastLogin } from "@/lib/utils"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  ENTRY_TEST_GROUP_NAME,
  findEntryTestGroupId,
  selectableGroups,
} from "@/lib/entry-test-group"

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
}

interface StudentsManagerProps {
  onChanged?: () => void
}

export default function StudentsManager({ onChanged }: StudentsManagerProps) {
  const { toast } = useToast()
  const { students, groups, ready, refreshAll, refreshStudents } = useAdminData()
  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [creating, setCreating] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [ieltsSummaries, setIeltsSummaries] = useState<StudentIeltsSummary[]>([])
  const [languageSummaries, setLanguageSummaries] = useState<StudentLanguageProfileSummary[]>(
    [],
  )

  useEffect(() => {
    if (!ready) return
    Promise.all([studentsApi.ieltsSummaries(), studentsApi.languageProfileSummaries()])
      .then(([ielts, lang]) => {
        setIeltsSummaries(ielts)
        setLanguageSummaries(lang)
      })
      .catch(() => {
        setIeltsSummaries([])
        setLanguageSummaries([])
      })
  }, [ready, students.length])

  const ieltsByStudent = useMemo(() => {
    const map = new Map<string, StudentIeltsSummary>()
    for (const row of ieltsSummaries) map.set(row.studentId, row)
    return map
  }, [ieltsSummaries])

  const languageByStudent = useMemo(() => {
    const map = new Map<string, StudentLanguageProfileSummary>()
    for (const row of languageSummaries) map.set(row.studentId, row)
    return map
  }, [languageSummaries])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      invalidateStudents()
      await refreshAll(true)
      const [ielts, lang] = await Promise.all([
        studentsApi.ieltsSummaries(),
        studentsApi.languageProfileSummaries(),
      ])
      setIeltsSummaries(ielts)
      setLanguageSummaries(lang)
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not refresh students",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    login: "",
    email: "",
    phone: "",
    groupId: "",
    notes: "",
  })
  const [loginSuggestions, setLoginSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [confirmation, setConfirmation] = useState<{ login: string; code: string } | null>(null)

  useEffect(() => {
    const name = buildFullName(form.firstName, form.lastName)
    if (name.length < 2) {
      setLoginSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const suggestions = await studentsApi.loginSuggestions(name)
        setLoginSuggestions(suggestions)
      } catch {
        setLoginSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.firstName, form.lastName])

  const resetCreateForm = () => {
    setForm({ firstName: "", lastName: "", login: "", email: "", phone: "", groupId: "", notes: "" })
    setLoginSuggestions([])
    setConfirmation(null)
  }

  const selectedGroup = useMemo(
    () => (form.groupId ? groups.find((g) => g.id === form.groupId) : undefined),
    [form.groupId, groups],
  )
  const selectedGroupFee =
    typeof selectedGroup?.monthlyFee === "number" ? selectedGroup.monthlyFee : null

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (groupFilter !== "all" && String(s.groupId ?? "none") !== groupFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.login.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [students, search, groupFilter])

  const entryTestGroupId = useMemo(() => findEntryTestGroupId(groups), [groups])
  const filterGroups = useMemo(() => selectableGroups(groups), [groups])

  const entryTestStudents = useMemo(() => {
    if (!entryTestGroupId) return []
    if (groupFilter !== "all" && groupFilter !== entryTestGroupId) return []
    return filtered
      .filter((s) => s.groupId != null && String(s.groupId) === entryTestGroupId)
      .sort((a, b) => {
        const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
        const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
        return bTime - aTime
      })
  }, [filtered, entryTestGroupId, groupFilter])

  const regularStudents = useMemo(() => {
    const sortByLastLogin = (list: Student[]) =>
      [...list].sort((a, b) => {
        const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0
        const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0
        return bTime - aTime
      })

    if (groupFilter === entryTestGroupId && entryTestGroupId) return []
    if (!entryTestGroupId) return sortByLastLogin(filtered)
    if (groupFilter === "all") {
      return sortByLastLogin(
        filtered.filter((s) => String(s.groupId ?? "") !== entryTestGroupId),
      )
    }
    return sortByLastLogin(filtered)
  }, [filtered, entryTestGroupId, groupFilter])

  const submit = async () => {
    const fullName = buildFullName(form.firstName, form.lastName)
    if (!form.firstName.trim() || !form.lastName.trim() || !form.login.trim()) {
      toast({
        title: "Missing fields",
        description: "First name, last name, and login are required.",
        variant: "destructive",
      })
      return
    }
    const trimmedEmail = form.email.trim()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address or leave the field empty.",
        variant: "destructive",
      })
      return
    }
    setCreating(true)
    try {
      const res = await studentsApi.create({
        name: fullName,
        login: form.login.trim().toLowerCase(),
        ...(trimmedEmail ? { email: trimmedEmail.toLowerCase() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        groupId: form.groupId || undefined,
        notes: form.notes.trim() || undefined,
      })
      setConfirmation(res.confirmation)
      toast({ title: "Student added", description: fullName })
      invalidateStudents()
      await refreshAll(true)
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not add student",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const requestRemove = (id: string, name: string) => {
    setPendingRemove({ id, name })
  }

  const confirmRemove = async () => {
    if (!pendingRemove) return
    setRemovingId(pendingRemove.id)
    try {
      await studentsApi.remove(pendingRemove.id)
      invalidateStudents()
      setPendingRemove(null)
      await refreshAll(true)
      onChanged?.()
      toast({ title: "Student removed" })
    } catch (err) {
      toast({
        title: "Could not remove student",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const openDetail = (s: Student) => {
    setSelected(s)
    setShowDetail(true)
  }

  const totals = useMemo(() => {
    const inGroup = students.filter((s) => Boolean(s.groupId)).length
    const fees = students
      .map((s) => {
        const group = s.groupId ? groups.find((g) => g.id === s.groupId) : undefined
        return studentMonthlyFee(s, group)
      })
      .filter((f) => f > 0)
    const avgFee = fees.length
      ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length)
      : 0
    return {
      total: students.length,
      inGroup,
      unassigned: students.length - inGroup,
      avgFee,
    }
  }, [students, groups])

  const groupCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of students) {
      if (!s.groupId) continue
      map.set(s.groupId, (map.get(s.groupId) ?? 0) + 1)
    }
    return map
  }, [students])

  const loading = !ready && students.length === 0

  return (
    <>
      <div className="space-y-6">
        {loading ? (
          <StatCardsSkeleton count={4} />
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            icon={Users}
            label="Total students"
            value={totals.total.toString()}
            accent="bg-slate-100 text-slate-700"
          />
          <Stat
            icon={Layers}
            label="In groups"
            value={totals.inGroup.toString()}
            accent="bg-emerald-50 text-emerald-700"
          />
          <Stat
            icon={UserMinus}
            label="No group"
            value={totals.unassigned.toString()}
            accent={
              totals.unassigned > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-700"
            }
          />
          <Stat
            icon={Wallet}
            label="Avg fee / mo"
            value={totals.avgFee > 0 ? formatMoney(totals.avgFee) : "—"}
            accent="bg-blue-50 text-blue-700"
          />
        </div>
        )}

        {groups.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>By group</CardTitle>
                  <CardDescription>
                    Click a group to filter the table below
                  </CardDescription>
                </div>
                {groupFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGroupFilter("all")}
                    className="gap-1.5 text-xs"
                  >
                    <X className="h-3.5 w-3.5" />
                    Show all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filterGroups.map((g) => {
                  const count = groupCounts.get(g.id) ?? 0
                  const isSelected = groupFilter === g.id
                  const isDimmed = groupFilter !== "all" && !isSelected
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setGroupFilter(isSelected ? "all" : g.id)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-slate-900 bg-gradient-to-br from-slate-900/[0.04] to-slate-100/40 ring-2 ring-slate-900 ring-offset-2 shadow-md"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm",
                        isDimmed && "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {g.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 tabular-nums">
                          {count}
                        </span>
                      </div>
                      {typeof g.monthlyFee === "number" && g.monthlyFee > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatMoney(g.monthlyFee)}/mo per student
                        </p>
                      )}
                    </button>
                  )
                })}
                <button
                  type="button"
                  aria-pressed={groupFilter === "none"}
                  onClick={() =>
                    setGroupFilter(groupFilter === "none" ? "all" : "none")
                  }
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-dashed p-3 text-left transition-all",
                    groupFilter === "none"
                      ? "border-slate-900 bg-gradient-to-br from-slate-900/[0.04] to-slate-100/40 ring-2 ring-slate-900 ring-offset-2 shadow-md"
                      : "border-slate-300 bg-white hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm",
                    groupFilter !== "all" &&
                      groupFilter !== "none" &&
                      "opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      No group
                    </p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 tabular-nums">
                      {totals.unassigned}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Unassigned students
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>All students</CardTitle>
                <CardDescription>
                  {regularStudents.length} of {students.length} shown
                  {entryTestStudents.length > 0 && groupFilter === "all"
                    ? ` · ${entryTestStudents.length} in Entry Test`
                    : ""}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email…"
                    className="pl-9"
                  />
                </div>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    <SelectItem value="none">No group</SelectItem>
                    {filterGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  loading={refreshing}
                  aria-label="Refresh students"
                >
                  <RefreshCw className={cn("h-4 w-4", !refreshing && "mr-1.5")} />
                  {!refreshing && "Refresh"}
                </Button>
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add student
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <TableSkeleton rows={6} columns={6} />
            ) : regularStudents.length === 0 && entryTestStudents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <div className="rounded-full bg-white p-3 shadow-sm">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-medium text-slate-900">No students found</p>
                <p className="text-sm text-slate-500">
                  {students.length === 0
                    ? "Add your first student to get started."
                    : "Try changing the search or filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {entryTestStudents.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-sky-200 bg-sky-50/30">
                    <div className="border-b border-sky-200 px-4 py-3">
                      <p className="text-sm font-semibold text-sky-900">Entry Test candidates</p>
                      <p className="text-xs text-sky-700/80">
                        Students in the {ENTRY_TEST_GROUP_NAME} group
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-sky-100 text-left text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-3 font-semibold">Student</th>
                          <th className="py-3 px-3 font-semibold">Phone</th>
                          <th className="py-3 px-3 font-semibold">Last login</th>
                          <th className="py-3 px-3 font-semibold">Joined</th>
                          <th className="py-3 px-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryTestStudents.map((s) => (
                          <tr
                            key={s.id}
                            onClick={() => openDetail(s)}
                            className="cursor-pointer border-b border-sky-100/80 transition-colors hover:bg-sky-50/80"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-medium text-slate-900">{s.name}</p>
                                {s.isActive === false ? (
                                  <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                    Inactive
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-500">{s.login}</p>
                            </td>
                            <td className="py-3 px-3 text-slate-700">{s.phone || "—"}</td>
                            <td className="py-3 px-3 text-slate-600">
                              <span
                                title={
                                  s.lastLoginAt
                                    ? new Date(s.lastLoginAt).toLocaleString()
                                    : "Has not logged in yet"
                                }
                              >
                                {formatLastLogin(s.lastLoginAt)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {new Date(s.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => requestRemove(s.id, s.name)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {regularStudents.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3 font-semibold">Student</th>
                      <th className="py-3 px-3 font-semibold">Group</th>
                      <th className="py-3 px-3 font-semibold">Phone</th>
                      <th className="py-3 px-3 font-semibold">Monthly fee</th>
                      <th className="py-3 px-3 font-semibold">Est. band</th>
                      <th className="py-3 px-3 font-semibold">Readiness</th>
                      <th className="py-3 px-3 font-semibold">Last login</th>
                      <th className="py-3 px-3 font-semibold">Joined</th>
                      <th className="py-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularStudents.map((s) => {
                      const group = groups.find((g) => g.id === s.groupId)
                      const ielts = ieltsByStudent.get(s.id)
                      const language = languageByStudent.get(s.id)
                      return (
                        <tr
                          key={s.id}
                          onClick={() => openDetail(s)}
                          className={cn(
                            "border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50/70 focus-within:bg-slate-50",
                            s.isActive === false && "opacity-70",
                          )}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-xs font-bold text-white">
                                {initials(s.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate font-medium text-slate-900">
                                    {s.name}
                                  </p>
                                  {s.isActive === false ? (
                                    <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                      Inactive
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-xs text-slate-500">
                                  {s.login}
                                  {s.email ? ` · ${s.email}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {group ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {group.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400">
                                No group
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 tabular-nums">
                            {s.phone || "—"}
                          </td>
                          <td className="py-3 px-3 font-semibold tabular-nums text-slate-900">
                            {(() => {
                              const fee = studentMonthlyFee(s, group)
                              return fee > 0 ? formatMoney(fee) : "—"
                            })()}
                          </td>
                          <td className="py-3 px-3 font-semibold tabular-nums text-slate-900">
                            {language?.learnixLevel != null ? language.learnixLevel : "—"}
                          </td>
                          <td className="py-3 px-3">
                            {ielts ? (
                              <ReadinessBadge status={ielts.readinessStatus} />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 tabular-nums">
                            <span
                              title={
                                s.lastLoginAt
                                  ? new Date(s.lastLoginAt).toLocaleString()
                                  : "Has not logged in yet"
                              }
                            >
                              {formatLastLogin(s.lastLoginAt)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 tabular-nums">
                            {new Date(s.joinedAt).toLocaleDateString()}
                          </td>
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestRemove(s.id, s.name)}
                              loading={removingId === s.id}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              aria-label={`Delete ${s.name}`}
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
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent>
          {confirmation ? (
            <>
              <DialogHeader>
                <DialogTitle>Student created</DialogTitle>
                <DialogDescription>
                  Give the student this confirmation code. They enter it in the
                  Telegram bot and receive their login and password there.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Login</p>
                    <p className="truncate font-mono text-sm font-semibold text-slate-900">
                      {confirmation.login}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(confirmation.login, "Login")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Confirmation code
                    </p>
                    <p className="font-mono text-2xl font-bold tracking-[0.3em] text-slate-900">
                      {confirmation.code}
                    </p>
                  </div>
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
              <p className="px-1 text-xs text-slate-500">
                The student opens the bot, taps “I’m a student”, and sends this
                6-digit code to get their credentials. The code expires in 7 days.
              </p>
              <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                <Button
                  onClick={() => {
                    setShowCreate(false)
                    resetCreateForm()
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
                <DialogTitle>Add a student</DialogTitle>
                <DialogDescription>
                  Create a login account. Email and phone are optional.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-first-name">First name *</Label>
                    <Input
                      id="s-first-name"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="First name"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-last-name">Last name *</Label>
                    <Input
                      id="s-last-name"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Last name"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-login">Login *</Label>
                  <Input
                    id="s-login"
                    value={form.login}
                    onChange={(e) =>
                      setForm({ ...form, login: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })
                    }
                    placeholder="student.login"
                    className="font-mono"
                  />
                  {loginSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {loginSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setForm({ ...form, login: suggestion })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors",
                            form.login === suggestion
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                          )}
                        >
                          {suggestion}
                        </button>
                      ))}
                      {loadingSuggestions && (
                        <span className="text-xs text-slate-400 self-center">…</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-email">Email (optional)</Label>
                    <Input
                      id="s-email"
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-phone">Phone (UZ)</Label>
                    <Input
                      id="s-phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+998 90 123 45 67"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Group</Label>
                    <Select
                      value={form.groupId || "none"}
                      onValueChange={(v) => setForm({ ...form, groupId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No group</SelectItem>
                        {filterGroups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monthly fee</Label>
                    <div
                      className={cn(
                        "flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm tabular-nums",
                        !form.groupId && "text-muted-foreground",
                      )}
                    >
                      {form.groupId
                        ? selectedGroupFee != null && selectedGroupFee > 0
                          ? `${formatMoney(selectedGroupFee)} / mo (from group)`
                          : "Set in group settings"
                        : "Select a group"}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-notes">Notes</Label>
                  <Textarea
                    id="s-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Anything important about this student"
                  />
                </div>
              </div>
              <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
                <Button onClick={submit} loading={creating} className="bg-primary hover:bg-primary/90">
                  Add student
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Delete this student?"
        description={
          pendingRemove && (
            <>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">{pendingRemove.name}</span>. Their
              homework and payments will also be deleted.
            </>
          )
        }
        onConfirm={confirmRemove}
        loading={!!pendingRemove && removingId === pendingRemove.id}
      />

      <StudentDetailModal student={selected} open={showDetail} onOpenChange={setShowDetail} />
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}
