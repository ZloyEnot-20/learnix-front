"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, redirectAfterAuth } from "@/lib/auth-context"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
export default function LoginPage() {
  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { login: signIn } = useAuth()
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
      const u = await signIn(loginValue, password)
      router.push(redirectAfterAuth(u.type))
    } catch {
      setError("Invalid login or password")
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
              <Label htmlFor="login">Login</Label>
              <Input
                id="login"
                type="text"
                placeholder="your.login"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                required
                autoComplete="username"
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
              className="w-full bg-primary hover:bg-primary/90"
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
