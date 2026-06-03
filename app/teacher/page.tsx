"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  ListChecks,
  GraduationCap,
  Users,
  ClipboardList,
  ClipboardCheck,
  Wallet,
  UserSquare,
  BookOpenCheck,
} from "lucide-react"
import TestsList from "@/components/admin/tests-list"
import GroupsManager from "@/components/admin/groups-manager"
import StudentsManager from "@/components/admin/students-manager"
import HomeworkManager from "@/components/admin/homework-manager"
import EntryTestManager from "@/components/admin/entry-test-manager"
import ExercisesSection from "@/components/admin/exercises-section"
import FinanceManager from "@/components/admin/finance-manager"
import OverviewDashboard from "@/components/admin/overview-dashboard"
import { AdminShell, type NavSection } from "@/components/admin/admin-shell"
import { ensureSeeded, listGroups, listHomework, listStudents } from "@/lib/admin-storage"

type TabKey =
  | "dashboard"
  | "groups"
  | "students"
  | "tests"
  | "homework"
  | "entry"
  | "exercises"
  | "finance"

const SECTION_TITLES: Record<TabKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Overview", subtitle: "Your groups and students at a glance" },
  groups: { title: "Groups", subtitle: "View groups and assign students" },
  students: { title: "Students", subtitle: "Manage student profiles" },
  tests: { title: "IELTS Tests", subtitle: "Browse and remove existing tests" },
  homework: { title: "Homework", subtitle: "Assign tasks to groups and track submissions" },
  entry: { title: "Entry Test", subtitle: "Assign placement tests and grade writing" },
  exercises: { title: "Exercises", subtitle: "Grammar topics — preview and assign to groups" },
  finance: { title: "Finance", subtitle: "Track payments by group" },
}

export default function TeacherPanel() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard")
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState({ groups: 0, students: 0, homework: 0 })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "teacher")) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    ensureSeeded()
    setStats({
      groups: listGroups().length,
      students: listStudents().length,
      homework: listHomework().length,
    })
  }, [refreshKey])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }
  if (user.role !== "teacher") return null

  const bump = () => setRefreshKey((k) => k + 1)

  const sections: NavSection[] = [
    {
      label: "General",
      items: [{ id: "dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      label: "People",
      items: [
        { id: "groups", label: "Groups", icon: Users, badge: stats.groups },
        { id: "students", label: "Students", icon: UserSquare, badge: stats.students },
      ],
    },
    {
      label: "Teaching",
      items: [
        { id: "tests", label: "IELTS Tests", icon: ListChecks },
        { id: "homework", label: "Homework", icon: ClipboardList, badge: stats.homework },
        { id: "entry", label: "Entry Test", icon: ClipboardCheck },
        { id: "exercises", label: "Exercises", icon: BookOpenCheck },
      ],
    },
    {
      label: "Money",
      items: [{ id: "finance", label: "Finance", icon: Wallet }],
    },
  ]

  const meta = SECTION_TITLES[activeTab]

  return (
    <AdminShell
      title={meta.title}
      subtitle={meta.subtitle}
      sections={sections}
      active={activeTab}
      onSelect={(id) => setActiveTab(id as TabKey)}
      user={{ name: user.name, email: user.email }}
      role={{
        label: "Teacher",
        icon: GraduationCap,
        className: "border-violet-200 bg-violet-50 text-violet-700",
      }}
      headerExtras={
        <Badge variant="secondary" className="hidden text-[11px] md:inline-flex">
          {stats.groups} groups · {stats.students} students
        </Badge>
      }
      onLogout={logout}
    >
      {activeTab === "dashboard" && (
        <OverviewDashboard
          refreshKey={refreshKey}
          onSelectTab={(id) => setActiveTab(id as TabKey)}
          accent="violet"
        />
      )}

      {activeTab === "groups" && <GroupsManager canCreate={false} onChanged={bump} />}
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
      {activeTab === "finance" && <FinanceManager onChanged={bump} />}
    </AdminShell>
  )
}
