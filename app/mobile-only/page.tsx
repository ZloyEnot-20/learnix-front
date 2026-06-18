"use client"

import { useAuth } from "@/lib/auth-context"
import { StudentWebUnavailableScreen } from "@/components/student-web-unavailable-screen"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function MobileOnlyPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return <StudentWebUnavailableScreen onSignOut={() => logout()} />
}
