import type { LessonStep } from "./types"

const SKIP_TYPES = new Set(["crossword", "diagram_labels", "graph_vocabulary"])

const SKIP_INSTRUCTION_RE =
  /mind\s*map|photograph|pie\s*chart|look at the (graph|picture|pictures|chart|diagram)|look at pictures/i

/** Skip mind maps, graphs, crosswords, diagrams, and other image-dependent tasks (same as mobile). */
export function shouldSkipExercise(step: LessonStep): boolean {
  const raw = step.raw
  if (raw.has_image === true || raw.has_graph === true) return true
  if (step.uiType === "image-prompt" || step.uiType === "graph-task") return true
  const type = String(raw.type ?? "").toLowerCase()
  if (SKIP_TYPES.has(type)) return true
  const text = `${typeof raw.instruction === "string" ? raw.instruction : ""} ${typeof raw.title === "string" ? raw.title : ""}`
  if (SKIP_INSTRUCTION_RE.test(text)) return true
  return false
}
