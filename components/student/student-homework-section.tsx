"use client"

import { useEffect, useState } from "react"
import { HomeworkSection } from "@/components/homework-section"
import {
  ensureStudentAccount,
  ensureDemoHomework,
  ensureSeeded,
  listStudentHomework,
} from "@/lib/admin-storage"
import { ensureGrammarSeed, getGrammarExercise } from "@/lib/grammar-storage"

type Status = "pending" | "in_progress" | "completed"

interface HomeworkItem {
  id: string
  subject: "reading" | "listening" | "writing" | "speaking" | "grammar"
  title: string
  description: string
  dueAt: string
  status: Status
  /** Countdown limit in minutes; undefined = unlimited. */
  timeLimitMinutes?: number
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
    ensureSeeded()
    ensureGrammarSeed()
    ensureStudentAccount({ id: studentId, name: studentName, email: studentEmail })
    ensureDemoHomework()

    const mapped: HomeworkItem[] = listStudentHomework(studentId).map(
      ({ homework, submission }) => {
        const status: Status =
          submission.status === "submitted" || submission.status === "graded"
            ? "completed"
            : submission.status === "in_progress"
              ? "in_progress"
              : "pending"

        let href: string | undefined
        if (homework.subject === "grammar" && homework.exerciseSlug) {
          const ex = getGrammarExercise(homework.exerciseSlug)
          if (ex) href = `/exercises/${ex.topic}/${ex.slug}?hw=${homework.id}`
        }

        return {
          id: homework.id,
          subject: homework.subject,
          title: homework.title,
          description: homework.description,
          dueAt: homework.dueAt,
          status,
          timeLimitMinutes: homework.timeLimitMinutes,
          href,
        }
      },
    )

    mapped.sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (s !== 0) return s
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })

    setItems(mapped)
  }, [studentId, studentName, studentEmail])

  return <HomeworkSection items={items ?? []} />
}
