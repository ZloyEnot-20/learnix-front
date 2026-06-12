"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth, canAccessAdmin, isSuperAdmin, isAdminRole, type UserRole } from "@/lib/auth-context"
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
  Wallet,
  UserSquare,
  ShieldAlert,
  Home,
  Layers,
  Send,
  UserCog,
  ScrollText,
  CreditCard,
  BarChart3,
  Settings,
  Mic,
} from "lucide-react"
import TestsList from "@/components/admin/tests-list"
import GroupsManager from "@/components/admin/groups-manager"
import StudentsManager from "@/components/admin/students-manager"
import HomeworkManager from "@/components/admin/homework-manager"
import ControlWorkManager from "@/components/admin/control-work-manager"
import EntryTestManager from "@/components/admin/entry-test-manager"
import ExercisesSection from "@/components/admin/exercises-section"
import ManageContentSection from "@/components/admin/manage-content-section"
import TelegramBotSection from "@/components/admin/telegram-bot-section"
import FinanceManager from "@/components/admin/finance-manager"
import UsersManager from "@/components/admin/users-manager"
import AuditSection from "@/components/admin/audit-section"
import OrgBillingSection from "@/components/admin/org-billing-section"
import OrgSettingsSection from "@/components/admin/org-settings-section"
import SpeechRecognitionSection from "@/components/admin/speech-recognition-section"
import { OrgNewsBanner } from "@/components/admin/org-news-banner"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import ExerciseStatsSection from "@/components/admin/exercise-stats-section"
import { AdminShell, type NavSection } from "@/components/admin/admin-shell"
import { invalidateHomeworkCount } from "@/lib/admin-cache"
import { invalidateExercises } from "@/lib/exercises-cache"
import {
  AdminDataProvider,
  useAdminData,
  type AdminListKey,
} from "@/lib/admin-data-context"
import { StatusScreen } from "@/components/status-screen"

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Overview", subtitle: "Platform snapshot and key metrics" },
  groups: { title: "Groups", subtitle: "Create groups and assign students" },
  students: { title: "Students", subtitle: "Manage student profiles" },
  users: { title: "Users", subtitle: "Manage admins and teachers in your organization" },
  audit: { title: "Activity log", subtitle: "Who did what on the platform" },
  tests: { title: "IELTS Tests", subtitle: "Browse and remove existing tests" },
  homework: { title: "Homework check", subtitle: "Review submissions and track completion" },
  stats: { title: "Exercise statistics", subtitle: "Completion, cheating and failure rates per exercise" },
  control: { title: "Progress test", subtitle: "Multi-section unit tests with custom topic order" },
  entry: { title: "Entry Test", subtitle: "Phone-based candidates and placement tests" },
  exercises: { title: "Exercises", subtitle: "Grammar topics — preview and assign to groups" },
  manage: { title: "Manage exercises", subtitle: "Add questions, topics, tests and vocabulary via JSON" },
  bot: { title: "Telegram bot", subtitle: "Invite codes and parent subscriptions" },
  finance: { title: "Finance", subtitle: "Payments and revenue by group" },
  billing: { title: "Billing", subtitle: "Your organization subscription and platform payments" },
  settings: { title: "Settings", subtitle: "Organization preferences and homework policies" },
  speech: { title: "Speech recognition", subtitle: "Whisper service status and transcription testing" },
}

/** Section ids that map to a URL segment under /admin. */
const SECTION_IDS = Object.keys(SECTION_TITLES)

/** Shared admin lists each section needs — fetched once per session (cached). */
const SECTION_LIST_NEEDS: Record<string, AdminListKey[]> = {
  dashboard: ["students", "groups", "homeworkCount"],
  groups: ["students", "groups"],
  students: ["students", "groups"],
  homework: ["students", "groups", "homeworkCount"],
  entry: ["students"],
  exercises: ["groups"],
  finance: ["students", "groups"],
  bot: ["students"],
  control: ["students", "groups"],
  // tests, manage — no shared list APIs
}

/** Section ids restricted to super admin. */
const SUPER_ADMIN_ONLY_SECTIONS = new Set(["manage"])

/** Section ids restricted to org admin (admin + super admin), not teachers. */
const ADMIN_ONLY_SECTIONS = new Set(["users", "audit", "billing", "settings", "speech"])

function sectionFromSegment(segment: string | undefined, role: UserRole): string {
  if (!segment || !SECTION_IDS.includes(segment)) return "dashboard"
  if (SUPER_ADMIN_ONLY_SECTIONS.has(segment) && !isSuperAdmin(role)) {
    return "dashboard"
  }
  if (ADMIN_ONLY_SECTIONS.has(segment) && !isAdminRole(role)) {
    return "dashboard"
  }
  return segment
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
  const { students, groups, homeworkCount, ensureLists } = useAdminData()
  const router = useRouter()
  const params = useParams<{ section?: string[] }>()

  // The active section is derived from the URL (/admin or /admin/<section>),
  // so it is bookmarkable and reflected in the address bar.
  const segment = Array.isArray(params.section) ? params.section[0] : undefined
  const activeTab = sectionFromSegment(segment, user?.type ?? "student")
  const selectTab = (id: string) =>
    router.push(id === "dashboard" ? "/admin" : `/admin/${id}`)
  const superAdmin = user ? isSuperAdmin(user.type) : false
  const orgAdmin = user ? isAdminRole(user.type) : false

  // Synchronous (localStorage) — no flicker, no request on navigation.
  const [totalTests, setTotalTests] = useState<number>(() => readTestCount())
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isLoading && (!user || !canAccessAdmin(user.type))) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, isLoading, router])

  // Unknown or forbidden section segment → normalise the URL back to /admin.
  useEffect(() => {
    if (!user) return
    if (segment && !SECTION_IDS.includes(segment)) {
      router.replace("/admin")
      return
    }
    if (segment && SUPER_ADMIN_ONLY_SECTIONS.has(segment) && !isSuperAdmin(user.type)) {
      router.replace("/admin")
    }
    if (segment && ADMIN_ONLY_SECTIONS.has(segment) && !isAdminRole(user.type)) {
      router.replace("/admin")
    }
  }, [segment, user, router])

  useEffect(() => {
    setTotalTests(readTestCount())
  }, [refreshKey])

  // Load shared lists per section. Groups tab always refetches — schedule lives on each group doc.
  useEffect(() => {
    const keys = SECTION_LIST_NEEDS[activeTab]
    if (keys?.length) void ensureLists(keys, activeTab === "groups")
  }, [activeTab, ensureLists])

  /** Refresh exercise/topic catalogue after Manage exercises uploads — no people APIs. */
  const bumpCatalog = () => {
    invalidateExercises()
  }

  const bump = () => {
    invalidateHomeworkCount()
    void ensureLists(["students", "groups", "homeworkCount"], true)
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
        { id: "entry", label: "Entry Test", icon: ClipboardCheck },
      ],
    },
    {
      label: "Teaching",
      items: [
        { id: "tests", label: "IELTS Tests", icon: ListChecks, badge: totalTests },
        { id: "homework", label: "Homework check", icon: ClipboardList, badge: homeworkCount },
        { id: "stats", label: "Statistics", icon: BarChart3 },
        { id: "control", label: "Progress test", icon: Layers },
        { id: "exercises", label: "Exercises", icon: GraduationCap },
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
    ...(orgAdmin || superAdmin
      ? [
          {
            label: "Administration",
            items: [
              ...(orgAdmin ? [{ id: "settings", label: "Settings", icon: Settings }] : []),
              ...(orgAdmin ? [{ id: "speech", label: "Speech recognition", icon: Mic }] : []),
              ...(orgAdmin ? [{ id: "billing", label: "Billing", icon: CreditCard }] : []),
              ...(orgAdmin ? [{ id: "users", label: "Users", icon: UserCog }] : []),
              ...(orgAdmin ? [{ id: "audit", label: "Activity", icon: ScrollText }] : []),
              ...(superAdmin
                ? [{ id: "manage", label: "Manage exercises", icon: FileJson }]
                : []),
            ],
          } satisfies NavSection,
        ]
      : []),
  ]

  const meta = SECTION_TITLES[activeTab] ?? SECTION_TITLES.dashboard
  const role = roleBadge(user.type)

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
      topBanner={<OrgNewsBanner />}
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
      {activeTab === "users" && orgAdmin && (
        <UsersManager actorType={user.type} actorId={user.id} onChanged={bump} />
      )}
      {activeTab === "audit" && orgAdmin && <AuditSection />}
      {activeTab === "tests" && <TestsList onTestsChanged={bump} />}
      {activeTab === "homework" && (
        <HomeworkManager createdByName={user.name} onChanged={bump} />
      )}
      {activeTab === "stats" && <ExerciseStatsSection />}
      {activeTab === "control" && (
        <ControlWorkManager createdByName={user.name} onChanged={bump} />
      )}
      {activeTab === "entry" && <EntryTestManager createdByName={user.name} />}
      {activeTab === "exercises" && (
        <ExercisesSection
          createdByName={user.name}
          canAssign
          onHomeworkAssigned={bump}
        />
      )}
      {activeTab === "manage" && superAdmin && (
        <ManageContentSection onChanged={bumpCatalog} />
      )}
      {activeTab === "bot" && <TelegramBotSection />}
      {activeTab === "finance" && <FinanceManager onChanged={bump} />}
      {activeTab === "billing" && orgAdmin && <OrgBillingSection />}
      {activeTab === "settings" && orgAdmin && <OrgSettingsSection />}
      {activeTab === "speech" && orgAdmin && <SpeechRecognitionSection />}
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!canAccessAdmin(user.type)) {
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
