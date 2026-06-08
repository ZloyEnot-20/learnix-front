"use client"

import { useEffect, useState } from "react"
import { HomeworkSection } from "@/components/homework-section"
import { CardGridSkeleton } from "@/components/admin/skeletons"
import { getMyHomework } from "@/lib/homework-cache"
import { getExercises, peekExerciseBySlug } from "@/lib/exercises-cache"
import { parseVocabHomeworkSlug } from "@/lib/vocabulary-data"

type Status = "pending" | "in_progress" | "completed"

interface HomeworkItem {
  id: string
  subject: "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"
  title: string
  description: string
  dueAt: string
  /** When the homework was assigned — newest assignments sort to the top. */
  createdAt: string
  status: Status
  /** Countdown limit in minutes; undefined = unlimited. */
  timeLimitMinutes?: number
  /** When the work was submitted/graded — used to group the History tab. */
  completedAt?: string
  failedCheating?: boolean
  href?: string
}

const STATUS_ORDER: Record<Status, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
}

export function StudentHomeworkSection({
  studentId,
  studentName,
  studentEmail,
}: {
  studentId: string
  studentName: string
  studentEmail: string
}) {
  const [items, setItems] = useState<HomeworkItem[] | null>(null)

  useEffect(() => {
    let cancelled = false

    // Preload the homework list and the exercise catalogue together so that
    // opening an individual assignment afterwards resolves instantly (no spinner
    // on the runner page — both the exercise and its time limit are cached).
    Promise.all([getMyHomework(), getExercises()])
      .then(([entries]) => {
        if (cancelled) return
        const mapped: HomeworkItem[] = entries.map(({ homework, submission }) => {
          const failedCheating =
            submission.integrityStatus === "cheating_detected" ||
            submission.attempt?.failedDueToCheating

          const status: Status =
            failedCheating || submission.status === "submitted" || submission.status === "graded"
              ? "completed"
              : submission.status === "in_progress" || submission.status === "paused"
                ? "in_progress"
                : "pending"

          let href: string | undefined
          if (homework.subject === "grammar" && homework.exerciseSlug) {
            const ex = peekExerciseBySlug(homework.exerciseSlug)
            if (ex) href = `/exercises/${ex.topic}/${ex.slug}?hw=${homework.id}`
          } else if (homework.subject === "vocabulary") {
            const deckSlug = parseVocabHomeworkSlug(homework.exerciseSlug)
            if (deckSlug) href = `/vocabulary/${deckSlug}?hw=${homework.id}`
          }

          return {
            id: homework.id,
            subject: homework.subject,
            title: homework.title,
            description: homework.description,
            dueAt: homework.dueAt,
            createdAt: homework.createdAt,
            status,
            timeLimitMinutes: homework.timeLimitMinutes,
            completedAt: submission.submittedAt ?? undefined,
            failedCheating,
            href,
          }
        })

        mapped.sort((a, b) => {
          const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          if (s !== 0) return s
          // Within the same status, show the most recently assigned homework
          // first so brand-new tasks always appear at the top of the list.
          const byAssigned = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          if (byAssigned !== 0) return byAssigned
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
        })

        setItems(mapped)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })

    return () => {
      cancelled = true
    }
  }, [studentId, studentName, studentEmail])

  if (items === null) {
    return <CardGridSkeleton count={4} columns={2} />
  }

  return <HomeworkSection items={items} />
}
