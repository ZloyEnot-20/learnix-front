"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { authApi, type AuthUser, type OrgStatus } from "./api"
import { setTokens, clearTokens, getAccessToken } from "./api-client"

/** User type in the tenant `users` collection. */
export type UserType = "super_admin" | "admin" | "teacher" | "student"

/** @deprecated Use UserType */
export type UserRole = UserType

export const USER_TYPE_LABELS: Record<UserType, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Organization admin",
  super_admin: "Super admin",
}

/** Types allowed into the admin panel. */
export function canAccessAdmin(type: UserType): boolean {
  return type === "super_admin" || type === "admin" || type === "teacher"
}

/** Post-login route for the web app. */
export function redirectAfterAuth(type: UserType): string {
  if (type !== "student") return "/admin"
  return "/mobile-only"
}

/** Admin-level types (super admin + org admin). */
export function isAdminType(type: UserType): boolean {
  return type === "super_admin" || type === "admin"
}

/** @deprecated Use isAdminType */
export const isAdminRole = isAdminType

/** Platform administration (content import, etc.). */
export function isSuperAdmin(type: UserType): boolean {
  return type === "super_admin"
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
  login: string
  email: string
  name: string
  type: UserType
  isPremium: boolean
  testHistory: TestResult[]
  completedSections: {
    reading: boolean
    listening: boolean
    writing: boolean
  }
}

interface AuthContextType {
  user: User | null
  orgStatus: OrgStatus
  login: (login: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string) => Promise<User>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toUser(u: AuthUser): User {
  return {
    id: u.id,
    login: u.login || u.email,
    email: u.email,
    name: u.name,
    type: u.type,
    isPremium: u.isPremium,
    testHistory: [],
    completedSections: { reading: true, listening: true, writing: true },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [orgStatus, setOrgStatus] = useState<OrgStatus>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (!getAccessToken()) {
        setIsLoading(false)
        return
      }
      try {
        const { user: u, orgStatus: status } = await authApi.me()
        if (!cancelled) {
          setUser(toUser(u))
          setOrgStatus(status ?? null)
        }
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

  const login = async (loginValue: string, password: string): Promise<User> => {
    const res = await authApi.login(loginValue.trim().toLowerCase(), password)
    setTokens(res.accessToken, res.refreshToken)
    const next = toUser(res.user)
    setUser(next)
    setOrgStatus(res.orgStatus ?? null)
    return next
  }

  const register = async (email: string, password: string, name: string): Promise<User> => {
    const res = await authApi.register(email.trim().toLowerCase(), password, name)
    setTokens(res.accessToken, res.refreshToken)
    const next = toUser(res.user)
    setUser(next)
    setOrgStatus(res.orgStatus ?? null)
    return next
  }

  const logout = () => {
    setUser(null)
    setOrgStatus(null)
    clearTokens()
  }

  return (
    <AuthContext.Provider value={{ user, orgStatus, login, register, logout, isLoading }}>
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
