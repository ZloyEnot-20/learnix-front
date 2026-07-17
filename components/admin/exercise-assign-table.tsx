"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableCardSkeleton } from "@/components/admin/skeletons"
import { Eye, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

export type AssignableExercisePayload = {
  id: string
  title: string
  description: string
  subject: string
  exerciseSlug: string
  estimatedMinutes: number
  defaultTimeLimitMinutes?: number
  timeLimitKind?: "grammar" | "reading" | "listening"
}

export type ExerciseTableRow = {
  id: string
  title: string
  subtitle?: string
  level?: string
  tags?: string[]
  questionCount?: number
  timeMinutes?: number
  difficulty?: { label: string; cls: string; dot?: string }
  payload: AssignableExercisePayload
}

interface ExerciseAssignTableProps {
  rows: ExerciseTableRow[]
  loading?: boolean
  canAssign?: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onBulkAssign: (items: AssignableExercisePayload[]) => void
  onPreview?: (row: ExerciseTableRow) => void
  emptyMessage?: string
  levelBadgeClass?: (level: string) => string
}

export function ExerciseAssignTable({
  rows,
  loading = false,
  canAssign = false,
  selectedIds,
  onSelectionChange,
  onBulkAssign,
  onPreview,
  emptyMessage = "No exercises found.",
  levelBadgeClass,
}: ExerciseAssignTableProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allSelected = rows.length > 0 && rows.every((r) => selectedSet.has(r.id))
  const someSelected = rows.some((r) => selectedSet.has(r.id))

  const toggleRow = (id: string) => {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const selectAll = () => onSelectionChange(rows.map((r) => r.id))
  const clearSelection = () => onSelectionChange([])

  const selectedPayloads = useMemo(
    () => rows.filter((r) => selectedSet.has(r.id)).map((r) => r.payload),
    [rows, selectedSet],
  )

  if (loading) {
    return <TableCardSkeleton rows={8} columns={canAssign ? 7 : 6} />
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {canAssign && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : "Select exercises to assign"}
            </span>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={selectAll}
              disabled={allSelected}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select all
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={clearSelection}
              disabled={!someSelected}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => onBulkAssign(selectedPayloads)}
            className="gap-1.5 bg-blue-500 text-white hover:bg-blue-600"
          >
            <UserPlus className="h-4 w-4" />
            Assign to group
            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
              {canAssign && (
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => {
                      if (checked) selectAll()
                      else clearSelection()
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
              <TableHead className="hidden sm:table-cell">Level</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Questions</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Time</TableHead>
              <TableHead className="hidden xl:table-cell">Difficulty</TableHead>
              {onPreview && <TableHead className="w-20 text-right pr-4">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const selected = selectedSet.has(row.id)
              return (
                <TableRow
                  key={row.id}
                  data-state={selected ? "selected" : undefined}
                  className={cn(selected && "bg-blue-50/40")}
                >
                  {canAssign && (
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="max-w-[220px] sm:max-w-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{row.title}</p>
                      {row.subtitle && (
                        <p className="truncate text-xs text-slate-500">{row.subtitle}</p>
                      )}
                      {row.tags && row.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                          {row.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px]">
                    {row.tags && row.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {row.level ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                          levelBadgeClass?.(row.level) ??
                            "bg-slate-100 text-slate-700 ring-slate-200/70",
                        )}
                      >
                        {row.level}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-slate-600">
                    {row.questionCount != null ? row.questionCount : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums text-slate-600">
                    {row.timeMinutes != null ? `${row.timeMinutes} min` : "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {row.difficulty ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                          row.difficulty.cls,
                        )}
                      >
                        {row.difficulty.dot && (
                          <span className={cn("h-1.5 w-1.5 rounded-full", row.difficulty.dot)} />
                        )}
                        {row.difficulty.label}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  {onPreview && (
                    <TableCell className="pr-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onPreview(row)}
                        className="h-8 gap-1.5 px-2 text-slate-600"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">Preview</span>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
