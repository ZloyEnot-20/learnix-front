import { LogOut, Smartphone } from "lucide-react"
import { StatusScreen } from "@/components/status-screen"

interface StudentWebUnavailableScreenProps {
  onSignOut?: () => void
}

export function StudentWebUnavailableScreen({ onSignOut }: StudentWebUnavailableScreenProps) {
  return (
    <StatusScreen
      code="403"
      icon={<Smartphone className="h-7 w-7" />}
      title="Веб-версия недоступна"
      description="Для студентов веб-версия Learnix недоступна. Войдите через мобильное приложение, чтобы продолжить обучение."
      actions={
        onSignOut
          ? [
              {
                label: "Выйти",
                onClick: onSignOut,
                icon: <LogOut className="h-4 w-4" />,
              },
            ]
          : undefined
      }
    />
  )
}
