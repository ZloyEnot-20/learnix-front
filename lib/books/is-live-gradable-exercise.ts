import type { LessonStep } from "./types"

/**
 * Live Assign / Finish / graded results only for tasks that have (or expect)
 * correct answers. Oral/discussion prompts stay browse-only on the teacher page.
 */
export function isLiveGradableExercise(step: LessonStep): boolean {
  if (step.uiType === "speaking-topic" || step.uiType === "discussion-questions") {
    return false
  }
  if (step.answers != null) return true
  return (
    step.uiType !== "passage-read" &&
    step.uiType !== "instruction-only" &&
    step.uiType !== "image-prompt"
  )
}
