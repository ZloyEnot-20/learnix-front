export const STUDENT_NOTIFICATION_TYPE_OPTIONS = [
  { value: "reminder", label: "Important", color: "#FBBF24" },
  { value: "achievement", label: "Success", color: "#34D399" },
  { value: "system", label: "Information", color: "#38BDF8" },
] as const

export type StudentNotificationType =
  (typeof STUDENT_NOTIFICATION_TYPE_OPTIONS)[number]["value"]

export const DEFAULT_STUDENT_NOTIFICATION_TYPE: StudentNotificationType = "reminder"
