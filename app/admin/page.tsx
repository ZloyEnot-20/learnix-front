"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  Wallet,
  UserSquare,
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

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Overview", subtitle: "Platform snapshot and key metrics" },
  groups: { title: "Groups", subtitle: "Create groups and assign students" },
  students: { title: "Students", subtitle: "Manage student profiles" },
  tests: { title: "IELTS Tests", subtitle: "Browse and remove existing tests" },
  homework: { title: "Homework", subtitle: "Assign tasks to groups and track submissions" },
  entry: { title: "Entry Test", subtitle: "Assign placement tests and grade writing" },
  exercises: { title: "Exercises", subtitle: "Grammar topics — preview and assign to groups" },
  finance: { title: "Finance", subtitle: "Payments and revenue by group" },
}

export default function AdminPanel() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [platformStats, setPlatformStats] = useState({
    groups: 0,
    students: 0,
    homework: 0,
    tests: 0,
  })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push(user ? "/dashboard" : "/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    ensureSeeded()

    let savedTests = JSON.parse(localStorage.getItem("adminTests") || "{}")
    if (Object.keys(savedTests).length === 0) {
      const defaultTests = {
        "reading-001": {
          testId: "reading-001",
          title: "IELTS Academic Reading",
          type: "reading",
          partCount: 3,
          totalTime: 60,
          createdAt: new Date().toISOString(),
          parts: [],
        },
        "listening-001": {
          testId: "listening-001",
          title: "IELTS Academic Listening",
          type: "listening",
          partCount: 4,
          totalTime: 30,
          createdAt: new Date().toISOString(),
          parts: [],
        },
        "writing-001": {
          testId: "writing-001",
          title: "IELTS Academic Writing",
          type: "writing",
          partCount: 2,
          totalTime: 60,
          createdAt: new Date().toISOString(),
          parts: [],
        },
        "speaking-001": {
          testId: "speaking-001",
          title: "IELTS Speaking",
          type: "speaking",
          partCount: 3,
          totalTime: 15,
          createdAt: new Date().toISOString(),
          parts: [],
        },
      }
      localStorage.setItem("adminTests", JSON.stringify(defaultTests))
      savedTests = defaultTests
    }

    setPlatformStats({
      groups: listGroups().length,
      students: listStudents().length,
      homework: listHomework().length,
      tests: Object.keys(savedTests).length,
    })
  }, [refreshKey])

  const bump = () => setRefreshKey((k) => k + 1)

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }
  if (user.role !== "admin") return null

  const totalTests = platformStats.tests

  const sections: NavSection[] = [
    {
      label: "General",
      items: [{ id: "dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      label: "People",
      items: [
        { id: "groups", label: "Groups", icon: Users, badge: platformStats.groups },
        { id: "students", label: "Students", icon: UserSquare, badge: platformStats.students },
      ],
    },
    {
      label: "Teaching",
      items: [
        { id: "tests", label: "IELTS Tests", icon: ListChecks, badge: totalTests },
        { id: "homework", label: "Homework", icon: ClipboardList, badge: platformStats.homework },
        { id: "entry", label: "Entry Test", icon: ClipboardCheck },
        { id: "exercises", label: "Exercises", icon: GraduationCap },
      ],
    },
    {
      label: "Money",
      items: [{ id: "finance", label: "Finance", icon: Wallet }],
    },
  ]

  const meta = SECTION_TITLES[activeTab] ?? SECTION_TITLES.dashboard

  return (
    <AdminShell
      title={meta.title}
      subtitle={meta.subtitle}
      sections={sections}
      active={activeTab}
      onSelect={setActiveTab}
      user={{ name: user.name, email: user.email }}
      role={{
        label: "Admin",
        icon: ShieldCheck,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      }}
      headerExtras={
        <Badge variant="secondary" className="hidden text-[11px] md:inline-flex">
          {totalTests} IELTS · {platformStats.groups} groups · {platformStats.students} students
        </Badge>
      }
      onLogout={logout}
    >
      {activeTab === "dashboard" && (
        <OverviewDashboard
          refreshKey={refreshKey}
          onSelectTab={setActiveTab}
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
      {activeTab === "finance" && <FinanceManager onChanged={bump} />}
    </AdminShell>
  )
}
