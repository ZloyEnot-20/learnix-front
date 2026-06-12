import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface StatusAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary"
  icon?: ReactNode
}

interface StatusScreenProps {
  /** Big code shown in the background, e.g. "404" or "403". */
  code?: string
  icon?: ReactNode
  title: string
  description?: string
  actions?: StatusAction[]
}

/**
 * Full-screen branded status page used for 404 / 403 / runtime errors.
 * Pure presentational component — safe to render from both server and client.
 */
export function StatusScreen({ code, icon, title, description, actions = [] }: StatusScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(200,16,46,0.08),_transparent_55%)]" />

      {code && (
        <span
          aria-hidden
          className="pointer-events-none select-none bg-gradient-to-b from-slate-200 to-slate-100 bg-clip-text text-[9rem] font-black leading-none tracking-tighter text-transparent sm:text-[12rem]"
        >
          {code}
        </span>
      )}

      <div className={cn("relative z-10 flex flex-col items-center", code && "-mt-10 sm:-mt-16")}>
        {icon && (
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}

        <h1 className="max-w-md text-balance text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>

        {description && (
          <p className="mt-3 max-w-md text-pretty text-sm text-slate-500 sm:text-base">{description}</p>
        )}

        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, idx) => {
              const className = cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                action.variant === "secondary"
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
              )
              if (action.href) {
                return (
                  <Link key={idx} href={action.href} className={className}>
                    {action.icon}
                    {action.label}
                  </Link>
                )
              }
              return (
                <button key={idx} type="button" onClick={action.onClick} className={className}>
                  {action.icon}
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
