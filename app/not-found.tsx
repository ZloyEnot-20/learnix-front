import { Compass, Home } from "lucide-react"
import { StatusScreen } from "@/components/status-screen"

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      icon={<Compass className="h-7 w-7" />}
      title="Page not found"
      description="The page you're looking for doesn't exist, was moved, or the link is broken."
      actions={[
        { label: "Back to home", href: "/", icon: <Home className="h-4 w-4" /> },
        { label: "Go to dashboard", href: "/dashboard", variant: "secondary" },
      ]}
    />
  )
}
