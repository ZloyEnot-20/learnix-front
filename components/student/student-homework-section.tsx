"use client"

import { useEffect, useState } from "react"
import { HomeworkSection } from "@/components/homework-section"
import { CardGridSkeleton } from "@/components/admin/skeletons"
import { ensureGrammarSeed } from "@/lib/grammar-storage"
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
  status: Status
  /** Countdown limit in minutes; undefined = unlimited. */
  timeLimitMinutes?: number
  /** When the work was submitted/graded — used to group the History tab. */
  completedAt?: string
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
    ensureGrammarSeed()
    let cancelled = false

    // Preload the homework list and the exercise catalogue together so that
    // opening an individual assignment afterwards resolves instantly (no spinner
    // on the runner page — both the exercise and its time limit are cached).
    Promise.all([getMyHomework(), getExercises()])
      .then(([entries]) => {
        if (cancelled) return
        const mapped: HomeworkItem[] = entries.map(({ homework, submission }) => {
          const status: Status =
            submission.status === "submitted" || submission.status === "graded"
              ? "completed"
              : submission.status === "in_progress"
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
            status,
            timeLimitMinutes: homework.timeLimitMinutes,
            completedAt: submission.submittedAt ?? undefined,
            href,
          }
        })

        mapped.sort((a, b) => {
          const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
          if (s !== 0) return s
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
