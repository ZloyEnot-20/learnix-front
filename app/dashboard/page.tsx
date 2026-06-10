"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Headphones, PenTool, Mic, LogOut, User, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { NotificationsPanel } from "@/components/notifications-panel"
import { StudentHomeworkSection } from "@/components/student/student-homework-section"
import { StudentOverview } from "@/components/student/student-overview"
import { EntryTestCard } from "@/components/student/entry-test-card"
import { LevelScale } from "@/components/student/level-scale"

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  // Avoid hydration mismatch: the server can't know the localStorage-backed
  // auth state, so the first client render must match the server (loading).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push("/login")
    // Staff (super admin / admin / teacher) belong in the admin panel.
    else if (user.type !== "student") router.push("/admin")
  }, [user, isLoading, router])

  if (!mounted || isLoading || !user || user.type !== "student") {
    return <DashboardSkeleton />
  }

  const testSections = [
    {
      id: "reading",
      name: "Reading",
      icon: BookOpen,
      description: "Test your reading comprehension skills",
      duration: "60 minutes",
      questions: "40 questions",
      available: true,
      bg: "#c1bffd"
    },
    {
      id: "listening",
      name: "Listening",
      icon: Headphones,
      description: "Practice listening to various accents",
      duration: "30 minutes",
      questions: "40 questions",
      available: true,
      bg: "#ffcc3e"
    },
    {
      id: "writing",
      name: "Writing",
      icon: PenTool,
      description: "Improve your academic writing skills",
      duration: "60 minutes",
      questions: "2 tasks",
      available: true,
      bg: "	#a7e237"
    },
    {
      id: "speaking",
      name: "Speaking",
      icon: Mic,
      description: "Book a session with an examiner",
      duration: "11-14 minutes",
      questions: "3 parts",
      available: true,
      requiresCompletion: false,
      bg: "#9fcffb"
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-end sm:justify-between">
          <div className="hidden sm:block">
            <IELTSLogo />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <NotificationsPanel />
            <Button
              variant="outline"
              size="icon"
              aria-label="Profile"
              onClick={() => router.push("/profile")}
            >
              <User className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Log out" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Continue your IELTS preparation journey</p>
        </div>

        {/* Entry / placement test — shown when assigned */}
        <EntryTestCard studentId={user.id} />

        {/* Homework — pinned at the top */}
        <StudentHomeworkSection
          studentId={user.id}
          studentName={user.name}
          studentEmail={user.email}
        />

        {/* Level / progress scale */}
        <div className="mb-8">
          <LevelScale studentId={user.id} />
        </div>

        {/* Game Station */}
        <Card className="mb-8 overflow-hidden border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Game Station</h3>
                <p className="text-sm text-slate-600">
                  Play games by level to earn points and unlock harder folders.
                </p>
              </div>
            </div>
            <Link href="/games">
              <Button className="bg-violet-600 hover:bg-violet-700">Play now</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="mb-8">
          <StudentOverview studentName={user.name} />
        </div>

        {/* Test Sections */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Test Sections</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {testSections.map((section) => {
              const Icon = section.icon
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{backgroundColor: section.bg}}>
                          <Icon className="w-6 h-6 text-[#fff]" />
                        </div>
                        <div>
                          <CardTitle>{section.name}</CardTitle>
                          <CardDescription>{section.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        <p>Duration: {section.duration}</p>
                        <p>Questions: {section.questions}</p>
                      </div>
                    </div>
                    <Link href={`/test/${section.id}`}>
                      <Button className="w-full  hover:opacity-[0.7]" style={{backgroundColor: section.bg}}>Start Test</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Test History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Test History</CardTitle>
            <CardDescription>Your latest test attempts and scores</CardDescription>
          </CardHeader>
          <CardContent>
            {user.testHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t taken any tests yet. Start with a section above.
              </p>
            ) : (
              <div className="space-y-4">
                {user.testHistory.slice(0, 5).map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {test.type === "reading" && <BookOpen className="w-5 h-5" />}
                        {test.type === "listening" && <Headphones className="w-5 h-5" />}
                        {test.type === "writing" && <PenTool className="w-5 h-5" />}
                        {test.type === "speaking" && <Mic className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{test.type} Test</p>
                        <p className="text-sm text-muted-foreground">{new Date(test.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{test.score}</p>
                      <Badge variant={test.completed ? "default" : "secondary"}>
                        {test.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-end sm:justify-between">
          <Skeleton className="hidden h-8 w-28 sm:block" />
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 text-right">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>

        {/* Level scale */}
        <Skeleton className="mb-8 h-24 w-full rounded-2xl" />

        {/* Game Station banner */}
        <Skeleton className="mb-8 h-24 w-full rounded-xl" />

        {/* Test sections */}
        <div className="mb-8">
          <Skeleton className="mb-4 h-7 w-44" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-3.5 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
