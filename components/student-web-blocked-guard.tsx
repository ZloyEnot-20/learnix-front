"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { StudentWebUnavailableScreen } from "@/components/student-web-unavailable-screen"

export function StudentWebBlockedGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth()

  if (isLoading) return null

  if (user?.type === "student") {
    return <StudentWebUnavailableScreen onSignOut={() => logout()} />
  }

  return <>{children}</>
}
