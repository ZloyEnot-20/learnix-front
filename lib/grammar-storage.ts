import type { GrammarExercise } from "./grammar-types"

/**
 * Local store for grammar exercises that were added on this device but not yet
 * synced to the backend (e.g. drafts from the "Manage exercises" uploader).
 *
 * The exercise catalogue itself now lives in the database — see
 * `exercises-cache.ts`, which fetches from the API and merges in any locally
 * saved drafts kept here. There is no bundled mock seed anymore.
 */
const STORAGE_KEY = "grammar:exercises:v6"

function read(): GrammarExercise[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GrammarExercise[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items: GrammarExercise[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

export function listGrammarExercises(): GrammarExercise[] {
  return read()
}

export function getGrammarExercise(slug: string): GrammarExercise | undefined {
  return read().find((e) => e.slug === slug || e.id === slug)
}

export function saveGrammarExercise(exercise: GrammarExercise): void {
  const items = read()
  const idx = items.findIndex((e) => e.id === exercise.id || e.slug === exercise.slug)
  if (idx >= 0) items[idx] = exercise
  else items.push(exercise)
  write(items)
}

export function deleteGrammarExercise(slug: string): void {
  write(read().filter((e) => e.slug !== slug && e.id !== slug))
}

/**
 * Compare a user's input against accepted answers for one blank.
 * Case-insensitive, collapses whitespace, trims.
 */
export function isBlankCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const got = norm(input)
  return accepted.some((a) => norm(a) === got)
}
