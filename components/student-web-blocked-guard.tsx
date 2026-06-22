"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { StudentWebUnavailableScreen } from "@/components/student-web-unavailable-screen"

const PUBLIC_PATHS = ["/privacy", "/login", "/register"]

export function StudentWebBlockedGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading, logout } = useAuth()

  if (isLoading) return null

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <>{children}</>
  }

  if (user?.type === "student") {
    return <StudentWebUnavailableScreen onSignOut={() => logout()} />
  }

  return <>{children}</>
}
