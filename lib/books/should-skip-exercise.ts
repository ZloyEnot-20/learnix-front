import type { LessonStep } from "./types"

/** Skip mind maps, graphs, and other image-dependent tasks (same as mobile). */
export function shouldSkipExercise(step: LessonStep): boolean {
  const raw = step.raw
  if (raw.has_image === true || raw.has_graph === true) return true
  if (step.uiType === "image-prompt" || step.uiType === "graph-task") return true
  return false
}
