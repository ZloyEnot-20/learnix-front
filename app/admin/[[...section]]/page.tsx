"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth, canAccessAdmin } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  FileJson,
  ScanText,
  Wallet,
  UserSquare,
  ShieldAlert,
  Home,
  Send,
} from "lucide-react"
import TestsList from "@/components/admin/tests-list"
import GroupsManager from "@/components/admin/groups-manager"
import StudentsManager from "@/components/admin/students-manager"
import HomeworkManager from "@/components/admin/homework-manager"
import EntryTestManager from "@/components/admin/entry-test-manager"
import ExercisesSection from "@/components/admin/exercises-section"
import ManageContentSection from "@/components/admin/manage-content-section"
import OcrSection from "@/components/admin/ocr-section"
import TelegramBotSection from "@/components/admin/telegram-bot-section"
import FinanceManager from "@/components/admin/finance-manager"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import { AdminShell, type NavSection } from "@/components/admin/admin-shell"
import { invalidateHomeworkCount } from "@/lib/admin-cache"
import { AdminDataProvider, useAdminData } from "@/lib/admin-data-context"
import { StatusScreen } from "@/components/status-screen"

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Overview", subtitle: "Platform snapshot and key metrics" },
  groups: { title: "Groups", subtitle: "Create groups and assign students" },
  students: { title: "Students", subtitle: "Manage student profiles" },
  tests: { title: "IELTS Tests", subtitle: "Browse and remove existing tests" },
  homework: { title: "Homework", subtitle: "Assign tasks to groups and track submissions" },
  entry: { title: "Entry Test", subtitle: "Assign placement tests and grade writing" },
  exercises: { title: "Exercises", subtitle: "Grammar topics — preview and assign to groups" },
  manage: { title: "Manage exercises", subtitle: "Add questions, topics, tests and vocabulary via JSON" },
  ocr: { title: "OCR", subtitle: "Extract text from scans and PDFs" },
  bot: { title: "Telegram bot", subtitle: "Invite codes and parent subscriptions" },
  finance: { title: "Finance", subtitle: "Payments and revenue by group" },
}

/** Section ids that map to a URL segment under /admin. */
const SECTION_IDS = Object.keys(SECTION_TITLES)

function sectionFromSegment(segment?: string): string {
  return segment && SECTION_IDS.includes(segment) ? segment : "dashboard"
}

function roleBadge(role: string) {
  if (role === "teacher") {
    return {
      label: "Teacher",
      icon: GraduationCap,
      className: "border-violet-200 bg-violet-50 text-violet-700",
    }
  }
  if (role === "super_admin") {
    return {
      label: "Super Admin",
      icon: ShieldCheck,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    }
  }
  return {
    label: "Admin",
    icon: ShieldCheck,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  }
}

const DEFAULT_TESTS = {
  "reading-001": {
    testId: "reading-001",
    title: "IELTS Academic Reading",
    type: "reading",
    partCount: 3,
    totalTime: 60,
    createdAt: "",
    parts: [],
  },
  "listening-001": {
    testId: "listening-001",
    title: "IELTS Academic Listening",
    type: "listening",
    partCount: 4,
    totalTime: 30,
    createdAt: "",
    parts: [],
  },
  "writing-001": {
    testId: "writing-001",
    title: "IELTS Academic Writing",
    type: "writing",
    partCount: 2,
    totalTime: 60,
    createdAt: "",
    parts: [],
  },
  "speaking-001": {
    testId: "speaking-001",
    title: "IELTS Speaking",
    type: "speaking",
    partCount: 3,
    totalTime: 15,
    createdAt: "",
    parts: [],
  },
}

/** Reads the test count from localStorage, seeding defaults on first run. */
function readTestCount(): number {
  if (typeof window === "undefined") return 0
  try {
    const saved = JSON.parse(localStorage.getItem("adminTests") || "{}")
    if (Object.keys(saved).length === 0) {
      const seeded = Object.fromEntries(
        Object.entries(DEFAULT_TESTS).map(([id, t]) => [
          id,
          { ...t, createdAt: new Date().toISOString() },
        ]),
      )
      localStorage.setItem("adminTests", JSON.stringify(seeded))
      return Object.keys(seeded).length
    }
    return Object.keys(saved).length
  } catch {
    return 0
  }
}

function AdminPanelContent() {
  const { user, logout, isLoading } = useAuth()
  const { students, groups, homeworkCount, refreshAll } = useAdminData()
  const router = useRouter()
  const params = useParams<{ section?: string[] }>()

  // The active section is derived from the URL (/admin or /admin/<section>),
  // so it is bookmarkable and reflected in the address bar.
  const segment = Array.isArray(params.section) ? params.section[0] : undefined
  const activeTab = sectionFromSegment(segment)
  const selectTab = (id: string) =>
    router.push(id === "dashboard" ? "/admin" : `/admin/${id}`)

  // Synchronous (localStorage) — no flicker, no request on navigation.
  const [totalTests, setTotalTests] = useState<number>(() => readTestCount())
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isLoading && (!user || !canAccessAdmin(user.role))) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, isLoading, router])

  // Unknown section segment → normalise the URL back to /admin.
  useEffect(() => {
    if (segment && !SECTION_IDS.includes(segment)) {
      router.replace("/admin")
    }
  }, [segment, router])

  useEffect(() => {
    setTotalTests(readTestCount())
  }, [refreshKey])

  const bump = () => {
    invalidateHomeworkCount()
    void refreshAll(true)
    setRefreshKey((k) => k + 1)
  }

  if (!user) return null

  const sections: NavSection[] = [
    {
      label: "General",
      items: [{ id: "dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      label: "People",
      items: [
        { id: "groups", label: "Groups", icon: Users, badge: groups.length },
        { id: "students", label: "Students", icon: UserSquare, badge: students.length },
      ],
    },
    {
      label: "Teaching",
      items: [
        { id: "tests", label: "IELTS Tests", icon: ListChecks, badge: totalTests },
        { id: "homework", label: "Homework", icon: ClipboardList, badge: homeworkCount },
        { id: "entry", label: "Entry Test", icon: ClipboardCheck },
        { id: "exercises", label: "Exercises", icon: GraduationCap },
        { id: "manage", label: "Manage exercises", icon: FileJson },
        { id: "ocr", label: "OCR", icon: ScanText, badge: "beta" },
      ],
    },
    {
      label: "Communication",
      items: [{ id: "bot", label: "Telegram bot", icon: Send }],
    },
    {
      label: "Money",
      items: [{ id: "finance", label: "Finance", icon: Wallet }],
    },
  ]

  const meta = SECTION_TITLES[activeTab] ?? SECTION_TITLES.dashboard
  const role = roleBadge(user.role)

  return (
    <AdminShell
      title={meta.title}
      subtitle={meta.subtitle}
      sections={sections}
      active={activeTab}
      onSelect={selectTab}
      user={{ name: user.name, email: user.email }}
      role={role}
      headerExtras={
        <Badge variant="secondary" className="hidden text-[11px] md:inline-flex">
          {totalTests} IELTS · {groups.length} groups · {students.length} students
        </Badge>
      }
      onLogout={logout}
    >
      {activeTab === "dashboard" && (
        <OverviewDashboard
          refreshKey={refreshKey}
          onSelectTab={selectTab}
          accent="rose"
        />
      )}

      {activeTab === "groups" && <GroupsManager canCreate onChanged={bump} />}
      {activeTab === "students" && <StudentsManager onChanged={bump} />}
      {activeTab === "tests" && <TestsList onTestsChanged={bump} />}
      {activeTab === "homework" && (
        <HomeworkManager createdByName={user.name} onChanged={bump} />
      )}
      {activeTab === "entry" && <EntryTestManager createdByName={user.name} />}
      {activeTab === "exercises" && (
        <ExercisesSection
          createdByName={user.name}
          canAssign
          onHomeworkAssigned={bump}
        />
      )}
      {activeTab === "manage" && <ManageContentSection onChanged={bump} />}
      {activeTab === "ocr" && <OcrSection />}
      {activeTab === "bot" && <TelegramBotSection />}
      {activeTab === "finance" && <FinanceManager onChanged={bump} />}
    </AdminShell>
  )
}

export default function AdminPanel() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Once the session is gone (e.g. after logout), leave the admin panel for the
  // login screen instead of getting stuck on the loading spinner.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }

  if (!canAccessAdmin(user.role)) {
    return (
      <StatusScreen
        code="403"
        icon={<ShieldAlert className="h-7 w-7" />}
        title="Access denied"
        description="You don't have permission to open the admin panel. Head back to your dashboard."
        actions={[
          { label: "Go to dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
        ]}
      />
    )
  }

  return (
    <AdminDataProvider>
      <AdminPanelContent />
    </AdminDataProvider>
  )
}
