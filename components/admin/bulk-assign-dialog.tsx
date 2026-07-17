"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Clock, Infinity, UserPlus, Users } from "lucide-react"
import type { Group } from "@/lib/admin-storage"
import { groupMemberCount } from "@/lib/admin-storage"
import { homeworkApi } from "@/lib/api"
import { useAdminData } from "@/lib/admin-data-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { AssignableExercisePayload } from "@/components/admin/exercise-assign-table"

interface BulkAssignDialogProps {
  items: AssignableExercisePayload[]
  groups: Group[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
  createdByName: string
}

function defaultLimitForItem(item: AssignableExercisePayload): string {
  return String(item.defaultTimeLimitMinutes ?? item.estimatedMinutes ?? 20)
}

function buildPerItemLimits(items: AssignableExercisePayload[]): Record<string, string> {
  return Object.fromEntries(
    items.filter((i) => i.timeLimitKind).map((i) => [i.id, defaultLimitForItem(i)]),
  )
}

export function BulkAssignDialog({
  items,
  groups,
  open,
  onOpenChange,
  onAssigned,
  createdByName,
}: BulkAssignDialogProps) {
  const { toast } = useToast()
  const { students } = useAdminData()
  const [groupId, setGroupId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [unlimited, setUnlimited] = useState(true)
  const [perItemLimits, setPerItemLimits] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState(false)

  const timedItems = useMemo(
    () => items.filter((item) => item.timeLimitKind != null),
    [items],
  )

  const supportsTimeLimit = timedItems.length > 0
  const multipleTimed = timedItems.length > 1

  useEffect(() => {
    if (!open) return
    setGroupId("")
    setUnlimited(true)
    setPerItemLimits(buildPerItemLimits(items))
    setDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10))
  }, [open, items])

  const updateItemLimit = (id: string, value: string) => {
    setPerItemLimits((prev) => ({ ...prev, [id]: value }))
  }

  const resolveTimeLimitMinutes = (item: AssignableExercisePayload): number | undefined => {
    if (!item.timeLimitKind) return undefined
    if (unlimited) return undefined
    const parsed = Number.parseInt(perItemLimits[item.id] ?? "", 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }

  const submit = async () => {
    if (items.length === 0) return
    if (!groupId) {
      toast({ title: "Pick a group", variant: "destructive" })
      return
    }
    if (!dueDate) {
      toast({ title: "Pick a due date", variant: "destructive" })
      return
    }

    if (supportsTimeLimit && !unlimited) {
      const invalid = timedItems.find((item) => resolveTimeLimitMinutes(item) == null)
      if (invalid) {
        toast({
          title: "Enter a valid time limit",
          description: `Check the time for “${invalid.title}”.`,
          variant: "destructive",
        })
        return
      }
    }

    const dueIso = new Date(dueDate).toISOString()
    setAssigning(true)
    try {
      await Promise.all(
        items.map((item) =>
          homeworkApi.create({
            title: item.title,
            description: item.description,
            subject: item.subject,
            groupId,
            dueAt: dueIso,
            estimatedMinutes: Math.max(1, item.estimatedMinutes),
            createdBy: createdByName,
            exerciseSlug: item.exerciseSlug,
            timeLimitMinutes: resolveTimeLimitMinutes(item),
          }),
        ),
      )
      toast({
        title:
          items.length === 1
            ? "Exercise assigned to group"
            : `${items.length} exercises assigned to group`,
      })
      onAssigned()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Could not assign",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            Assign to group
          </DialogTitle>
          <DialogDescription>
            {items.length === 1 ? (
              <span className="font-medium text-slate-900">{items[0]?.title}</span>
            ) : (
              <>
                <span className="font-medium text-slate-900">{items.length} exercises</span>
                <span className="text-slate-500"> will be assigned as separate homework tasks.</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          <div className="space-y-1.5">
            <Label>Group *</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder={groups.length === 0 ? "No groups yet" : "Pick a group"} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {g.name}
                      <span className="text-xs text-slate-500">
                        · {groupMemberCount(students, g.id)} student
                        {groupMemberCount(students, g.id) === 1 ? "" : "s"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-assign-due">Due date *</Label>
            <Input
              id="bulk-assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {supportsTimeLimit && (
            <div className="space-y-2">
              <Label>Time limit</Label>

              {unlimited ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setUnlimited(false)}
                    aria-pressed
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                    )}
                  >
                    <Infinity className="h-3.5 w-3.5" />
                    Unlimited for all
                  </button>
                  <p className="text-[11px] text-slate-500">
                    {multipleTimed
                      ? "Click to set an individual time limit for each exercise."
                      : "Click to set a time limit for this exercise."}
                  </p>
                  {items.length > 1 && (
                    <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                      {items.map((item) => (
                        <p key={item.id} className="truncate text-sm text-slate-700">
                          {item.title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setUnlimited(true)}
                    className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                  >
                    Use unlimited time for all
                  </button>

                  <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {timedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-3 py-2.5 sm:gap-3"
                      >
                        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">
                          {item.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <div className="relative">
                            <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="number"
                              min={1}
                              value={perItemLimits[item.id] ?? ""}
                              onChange={(e) => updateItemLimit(item.id, e.target.value)}
                              className="h-9 w-20 pl-8 sm:w-24"
                              aria-label={`Time limit for ${item.title}`}
                            />
                          </div>
                          <span className="text-xs text-slate-500">min</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {items.length > timedItems.length && (
                    <p className="text-[11px] text-slate-500">
                      {items.length - timedItems.length} selected task
                      {items.length - timedItems.length === 1 ? "" : "s"} without a time limit.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={assigning} disabled={items.length === 0}>
            {assigning
              ? "Assigning…"
              : items.length === 1
                ? "Assign"
                : `Assign ${items.length} tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
