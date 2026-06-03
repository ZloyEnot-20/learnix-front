"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ClipboardList } from "lucide-react"
import {
  getActiveEntryTestForStudent,
  type EntryTestSubmission,
} from "@/lib/entry-test-storage"
import { cn } from "@/lib/utils"

/** Dashboard banner shown when the student has an assigned placement test. */
export function EntryTestCard({ studentId }: { studentId: string }) {
  const [test, setTest] = useState<EntryTestSubmission | null>(null)

  useEffect(() => {
    setTest(getActiveEntryTestForStudent(studentId) ?? null)
  }, [studentId])

  if (!test) return null

  const sectionsDone =
    (test.mcCompleted ? 1 : 0) +
    (test.readingCompleted ? 1 : 0) +
    (test.writingSubmitted ? 1 : 0)
  const allDone = sectionsDone === 3
  const graded = test.overallLevel != null

  return (
    <Card
      className={cn(
        "mb-8 overflow-hidden",
        graded
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/60"
          : "border-[#C8102E]/30 bg-gradient-to-r from-[#C8102E]/5 to-[#C8102E]/10",
      )}
    >
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white",
              graded ? "bg-emerald-600" : "bg-[#C8102E]",
            )}
          >
            {allDone ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Entry / Placement Test</h3>
            <p className="text-sm text-slate-600">
              {graded
                ? "Your teacher has assessed your level — view your results."
                : allDone
                  ? "All sections submitted — your teacher is reviewing your writing."
                  : `Determine your English level · ${sectionsDone}/3 sections done`}
            </p>
          </div>
        </div>
        <Link href="/entry-test" className="shrink-0">
          <Button
            className={cn(
              graded
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#C8102E] hover:bg-[#A00D25]",
            )}
          >
            {graded ? "View results" : allDone ? "View" : sectionsDone > 0 ? "Continue" : "Start test"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
