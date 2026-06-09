"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Copy,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserMinus,
  UserPlus,
} from "lucide-react"
import type { StaffRole, StaffUser } from "@/lib/admin-storage"
import { usersApi, studentsApi } from "@/lib/api"
import { TableSkeleton } from "./skeletons"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { isSuperAdmin, type UserRole } from "@/lib/auth-context"
import { ConfirmDialog } from "@/components/confirm-dialog"

const ROLE_META: Record<
  StaffRole,
  { label: string; badge: string; icon: typeof ShieldCheck }
> = {
  super_admin: {
    label: "Super Admin",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    icon: ShieldCheck,
  },
  admin: {
    label: "Admin",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    icon: ShieldCheck,
  },
  teacher: {
    label: "Teacher",
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    icon: GraduationCap,
  },
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

interface UsersManagerProps {
  actorRole: UserRole
  actorId: string
  onChanged?: () => void
}

export default function UsersManager({ actorRole, actorId, onChanged }: UsersManagerProps) {
  const { toast } = useToast()
  const superAdmin = isSuperAdmin(actorRole)

  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all")

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editUser, setEditUser] = useState<StaffUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<StaffUser | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(null)

  const [loginSuggestions, setLoginSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const [form, setForm] = useState({
    name: "",
    login: "",
    email: "",
    role: "teacher" as StaffRole,
  })

  const creatableRoles: StaffRole[] = superAdmin
    ? ["super_admin", "admin", "teacher"]
    : ["admin", "teacher"]

  const refresh = async (forceToast = false) => {
    try {
      const list = await usersApi.list()
      setUsers(list)
      if (forceToast) toast({ title: "Users refreshed" })
    } catch (err) {
      toast({
        title: "Failed to load users",
        description: err instanceof Error ? err.message : "Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const name = form.name.trim()
    if (name.length < 2) {
      setLoginSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const suggestions = await studentsApi.loginSuggestions(name)
        setLoginSuggestions(suggestions)
      } catch {
        setLoginSuggestions([])
      } finally {
        setLoadingSuggestions(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.name])

  const resetForm = () => {
    setForm({ name: "", login: "", email: "", role: "teacher" })
    setLoginSuggestions([])
  }

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.login.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [users, search, roleFilter])

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "admin" || u.role === "super_admin").length,
      teachers: users.filter((u) => u.role === "teacher").length,
    }),
    [users],
  )

  const submitCreate = async () => {
    if (!form.name.trim() || !form.login.trim()) {
      toast({ title: "Name and login are required", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const trimmedEmail = form.email.trim()
      const res = await usersApi.create({
        name: form.name.trim(),
        login: form.login.trim().toLowerCase(),
        role: form.role,
        ...(trimmedEmail ? { email: trimmedEmail.toLowerCase() } : {}),
      })
      setCredentials({ login: res.user.login, password: res.temporaryPassword })
      toast({ title: "User created", description: res.user.name })
      resetForm()
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not create user",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const submitEdit = async () => {
    if (!editUser) return
    if (!form.name.trim() || !form.login.trim()) {
      toast({ title: "Name and login are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const trimmedEmail = form.email.trim()
      await usersApi.update(editUser.id, {
        name: form.name.trim(),
        login: form.login.trim().toLowerCase(),
        role: form.role,
        email: trimmedEmail ? trimmedEmail.toLowerCase() : "",
      })
      toast({ title: "User updated" })
      setEditUser(null)
      resetForm()
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not update user",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const requestRemove = (user: StaffUser) => {
    if (user.id === actorId) {
      toast({ title: "You cannot delete your own account", variant: "destructive" })
      return
    }
    setPendingRemove(user)
  }

  const confirmRemove = async () => {
    if (!pendingRemove) return
    setRemovingId(pendingRemove.id)
    try {
      await usersApi.remove(pendingRemove.id)
      toast({ title: "User removed" })
      setPendingRemove(null)
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not remove user",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const resetPassword = async (user: StaffUser) => {
    setResettingId(user.id)
    try {
      const res = await usersApi.resetPassword(user.id)
      setCredentials({ login: res.login, password: res.temporaryPassword })
      toast({ title: "Password reset" })
    } catch (err) {
      toast({
        title: "Could not reset password",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setResettingId(null)
    }
  }

  const setTeacherRole = async (user: StaffUser, asTeacher: boolean) => {
    if (user.id === actorId) {
      toast({ title: "You cannot change your own role here", variant: "destructive" })
      return
    }
    const nextRole: StaffRole = asTeacher ? "teacher" : "admin"
    if (user.role === nextRole) return
    if (user.role === "super_admin") {
      toast({ title: "Super admin role cannot be changed here", variant: "destructive" })
      return
    }
    setRoleChangingId(user.id)
    try {
      await usersApi.update(user.id, { role: nextRole })
      toast({
        title: asTeacher ? "Teacher assigned" : "Teacher role removed",
        description: user.name,
      })
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not update role",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRoleChangingId(null)
    }
  }

  const openEdit = (user: StaffUser) => {
    setEditUser(user)
    setForm({
      name: user.name,
      login: user.login,
      email: user.email ?? "",
      role: user.role,
    })
  }

  if (loading) return <TableSkeleton rows={5} columns={5} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total staff" value={counts.total} icon={UserCog} />
          <StatCard label="Admins" value={counts.admins} icon={ShieldCheck} accent="rose" />
          <StatCard label="Teachers" value={counts.teachers} icon={GraduationCap} accent="violet" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              void refresh(true)
            }}
            loading={refreshing}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={() => {
              resetForm()
              setShowCreate(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, login or email…"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {superAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <UserCog className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">No users found</p>
          <p className="text-sm text-slate-500">Add admins and teachers for your organization.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Login</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const meta = ROLE_META[user.role]
                const RoleIcon = meta.icon
                const isSelf = user.id === actorId
                const isTeacher = user.role === "teacher"
                const canToggleTeacher =
                  !isSelf && user.role !== "super_admin" && (user.role === "teacher" || user.role === "admin")

                return (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {initials(user.name)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          {isSelf && <p className="text-[11px] text-slate-400">You</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-700">{user.login}</td>
                    <td className="px-3 py-3 text-slate-600">{user.email || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={cn("gap-1 font-semibold", meta.badge)}>
                        <RoleIcon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canToggleTeacher && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={roleChangingId === user.id}
                            onClick={() => void setTeacherRole(user, !isTeacher)}
                            className={cn(
                              "h-8 px-2 text-xs",
                              isTeacher
                                ? "text-slate-600 hover:text-slate-900"
                                : "text-violet-700 hover:text-violet-900",
                            )}
                            title={isTeacher ? "Remove teacher role" : "Make teacher"}
                          >
                            {isTeacher ? (
                              <>
                                <UserMinus className="mr-1 h-3.5 w-3.5" />
                                Remove teacher
                              </>
                            ) : (
                              <>
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                                Make teacher
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          loading={resettingId === user.id}
                          onClick={() => void resetPassword(user)}
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={isSelf}
                          onClick={() => openEdit(user)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:text-rose-600"
                          loading={removingId === user.id}
                          disabled={isSelf}
                          onClick={() => requestRemove(user)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Create an admin or teacher account for your organization.</DialogDescription>
          </DialogHeader>
          <UserFormFields
            form={form}
            setForm={setForm}
            creatableRoles={creatableRoles}
            loginSuggestions={loginSuggestions}
            loadingSuggestions={loadingSuggestions}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} loading={creating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile details and role.</DialogDescription>
          </DialogHeader>
          <UserFormFields
            form={form}
            setForm={setForm}
            creatableRoles={creatableRoles}
            loginSuggestions={loginSuggestions}
            loadingSuggestions={loadingSuggestions}
            lockRole={editUser?.role === "super_admin" && !superAdmin}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitEdit()} loading={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Delete this user?"
        description={
          pendingRemove && (
            <>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">{pendingRemove.name}</span>. They
              will lose access immediately.
            </>
          )
        }
        onConfirm={confirmRemove}
        loading={!!pendingRemove && removingId === pendingRemove.id}
      />

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login credentials</DialogTitle>
            <DialogDescription>
              Share these credentials securely. The user should change the password after first login.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Login</p>
                  <p className="font-mono font-semibold text-slate-900">{credentials.login}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText(credentials.login, "Login")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Password</p>
                  <p className="font-mono font-semibold text-slate-900">{credentials.password}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText(credentials.password, "Password")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof UserCog
  accent?: "rose" | "violet"
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent === "violet" && "bg-violet-50 text-violet-600",
            accent === "rose" && "bg-rose-50 text-rose-600",
            !accent && "bg-slate-100 text-slate-600",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

function UserFormFields({
  form,
  setForm,
  creatableRoles,
  loginSuggestions,
  loadingSuggestions,
  lockRole,
}: {
  form: { name: string; login: string; email: string; role: StaffRole }
  setForm: Dispatch<
    SetStateAction<{ name: string; login: string; email: string; role: StaffRole }>
  >
  creatableRoles: StaffRole[]
  loginSuggestions: string[]
  loadingSuggestions: boolean
  lockRole?: boolean
}) {
  return (
    <div className="space-y-3 py-2">
      <div>
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Jane Smith"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Login</Label>
        <Input
          value={form.login}
          onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
          placeholder="jane.smith"
          className="mt-1 font-mono text-sm"
        />
        {loadingSuggestions && (
          <p className="mt-1 text-[11px] text-slate-400">Suggesting logins…</p>
        )}
        {loginSuggestions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {loginSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((p) => ({ ...p, login: s }))}
                className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label>Email (optional)</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="jane@school.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Role</Label>
        <Select
          value={form.role}
          disabled={lockRole}
          onValueChange={(v) => setForm((p) => ({ ...p, role: v as StaffRole }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {creatableRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_META[role].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
