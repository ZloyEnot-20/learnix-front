"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChevronDown, LogOut, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_COLLAPSE_STORAGE_KEY = "learnix-admin-nav-collapsed"
const NAV_SECTION_ANIMATION_MS = 300

function readCollapsedSections(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(NAV_COLLAPSE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  /** If set, clicking navigates to this URL instead of selecting a tab. */
  href?: string
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

interface AdminShellProps {
  title: string
  subtitle?: string
  sections: NavSection[]
  active: string
  onSelect: (id: string) => void
  user: { name: string; email: string }
  role: { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
  headerExtras?: ReactNode
  topBanner?: ReactNode
  onLogout: () => void
  children: ReactNode
}

function navSectionKey(section: NavSection, idx: number): string {
  return section.label?.toLowerCase().replace(/\s+/g, "-") ?? `section-${idx}`
}

export function AdminShell({
  title,
  subtitle,
  sections,
  active,
  onSelect,
  user,
  role,
  headerExtras,
  topBanner,
  onLogout,
  children,
}: AdminShellProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState(readCollapsedSections)
  const RoleIcon = role.icon

  useEffect(() => {
    localStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedSections))
  }, [collapsedSections])

  useEffect(() => {
    sections.forEach((section, idx) => {
      const key = navSectionKey(section, idx)
      const hasActive = section.items.some((item) => !item.href && item.id === active)
      if (!hasActive) return
      setCollapsedSections((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    })
  }, [active, sections])

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  const Nav = ({ inSheet = false }: { inSheet?: boolean }) => (
    <nav className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 px-5 py-5", inSheet && "px-4")}>
        <IELTSLogo />
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            role.className,
          )}
        >
          <RoleIcon className="h-3 w-3" />
          {role.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, idx) => {
          const key = navSectionKey(section, idx)
          const isOpen = !collapsedSections[key]
          const collapsible = !!section.label

          return (
            <div key={key} className={cn(idx > 0 && "mt-3")}>
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}

              <CollapsibleNavItems open={!collapsible || isOpen}>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = !item.href && active === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.href) router.push(item.href)
                        else onSelect(item.id)
                        if (inSheet) setMobileOpen(false)
                      }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                            isActive
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </CollapsibleNavItems>
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C8102E] to-[#A00D25] text-xs font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            onClick={onLogout}
            className="h-8 w-8 text-slate-400 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Nav />
      </aside>

      <div className="lg:pl-64">
        {topBanner}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
                <Nav inSheet />
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
              {subtitle && (
                <p className="hidden text-xs text-slate-500 sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">{headerExtras}</div>
        </header>

        <main className="w-full p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function CollapsibleNavItems({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] ease-in-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
      style={{ transitionDuration: `${NAV_SECTION_ANIMATION_MS}ms` }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="space-y-1 pt-0.5">{children}</div>
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
