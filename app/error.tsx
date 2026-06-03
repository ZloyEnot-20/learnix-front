"use client"

import { useEffect } from "react"
import { Home, RotateCcw, TriangleAlert } from "lucide-react"
import { StatusScreen } from "@/components/status-screen"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface for debugging without leaking details to the user.
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      code="500"
      icon={<TriangleAlert className="h-7 w-7" />}
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. You can try again or head back home."
      actions={[
        { label: "Try again", onClick: () => reset(), icon: <RotateCcw className="h-4 w-4" /> },
        { label: "Back to home", href: "/", variant: "secondary", icon: <Home className="h-4 w-4" /> },
      ]}
    />
  )
}
