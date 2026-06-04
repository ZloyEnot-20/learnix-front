"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi, type AuthUser } from "./api"
import { setTokens, clearTokens, getAccessToken } from "./api-client"

export type UserRole = "super_admin" | "admin" | "teacher" | "student"

/** Roles allowed into the admin panel. */
export function canAccessAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin" || role === "teacher"
}

/** Admin-level roles (super admin + admin). */
export function isAdminRole(role: UserRole): boolean {
  return role === "super_admin" || role === "admin"
}

interface TestResult {
  id: string
  type: "reading" | "listening" | "writing" | "speaking"
  score: number
  date: string
  completed: boolean
}

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isPremium: boolean
  /** CRM student record id (for role=student); falls back to user id. */
  studentId?: string
  testHistory: TestResult[]
  completedSections: {
    reading: boolean
    listening: boolean
    writing: boolean
  }
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string) => Promise<User>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** Quick-login accounts created by the backend `npm run seed`. */
export const DEMO_ACCOUNTS: Array<{
  email: string
  password: string
  name: string
  role: UserRole
}> = [
  { email: "superadmin@ielts.com", password: "super123", name: "Super Admin", role: "super_admin" },
  { email: "student@ielts.com", password: "student123", name: "Student", role: "student" },
]

function toUser(u: AuthUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isPremium: u.isPremium,
    studentId: u.studentId ?? (u.role === "student" ? u.id : undefined),
    testHistory: [],
    completedSections: { reading: true, listening: true, writing: true },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore the session from the stored access token on mount.
  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (!getAccessToken()) {
        setIsLoading(false)
        return
      }
      try {
        const { user: u } = await authApi.me()
        if (!cancelled) setUser(toUser(u))
      } catch {
        clearTokens()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email.trim().toLowerCase(), password)
    setTokens(res.accessToken, res.refreshToken)
    const next = toUser(res.user)
    setUser(next)
    return next
  }

  const register = async (email: string, password: string, name: string): Promise<User> => {
    const res = await authApi.register(email.trim().toLowerCase(), password, name)
    setTokens(res.accessToken, res.refreshToken)
    const next = toUser(res.user)
    setUser(next)
    return next
  }

  const logout = () => {
    setUser(null)
    clearTokens()
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
