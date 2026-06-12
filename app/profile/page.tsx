"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  Flame,
  GraduationCap,
  Headphones,
  Mail,
  Mic,
  PenTool,
  Save,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"
import type { TestResult } from "@/lib/test-results-storage"
import { TestResultsModal } from "@/components/test-results-modal"
import { studentsApi, testResultsApi } from "@/lib/api"
import StudentStatsPanel from "@/components/student/student-stats-panel"
import { cn } from "@/lib/utils"
import { formatLessonSchedule } from "@/lib/lesson-schedule"
import type { LessonSchedule } from "@/lib/lesson-schedule"

const TEST_COLORS = {
  reading: "#c1bffd",
  listening: "#ffcc3e",
  writing: "#a7e237",
  speaking: "#9fcffb",
}

const TEST_ICONS = {
  reading: BookOpen,
  listening: Headphones,
  writing: PenTool,
  speaking: Mic,
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [groupName, setGroupName] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string | null>(null)
  const [lessonSchedule, setLessonSchedule] = useState<LessonSchedule | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
    // Staff (super admin / admin / teacher) belong in the admin panel.
    if (!isLoading && user && user.type !== "student") {
      router.push("/admin")
    }
    if (!user) return
    setName(user.name)
    setEmail(user.email)

    let cancelled = false
    if (user.type === "student") {
      const studentId = user.id
      studentsApi
        .context(studentId)
        .then((ctx) => {
          if (cancelled) return
          setGroupName(ctx.groupName)
          setTeacherName(ctx.teacherName)
          setLessonSchedule(ctx.lessonSchedule)
        })
        .catch(() => {})
    }
    testResultsApi
      .list()
      .then((results) => {
        if (!cancelled) setTestResults(results)
      })
      .catch(() => {
        if (!cancelled) setTestResults([])
      })

    return () => {
      cancelled = true
    }
  }, [user, isLoading, router])

  const stats = useMemo(() => {
    const total = testResults.length
    const avgBand = total
      ? testResults.reduce((s, r) => s + r.bandScore, 0) / total
      : null
    const accuracySum = testResults.reduce((s, r) => {
      if (r.totalQuestions === 0) return s
      return s + r.totalCorrect / r.totalQuestions
    }, 0)
    const avgAccuracy = total > 0 ? Math.round((accuracySum / total) * 100) : null
    const best =
      total > 0
        ? testResults.reduce((b, r) => (r.bandScore > b.bandScore ? r : b))
        : null
    return { total, avgBand, avgAccuracy, best }
  }, [testResults])

  const dirty = user ? name !== user.name || email !== user.email : false

  if (isLoading || !user || user.type !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const handleSave = () => {
    alert("Profile updated successfully!")
  }

  const handleResultClick = (result: TestResult) => {
    setSelectedResult(result)
    setShowResultModal(true)
  }

  const memberSince = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  })
  const scheduleLabel = formatLessonSchedule(lessonSchedule)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <IELTSLogo />
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-24 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_25%_30%,white,transparent_45%),radial-gradient(circle_at_75%_60%,white,transparent_40%)]" />
          </div>
          <div className="relative z-10 px-6 pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              {/* Identity */}
              <div className="flex items-start gap-4">
                <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-100 text-2xl font-bold text-primary shadow-md ring-4 ring-white">
                  {initials(user.name)}
                </div>
                <div className="min-w-0 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold leading-tight text-slate-900">{user.name}</h1>
                    <Badge variant="secondary" className="capitalize">
                      {user.type}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {user.email}
                    </span>
                    {groupName && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {groupName}
                      </span>
                    )}
                    {teacherName && (
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        {teacherName}
                      </span>
                    )}
                    {scheduleLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {scheduleLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Member since {memberSince}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap gap-2 pt-3 lg:pt-0 mt-5">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setShowStats(true)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Statistics
                  <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Soon
                  </span>
                </Button>
                <Link href="/dashboard">
                  <Button variant="outline" className="gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    View dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* KPI strip */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi
                icon={Award}
                label="Avg band"
                value={stats.avgBand != null ? stats.avgBand.toFixed(1) : "—"}
                accent="bg-violet-50 text-violet-700"
              />
              <Kpi
                icon={Target}
                label="Accuracy"
                value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : "—"}
                accent="bg-emerald-50 text-emerald-700"
              />
              <Kpi
                icon={TrendingUp}
                label="Tests taken"
                value={String(stats.total)}
                accent="bg-sky-50 text-sky-700"
              />
              <Kpi
                icon={Flame}
                label="Day streak"
                value="12"
                accent="bg-rose-50 text-rose-700"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Account Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Account information</CardTitle>
              <CardDescription>
                Update your name and contact details. Changes are saved locally for now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500">
                  {dirty ? "You have unsaved changes." : "Everything is up to date."}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={!dirty}
                  className={cn(
                    "bg-primary hover:bg-primary/90",
                    !dirty && "opacity-50",
                  )}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>Your best performance so far</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.best ? (
                <HighlightRow
                  icon={Award}
                  label="Best band"
                  value={stats.best.bandScore.toFixed(1)}
                  hint={`${stats.best.testType} · ${new Date(stats.best.date).toLocaleDateString()}`}
                  accent="bg-amber-50 text-amber-700"
                />
              ) : (
                <HighlightRow
                  icon={Award}
                  label="Best band"
                  value="—"
                  hint="Take your first test"
                  accent="bg-slate-100 text-slate-600"
                />
              )}
              <HighlightRow
                icon={CheckCircle2}
                label="Tests completed"
                value={String(stats.total)}
                hint={stats.total === 0 ? "Get started anytime" : "across all skills"}
                accent="bg-emerald-50 text-emerald-700"
              />
              <HighlightRow
                icon={Target}
                label="Avg accuracy"
                value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : "—"}
                hint="of questions correct"
                accent="bg-sky-50 text-sky-700"
              />
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Test results</CardTitle>
                <CardDescription>
                  {testResults.length === 0
                    ? "No tests taken yet — your results will appear here."
                    : `Tap a card to review answers · ${testResults.length} result${
                        testResults.length === 1 ? "" : "s"
                      }`}
                </CardDescription>
              </div>
              {testResults.length > 0 && (
                <Badge variant="secondary" className="bg-slate-100">
                  {testResults.length} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-900">
                  Start your first practice test
                </p>
                <p className="text-xs text-slate-500">
                  Reading, Listening, Writing or Speaking — try any section from the dashboard.
                </p>
                <Link href="/dashboard" className="mt-4 inline-block">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Go to dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {testResults.map((result) => {
                  const Icon = TEST_ICONS[result.testType]
                  const color = TEST_COLORS[result.testType]
                  const accuracy =
                    result.totalQuestions > 0
                      ? Math.round((result.totalCorrect / result.totalQuestions) * 100)
                      : 0
                  const bandPercent = Math.min(100, (result.bandScore / 9) * 100)

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                        style={{ backgroundColor: color }}
                      />

                      <div className="relative p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5"
                              style={{ backgroundColor: color }}
                            >
                              <Icon className="h-6 w-6 text-slate-900/80" />
                            </div>
                            <div>
                              <h3 className="font-semibold capitalize leading-tight text-slate-900">
                                {result.testType} Test
                              </h3>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {new Date(result.date).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-slate-600" />
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Band score
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold tabular-nums text-slate-900">
                                {result.bandScore.toFixed(1)}
                              </span>
                              <span className="text-sm font-medium text-slate-400">/ 9.0</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Accuracy
                            </p>
                            <div className="flex items-center justify-end gap-1.5">
                              <Target className="h-4 w-4 text-slate-400" />
                              <span className="text-lg font-semibold tabular-nums text-slate-900">
                                {result.totalCorrect}
                                <span className="text-slate-400">/{result.totalQuestions}</span>
                              </span>
                              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {accuracy}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${bandPercent}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedResult && (
        <TestResultsModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          testType={selectedResult.testType}
          answers={selectedResult.answers}
          parts={selectedResult.parts}
          viewOnly={true}
          onBack={() => setShowResultModal(false)}
        />
      )}

      {/* Personal statistics (preview / soon) */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="!max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Your statistics
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Soon
              </span>
            </DialogTitle>
            <DialogDescription>
              Your accuracy by topic and subtask — see what to practise next.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            <StudentStatsPanel />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Award
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
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
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

function HighlightRow({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Award
  label: string
  value: string
  hint?: string
  accent: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      <span className="text-xl font-bold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}
