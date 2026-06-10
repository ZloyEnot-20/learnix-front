import { cn } from "@/lib/utils"

/** Matches learnix-mobile primaryLight / primary hint palette. */
export const validationHintStyles =
  "rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#111827]"

export function ValidationHint({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p role="alert" className={cn(validationHintStyles, className)}>
      {children}
    </p>
  )
}
