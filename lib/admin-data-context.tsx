"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Group, Student } from "./admin-storage"
import {
  getGroups,
  getStudents,
  getHomeworkCount,
  peekGroups,
  peekStudents,
  peekHomeworkCount,
} from "./admin-cache"

interface AdminDataContextValue {
  students: Student[]
  groups: Group[]
  /** Number of homework assignments — for the nav badge. */
  homeworkCount: number
  /** True after the initial load attempt has finished. */
  ready: boolean
  refreshStudents: (force?: boolean) => Promise<Student[]>
  refreshGroups: (force?: boolean) => Promise<Group[]>
  refreshAll: (force?: boolean) => Promise<{ students: Student[]; groups: Group[] }>
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null)

/**
 * Loads students + groups once for the whole admin session. Child sections read
 * from context instead of fetching on every tab switch.
 */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(() => peekStudents() ?? [])
  const [groups, setGroups] = useState<Group[]>(() => peekGroups() ?? [])
  const [homeworkCount, setHomeworkCount] = useState<number>(
    () => peekHomeworkCount() ?? 0,
  )
  const [ready, setReady] = useState(
    () => peekStudents() !== undefined && peekGroups() !== undefined,
  )

  const refreshStudents = useCallback(async (force = false) => {
    const data = await getStudents(force)
    setStudents(data)
    return data
  }, [])

  const refreshGroups = useCallback(async (force = false) => {
    const data = await getGroups(force)
    setGroups(data)
    return data
  }, [])

  const refreshHomeworkCount = useCallback(async (force = false) => {
    try {
      const count = await getHomeworkCount(force)
      setHomeworkCount(count)
    } catch {
      /* keep previous count on failure */
    }
  }, [])

  const refreshAll = useCallback(
    async (force = false) => {
      const [s, g] = await Promise.all([
        refreshStudents(force),
        refreshGroups(force),
        refreshHomeworkCount(force),
      ])
      setStudents(s)
      setGroups(g)
      setReady(true)
      return { students: s, groups: g }
    },
    [refreshStudents, refreshGroups, refreshHomeworkCount],
  )

  // Single load when the admin shell mounts — not on every section change.
  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  const value = useMemo(
    () => ({
      students,
      groups,
      homeworkCount,
      ready,
      refreshStudents,
      refreshGroups,
      refreshAll,
    }),
    [
      students,
      groups,
      homeworkCount,
      ready,
      refreshStudents,
      refreshGroups,
      refreshAll,
    ],
  )

  return (
    <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
  )
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext)
  if (!ctx) {
    throw new Error("useAdminData must be used within AdminDataProvider")
  }
  return ctx
}
