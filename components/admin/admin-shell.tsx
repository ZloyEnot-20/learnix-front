"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LogOut, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

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
  onLogout: () => void
  children: ReactNode
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
  onLogout,
  children,
}: AdminShellProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const RoleIcon = role.icon

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
        {sections.map((section, idx) => (
          <div key={idx} className={cn("space-y-1", idx > 0 && "mt-5")}>
            {section.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            )}
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
          </div>
        ))}
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
