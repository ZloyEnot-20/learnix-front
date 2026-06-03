"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Bell,
  BookOpen,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Headphones,
  Mic,
  PenTool,
  Sparkles,
  Trophy,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { notificationsApi, type NotificationItem } from "@/lib/api"
import { cn } from "@/lib/utils"

type NotificationType = NotificationItem["type"]

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; bg: string; fg: string; label: string }
> = {
  homework: {
    icon: ClipboardList,
    bg: "bg-violet-100",
    fg: "text-violet-700",
    label: "Homework",
  },
  result: {
    icon: BookOpen,
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
    label: "Result",
  },
  reminder: {
    icon: Bell,
    bg: "bg-amber-100",
    fg: "text-amber-700",
    label: "Reminder",
  },
  achievement: {
    icon: Trophy,
    bg: "bg-yellow-100",
    fg: "text-yellow-700",
    label: "Achievement",
  },
  system: {
    icon: Sparkles,
    bg: "bg-sky-100",
    fg: "text-sky-700",
    label: "System",
  },
  entry_test: {
    icon: ClipboardCheck,
    bg: "bg-rose-100",
    fg: "text-rose-700",
    label: "Entry test",
  },
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function groupKey(iso: string): "Today" | "Yesterday" | "Earlier" {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return "Today"
  if (sameDay(d, yesterday)) return "Yesterday"
  return "Earlier"
}

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = () => {
    notificationsApi
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true))
  }

  useEffect(() => {
    load()
  }, [])

  // Refresh when the panel is opened so newly-created notifications appear.
  useEffect(() => {
    if (open) load()
  }, [open])

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const grouped = useMemo(() => {
    const groups: Record<"Today" | "Yesterday" | "Earlier", NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    }
    for (const n of items) groups[groupKey(n.createdAt)].push(n)
    return groups
  }, [items])

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    void notificationsApi.markAllRead().catch(() => {})
  }

  const toggleRead = (id: string) => {
    let nextRead = false
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n
        nextRead = !n.read
        return { ...n, read: nextRead }
      }),
    )
    void notificationsApi.markRead(id, nextRead).catch(() => {})
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C8102E] px-1 text-[10px] font-semibold text-white ring-2 ring-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <SheetTitle className="text-lg">Notifications</SheetTitle>
              <SheetDescription>
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "You're all caught up"}
              </SheetDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!loaded && items.length === 0 ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
              <div className="rounded-full bg-slate-100 p-3">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">No notifications</p>
              <p className="text-sm text-slate-500">
                We'll let you know when something new arrives.
              </p>
            </div>
          ) : (
            (["Today", "Yesterday", "Earlier"] as const).map((label) => {
              const group = grouped[label]
              if (group.length === 0) return null
              return (
                <div key={label} className="py-2">
                  <p className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                  <ul className="divide-y divide-slate-100">
                    {group.map((n) => {
                      const meta = TYPE_META[n.type]
                      const Icon = meta.icon
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => toggleRead(n.id)}
                            className={cn(
                              "group relative flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50",
                              !n.read && "bg-slate-50/60",
                            )}
                          >
                            {!n.read && (
                              <span
                                aria-hidden
                                className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#C8102E]"
                              />
                            )}
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                meta.bg,
                              )}
                            >
                              <Icon className={cn("h-4 w-4", meta.fg)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={cn(
                                    "truncate text-sm",
                                    n.read
                                      ? "text-slate-700"
                                      : "font-semibold text-slate-900",
                                  )}
                                >
                                  {n.title}
                                </p>
                                <span className="shrink-0 text-[11px] text-slate-400">
                                  {formatRelative(n.createdAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                {n.message}
                              </p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Re-export icon set used elsewhere if needed
export const HOMEWORK_SUBJECT_ICONS = {
  reading: BookOpen,
  listening: Headphones,
  writing: PenTool,
  speaking: Mic,
}
