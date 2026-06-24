"use client"

import { memo, useEffect, useState } from "react"
import { AlertTriangle, Info, Megaphone, Wrench, X } from "lucide-react"
import type { OrgAnnouncement } from "@/lib/api"
import { getOrgBanner, peekOrgBanner } from "@/lib/org-banner-cache"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<
  OrgAnnouncement["severity"],
  { bar: string; icon: typeof Info }
> = {
  info: { bar: "bg-sky-600", icon: Info },
  warning: { bar: "bg-amber-500", icon: AlertTriangle },
  critical: { bar: "bg-rose-600", icon: AlertTriangle },
}

const DISMISS_KEY = "learnix_dismissed_banners"

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]))
}

export const OrgNewsBanner = memo(function OrgNewsBanner() {
  const [items, setItems] = useState<OrgAnnouncement[]>(() => peekOrgBanner() ?? [])
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())

  useEffect(() => {
    const cached = peekOrgBanner()
    if (cached !== null) {
      setItems(cached)
      return
    }
    let cancelled = false
    getOrgBanner().then((data) => {
      if (!cancelled) setItems(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = items.filter((item) => !dismissed.has(item.id))
  if (!visible.length) return null

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      writeDismissed(next)
      return next
    })
  }

  return (
    <div className="border-b border-slate-200">
      {visible.map((item) => {
        const style = SEVERITY_STYLES[item.severity]
        const Icon = item.type === "maintenance" ? Wrench : style.icon
        return (
          <div
            key={item.id}
            className={cn("flex items-start gap-3 px-4 py-2.5 text-white lg:px-8", style.bar)}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-90" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {item.type === "maintenance" ? (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Maintenance
                  </span>
                ) : (
                  <Megaphone className="h-3.5 w-3.5 opacity-80" />
                )}
                {item.title}
              </p>
              <p className="mt-0.5 text-sm text-white/90">{item.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
})
