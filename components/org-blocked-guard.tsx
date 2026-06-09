"use client"

import type { ReactNode } from "react"
import { Ban, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { StatusScreen } from "@/components/status-screen"

export function OrgBlockedGuard({ children }: { children: ReactNode }) {
  const { user, orgStatus, isLoading, logout } = useAuth()

  if (isLoading) return null

  if (user && orgStatus === "blocked") {
    return (
      <StatusScreen
        code="500"
        icon={<Ban className="h-7 w-7" />}
        title="Organization blocked"
        description="Your organization has been suspended by the platform administrator. Access to Learnix is temporarily unavailable. Please contact support for more information."
        actions={[
          {
            label: "Sign out",
            onClick: () => logout(),
            icon: <LogOut className="h-4 w-4" />,
          },
        ]}
      />
    )
  }

  return <>{children}</>
}
