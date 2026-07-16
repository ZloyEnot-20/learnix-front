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
  BookOpen,
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
  Clock,
} from "lucide-react"
import TestsList from "@/components/admin/tests-list"
import GroupsManager from "@/components/admin/groups-manager"
import StudentsManager from "@/components/admin/students-manager"
import HomeworkManager from "@/components/admin/homework-manager"
import EntryTestManager from "@/components/admin/entry-test-manager"
import ExercisesSection from "@/components/admin/exercises-section"
import TelegramBotSection from "@/components/admin/telegram-bot-section"
import FinanceManager from "@/components/admin/finance-manager"
import UsersManager from "@/components/admin/users-manager"
import AuditSection from "@/components/admin/audit-section"
import OrgBillingSection from "@/components/admin/org-billing-section"
import OrgSettingsSection from "@/components/admin/org-settings-section"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import ExerciseStatsSection from "@/components/admin/exercise-stats-section"
import { AdminShell, type NavSection } from "@/components/admin/admin-shell"
import { invalidateHomeworkCount } from "@/lib/admin-cache"
import {
  AdminDataProvider,
  useAdminData,
  type AdminListKey,
} from "@/lib/admin-data-context"
import { StatusScreen } from "@/components/status-screen"
import { Card, CardContent } from "@/components/ui/card"

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Overview", subtitle: "Platform snapshot and key metrics" },
  groups: { title: "Groups", subtitle: "Create groups and assign students" },
  students: { title: "Students", subtitle: "Manage student profiles" },
  users: { title: "Users", subtitle: "Manage admins and teachers in your organization" },
  audit: { title: "Activity log", subtitle: "Who did what on the platform" },
  tests: { title: "IELTS Assessment", subtitle: "Full practice tests — coming soon" },
  homework: { title: "Homework check", subtitle: "Review submissions and track completion" },
  stats: { title: "Exercise statistics", subtitle: "Completion, cheating and failure rates per exercise" },
  control: { title: "Progress test", subtitle: "Unit progress tests — coming soon" },
  entry: { title: "Entry Test", subtitle: "Phone-based candidates and placement tests" },
  exercises: { title: "Exercises", subtitle: "Grammar topics — preview and assign to groups" },
  lessons: {
    title: "Live lessons",
    subtitle: "Run a book unit live with your group — coming soon",
  },
  bot: { title: "Telegram bot", subtitle: "Invite codes and parent subscriptions" },
  finance: { title: "Finance", subtitle: "Payments and revenue by group" },
  billing: { title: "Billing", subtitle: "Your organization subscription and platform payments" },
  settings: { title: "Settings", subtitle: "Organization preferences and homework policies" },
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
  // control / lessons — soon placeholders, no lists
}

/** Sections that need the full exercise catalogue (GET /exercises). */
const SECTIONS_NEED_EXERCISES = new Set(["homework", "exercises"])

/** Section ids restricted to org admin (admin + super admin), not teachers. */
const ADMIN_ONLY_SECTIONS = new Set(["users", "audit", "billing", "settings"])

function sectionFromSegment(segment: string | undefined, role: UserRole): string {
  if (!segment || !SECTION_IDS.includes(segment)) return "dashboard"
  // Hidden / retired sections
  if (segment === "manage") return "dashboard"
  if (ADMIN_ONLY_SECTIONS.has(segment) && !isAdminRole(role)) {
    return "dashboard"
  }
  return segment
}

function ProgressTestSoon() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Progress test</h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold uppercase tracking-wide"
                >
                  Soon
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Multi-section unit progress tests are being reworked. This section will be back
                with a clearer flow soon.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Coming soon
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">Not available yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Existing progress tests stay in the system — creation and review will return here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function LiveLessonsSoon() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Live lessons</h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold uppercase tracking-wide"
                >
                  Soon
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Live book lessons with your group are almost ready. You will be able to open
                exercises in real time and track student progress here soon.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Coming soon
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">Not available yet</p>
          <p className="mt-1 text-xs text-slate-400">
            This section will open when live lessons are rolled out for your organization.
          </p>
        </div>
      </CardContent>
    </Card>
  )
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

function AdminPanelContent() {
  const { user, logout, isLoading } = useAuth()
  const { students, groups, homeworkCount, ensureLists, ensureExercisesCatalog } = useAdminData()
  const router = useRouter()
  const params = useParams<{ section?: string[] }>()

  // The active section is derived from the URL (/admin or /admin/<section>),
  // so it is bookmarkable and reflected in the address bar.
  const segment = Array.isArray(params.section) ? params.section[0] : undefined
  const activeTab = sectionFromSegment(segment, user?.type ?? "student")
  const selectTab = (id: string) =>
    router.push(id === "dashboard" ? "/admin" : `/admin/${id}`, { scroll: false })
  const superAdmin = user ? isSuperAdmin(user.type) : false
  const orgAdmin = user ? isAdminRole(user.type) : false
  const isTeacher = user?.type === "teacher"

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isLoading && (!user || !canAccessAdmin(user.type))) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, isLoading, router])

  // Unknown or forbidden section segment → normalise the URL back to /admin.
  useEffect(() => {
    if (!user) return
    if (segment === "speech") {
      router.replace("/admin/settings")
      return
    }
    if (segment === "manage") {
      router.replace("/admin")
      return
    }
    if (segment && !SECTION_IDS.includes(segment)) {
      router.replace("/admin")
      return
    }
    if (segment && ADMIN_ONLY_SECTIONS.has(segment) && !isAdminRole(user.type)) {
      router.replace("/admin")
    }
  }, [segment, user, router])

  // Load shared lists per section. Groups tab always refetches — schedule lives on each group doc.
  useEffect(() => {
    const keys = SECTION_LIST_NEEDS[activeTab]
    if (keys?.length) void ensureLists(keys, activeTab === "groups")
    if (SECTIONS_NEED_EXERCISES.has(activeTab)) void ensureExercisesCatalog()
  }, [activeTab, ensureLists, ensureExercisesCatalog])

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
        { id: "tests", label: "IELTS Assessment", icon: ListChecks, badge: "Soon" },
        { id: "homework", label: "Homework check", icon: ClipboardList, badge: homeworkCount },
        { id: "stats", label: "Statistics", icon: BarChart3 },
        { id: "control", label: "Progress test", icon: Layers, badge: "Soon" },
        { id: "exercises", label: "Exercises", icon: GraduationCap },
        { id: "lessons", label: "Live lessons", icon: BookOpen, badge: "Soon" },
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
              ...(orgAdmin ? [{ id: "billing", label: "Billing", icon: CreditCard }] : []),
              ...(orgAdmin ? [{ id: "users", label: "Users", icon: UserCog }] : []),
              ...(orgAdmin ? [{ id: "audit", label: "Activity", icon: ScrollText }] : []),
            ],
          } satisfies NavSection,
        ]
      : []),
  ]

  const meta = SECTION_TITLES[activeTab] ?? SECTION_TITLES.dashboard
  const pageMeta =
    activeTab === "dashboard" && isTeacher
      ? {
          title: "Overview",
          subtitle: "Your schedule, groups and homework at a glance",
        }
      : activeTab === "finance" && isTeacher
        ? {
            title: "Finance",
            subtitle: "Payments and revenue for your groups",
          }
        : meta
  const role = roleBadge(user.type)

  return (
    <AdminShell
      title={pageMeta.title}
      subtitle={pageMeta.subtitle}
      sections={sections}
      active={activeTab}
      onSelect={selectTab}
      user={{ name: user.name, email: user.email }}
      role={role}
      headerExtras={
        <Badge variant="secondary" className="hidden text-[11px] md:inline-flex">
          {groups.length} groups · {students.length} students
        </Badge>
      }
      showOrgNewsBanner
      onLogout={logout}
    >
      {activeTab === "dashboard" && (
        <OverviewDashboard
          refreshKey={refreshKey}
          onSelectTab={selectTab}
          accent={isTeacher ? "violet" : "rose"}
          variant={isTeacher ? "teacher" : "admin"}
        />
      )}

      {activeTab === "groups" && <GroupsManager canCreate onChanged={bump} />}
      {activeTab === "students" && <StudentsManager onChanged={bump} />}
      {activeTab === "users" && orgAdmin && (
        <UsersManager actorType={user.type} actorId={user.id} onChanged={bump} />
      )}
      {activeTab === "audit" && orgAdmin && <AuditSection />}
      {activeTab === "tests" && <TestsList />}
      {activeTab === "homework" && (
        <HomeworkManager createdByName={user.name} onChanged={bump} />
      )}
      {activeTab === "stats" && <ExerciseStatsSection />}
      {activeTab === "control" && <ProgressTestSoon />}
      {activeTab === "entry" && <EntryTestManager createdByName={user.name} />}
      {activeTab === "exercises" && (
        <ExercisesSection
          createdByName={user.name}
          canAssign
          onHomeworkAssigned={bump}
        />
      )}
      {activeTab === "lessons" && <LiveLessonsSoon />}
      {activeTab === "bot" && <TelegramBotSection />}
      {activeTab === "finance" && <FinanceManager onChanged={bump} />}
      {activeTab === "billing" && orgAdmin && <OrgBillingSection />}
      {activeTab === "settings" && orgAdmin && <OrgSettingsSection />}
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
