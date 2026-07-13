import type { LiveStudentProgress } from "@/lib/books/types"

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export type AnswerRow = {
  id: string
  label: string
  given: string
  expected?: string
  ok?: boolean
}

/** Human-readable rows for teacher panel / inspect modal. */
export function formatStudentAnswerRows(
  student: Pick<LiveStudentProgress, "answers" | "scoreDetail">,
): AnswerRow[] {
  if (student.scoreDetail?.items && student.scoreDetail.items.length > 0) {
    return student.scoreDetail.items.map((item) => ({
      id: item.id,
      label: item.label ?? item.id,
      given: item.given,
      expected: item.expected,
      ok: item.ok,
    }))
  }

  const answers = student.answers
  if (!answers) return []

  if (isRecord(answers)) {
    const kind = String(answers.kind ?? "")

    if (kind === "buckets" && isRecord(answers.placement)) {
      return Object.entries(answers.placement).map(([word, bucket]) => ({
        id: word,
        label: word,
        given: String(bucket),
      }))
    }

    if (kind === "tfng" && isRecord(answers.byNumber)) {
      return Object.entries(answers.byNumber)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([num, value]) => ({
          id: num,
          label: `Question ${num}`,
          given: String(value),
        }))
    }

    if (kind === "list" && Array.isArray(answers.values)) {
      return answers.values.map((value, i) => ({
        id: String(i + 1),
        label: `Answer ${i + 1}`,
        given: String(value ?? "—") || "—",
      }))
    }

    if (kind === "checklist" && Array.isArray(answers.selected)) {
      return answers.selected.map((value, i) => ({
        id: String(i + 1),
        label: `Selected ${i + 1}`,
        given: String(value),
      }))
    }

    if (kind === "speakers" || kind === "expressions") {
      return Object.entries(answers)
        .filter(([k]) => k !== "kind")
        .map(([key, value]) => ({
          id: key,
          label: key.replace(/_/g, " "),
          given: String(value ?? "—") || "—",
        }))
    }

    if (kind === "speakers_detail" && Array.isArray(answers.rows)) {
      return answers.rows.map((row, i) => {
        const r = isRecord(row) ? row : {}
        return {
          id: String(i + 1),
          label: `Speaker ${i + 1}`,
          given: `Who: ${String(r.person ?? "—")} · Adjectives: ${String(r.adjectives ?? "—")}`,
        }
      })
    }

    if (kind === "open") {
      return [
        {
          id: "notes",
          label: "Notes",
          given: String(answers.notes ?? "—") || "—",
        },
      ]
    }

    // Generic object fallback (skip kind)
    return Object.entries(answers)
      .filter(([k]) => k !== "kind")
      .map(([key, value]) => ({
        id: key,
        label: key.replace(/_/g, " "),
        given:
          typeof value === "string" || typeof value === "number"
            ? String(value)
            : Array.isArray(value)
              ? value.map(String).join(", ")
              : JSON.stringify(value),
      }))
  }

  if (Array.isArray(answers)) {
    return answers.map((value, i) => ({
      id: String(i + 1),
      label: `Answer ${i + 1}`,
      given: String(value ?? "—"),
    }))
  }

  return [{ id: "1", label: "Answer", given: String(answers) }]
}

export function percentCorrectLabel(
  s: Pick<LiveStudentProgress, "score" | "scoreDetail">,
): string | null {
  if (s.scoreDetail && s.scoreDetail.total > 0) {
    return `${Math.round((100 * s.scoreDetail.correct) / s.scoreDetail.total)}%`
  }
  if (s.score != null && Number.isFinite(s.score)) {
    return `${Math.round(s.score)}%`
  }
  return null
}
