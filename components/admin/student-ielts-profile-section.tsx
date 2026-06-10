"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Calendar,
  Headphones,
  Mic,
  PenTool,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Student } from "@/lib/admin-storage"
import {
  studentsApi,
  type IeltsReadinessStatus,
  type StudentIeltsProfile,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { StudentIeltsProfileSkeleton } from "./skeletons"

const SKILL_META = {
  reading: { label: "Reading", icon: BookOpen, color: "#c1bffd" },
  listening: { label: "Listening", icon: Headphones, color: "#ffcc3e" },
  writing: { label: "Writing", icon: PenTool, color: "#a7e237" },
  speaking: { label: "Speaking", icon: Mic, color: "#9fcffb" },
} as const

const BAND_OPTIONS = Array.from({ length: 11 }, (_, i) => 4 + i * 0.5)

export const READINESS_META: Record<
  IeltsReadinessStatus,
  { label: string; cls: string }
> = {
  ready: { label: "Ready", cls: "bg-emerald-100 text-emerald-800" },
  on_track: { label: "On track", cls: "bg-sky-100 text-sky-800" },
  at_risk: { label: "At risk", cls: "bg-rose-100 text-rose-800" },
  not_ready: { label: "Not ready", cls: "bg-amber-100 text-amber-800" },
  insufficient_data: { label: "Insufficient data", cls: "bg-slate-100 text-slate-600" },
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
  if (trend === "down") return <ArrowDown className="h-3.5 w-3.5 text-rose-600" />
  return <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
}

function sourceLabel(source: string): string {
  if (source === "mock_test") return "Mock test"
  if (source === "homework") return "Homework"
  return "No data"
}

function formatBand(band: number | null | undefined): string {
  return band != null ? band.toFixed(1) : "—"
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

interface StudentIeltsProfileSectionProps {
  student: Student
}

export function StudentIeltsProfileSection({ student }: StudentIeltsProfileSectionProps) {
  const [profile, setProfile] = useState<StudentIeltsProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetBand, setTargetBand] = useState<string>("")
  const [targetExamDate, setTargetExamDate] = useState("")

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await studentsApi.ieltsProfile(student.id)
      setProfile(data)
      setTargetBand(data.targetBand != null ? String(data.targetBand) : "")
      setTargetExamDate(toDateInputValue(data.targetExamDate))
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [student.id])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const saveTargets = async (band: string, examDate: string) => {
    setSaving(true)
    try {
      await studentsApi.update(student.id, {
        targetBand: band ? Number(band) : null,
        targetExamDate: examDate ? new Date(examDate).toISOString() : null,
      })
      await loadProfile()
    } finally {
      setSaving(false)
    }
  }

  const handleBandChange = (value: string) => {
    setTargetBand(value)
    void saveTargets(value, targetExamDate)
  }

  const handleExamDateChange = (value: string) => {
    setTargetExamDate(value)
    void saveTargets(targetBand, value)
  }

  const chartData = useMemo(() => {
    if (!profile?.bandHistory.length) return []
    const byMonth = new Map<string, { label: string; bands: number[] }>()
    for (const row of profile.bandHistory) {
      const d = new Date(row.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      const bucket = byMonth.get(key) ?? { label, bands: [] }
      bucket.bands.push(row.band)
      byMonth.set(key, bucket)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        label: v.label,
        band: Math.round((v.bands.reduce((a, b) => a + b, 0) / v.bands.length) * 10) / 10,
      }))
  }, [profile?.bandHistory])

  const skillChartData = useMemo(() => {
    if (!profile) return []
    return profile.skills.map((s) => {
      const meta = SKILL_META[s.skill as keyof typeof SKILL_META]
      return {
        name: meta?.label ?? s.skill,
        band: s.estimatedBand ?? 0,
        color: meta?.color ?? "#cbd5e1",
        hasData: s.estimatedBand != null,
      }
    })
  }, [profile])

  if (loading) {
    return <StudentIeltsProfileSkeleton />
  }

  if (!profile) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Could not load IELTS profile
      </section>
    )
  }

  const readiness = READINESS_META[profile.readinessStatus]

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <Sparkles className="h-4 w-4" />
            IELTS Profile
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            System evaluation and readiness forecast for {student.name}
          </p>
        </div>
        <Badge className={cn("text-[11px] font-semibold uppercase tracking-wide", readiness.cls)}>
          {readiness.label}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400">Target band</Label>
          <Select value={targetBand || undefined} onValueChange={handleBandChange} disabled={saving}>
            <SelectTrigger className="mt-1.5 h-9">
              <SelectValue placeholder="Set target" />
            </SelectTrigger>
            <SelectContent>
              {BAND_OPTIONS.map((b) => (
                <SelectItem key={b} value={String(b)}>
                  {b.toFixed(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <Label className="text-[10px] uppercase tracking-wider text-slate-400">Exam date</Label>
          <Input
            type="date"
            className="mt-1.5 h-9"
            value={targetExamDate}
            onChange={(e) => handleExamDateChange(e.target.value)}
            disabled={saving}
          />
        </div>
        <KpiTile
          icon={Target}
          label="Estimated overall"
          value={formatBand(profile.overallBand)}
          sub={
            profile.gapToTarget != null && profile.gapToTarget > 0
              ? `${profile.gapToTarget.toFixed(1)} below target`
              : profile.gapToTarget != null && profile.gapToTarget <= 0
                ? "At or above target"
                : "Set target to compare"
          }
        />
        <KpiTile
          icon={Calendar}
          label="Days to exam"
          value={
            profile.daysToExam != null
              ? profile.daysToExam >= 0
                ? String(profile.daysToExam)
                : `${Math.abs(profile.daysToExam)}d ago`
              : "—"
          }
          sub={
            profile.estimatedReadyDate
              ? `Est. ready ${new Date(profile.estimatedReadyDate).toLocaleDateString()}`
              : profile.confidence === "low"
                ? "Not enough data"
                : "Forecast pending"
          }
        />
      </div>

      {!targetBand && (
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Set a target band to enable readiness tracking.
        </p>
      )}

      <p className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
        {profile.recommendation}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {profile.skills.map((skill) => {
          const meta = SKILL_META[skill.skill as keyof typeof SKILL_META]
          const Icon = meta?.icon ?? Sparkles
          return (
            <div
              key={skill.skill}
              className={cn(
                "rounded-xl border bg-white p-3",
                skill.belowTarget ? "border-rose-200" : "border-slate-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: meta?.color ?? "#e2e8f0" }}
                >
                  <Icon className="h-4 w-4 text-slate-900/80" />
                </div>
                <TrendIcon trend={skill.trend} />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">{meta?.label ?? skill.skill}</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">
                {formatBand(skill.estimatedBand)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {sourceLabel(skill.source)}
                </span>
                {skill.attempts > 0 && (
                  <span className="text-[10px] text-slate-400">{skill.attempts} attempts</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Skill breakdown
          </p>
          {skillChartData.some((s) => s.hasData) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={skillChartData} barSize={36} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number, _name, item) => [
                    item.payload.hasData ? value.toFixed(1) : "No data",
                    "Band",
                  ]}
                />
                <Bar dataKey="band" radius={[6, 6, 0, 0]}>
                  {skillChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.hasData ? entry.color : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No skill data yet</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Mock test progress</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[4, 9]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => [value.toFixed(1), "Avg band"]} />
                <Line type="monotone" dataKey="band" stroke="#C8102E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No mock test history</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">Learning health</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthStat
            label="HW completion"
            value={
              profile.learningHealth.completionRate != null
                ? `${profile.learningHealth.completionRate}%`
                : "—"
            }
          />
          <HealthStat
            label="Avg accuracy"
            value={
              profile.learningHealth.avgAccuracy != null
                ? `${profile.learningHealth.avgAccuracy}%`
                : "—"
            }
          />
          <HealthStat
            label="Entry level"
            value={profile.learningHealth.entryLevel ?? "—"}
          />
          <HealthStat
            label="Integrity"
            value={
              profile.learningHealth.cheatingIncidents > 0
                ? `${profile.learningHealth.cheatingIncidents} issue(s)`
                : "OK"
            }
            warn={profile.learningHealth.cheatingIncidents > 0}
          />
        </div>
        {profile.learningHealth.weakestTopics.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Weakest grammar topics
            </p>
            <ul className="flex flex-wrap gap-2">
              {profile.learningHealth.weakestTopics.map((t) => (
                <li
                  key={t.topic}
                  className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700"
                >
                  {t.topic}
                  {t.accuracy != null ? ` · ${t.accuracy}%` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile.learningHealth.cheatingIncidents > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Integrity issues detected — review homework sessions before relying on scores.
          </p>
        )}
      </div>
    </section>
  )
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Target
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}

function HealthStat({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", warn ? "text-rose-700" : "text-slate-900")}>
        {value}
      </p>
    </div>
  )
}

export function ReadinessBadge({ status }: { status: IeltsReadinessStatus }) {
  const meta = READINESS_META[status]
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  )
}
