"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * The teacher panel has been consolidated into the admin panel. Teachers (and
 * all staff) now use /admin. This page just redirects there.
 */
export default function TeacherPanelRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
    </div>
  )
}
