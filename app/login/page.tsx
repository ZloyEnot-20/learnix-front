"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DEMO_ACCOUNTS, useAuth, type UserRole } from "@/lib/auth-context"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ShieldAlert, User } from "lucide-react"
import Link from "next/link"

const ROLE_META: Partial<Record<UserRole, { label: string; Icon: typeof User; accent: string }>> = {
  super_admin: { label: "Super Admin", Icon: ShieldAlert, accent: "text-amber-700 bg-amber-50 border-amber-200" },
  student: { label: "Student", Icon: User, accent: "text-sky-700 bg-sky-50 border-sky-200" },
}

function redirectFor(role: UserRole): string {
  // All staff roles (super admin / admin / teacher) live in the admin panel.
  if (role !== "student") return "/admin"
  return "/dashboard"
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // useEffect(() => {
  //   const script = document.createElement("script")
  //   script.src = "https://telegram.org/js/telegram-widget.js?22"
  //   script.async = true
  //   script.setAttribute("data-telegram-login", "online_posuda_bot")
  //   script.setAttribute("data-size", "large")
  //   script.setAttribute("data-userpic", "false")
  //   script.setAttribute("data-request-access", "write")
  //   script.setAttribute("data-auth-url", "https://v0-ielts-six.vercel.app/api/telegram-auth")
  //   document.getElementById("telegram-login-container")?.appendChild(script)
  // }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const u = await login(email, password)
      router.push(redirectFor(u.role))
    } catch {
      setError("Invalid email or password")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError("")
    setSubmitting(true)
    setEmail(demoEmail)
    setPassword(demoPassword)
    try {
      const u = await login(demoEmail, demoPassword)
      router.push(redirectFor(u.role))
    } catch {
      setError("Demo login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <IELTSLogo />
          </div>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">Sign in to continue your IELTS preparation</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              loading={submitting}
              className="w-full bg-[#C8102E] hover:bg-[#A00D25]"
            >
              Sign In
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Quick login
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const meta = ROLE_META[acc.role]
              if (!meta) return null
              const Icon = meta.Icon
              return (
                <button
                  key={acc.email}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin(acc.email, acc.password)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border ${meta.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      Sign in as {meta.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{acc.email}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-slate-700">
                    →
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/register" className="text-[#C8102E] hover:underline font-medium">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
