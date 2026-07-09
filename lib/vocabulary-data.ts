/**
 * Vocabulary decks for the gamified flashcards + quiz experience.
 *
 * All deck data lives in the database — nothing is bundled in the frontend.
 * Components fetch decks via the API; the synchronous helpers return empty until
 * the async fetch resolves.
 */

export type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase"

/** Languages a translation can be shown in. */
export type TranslationLang = "ru" | "uz"

export const TRANSLATION_LANGS: { value: TranslationLang; label: string; short: string }[] = [
  { value: "uz", label: "O‘zbekcha", short: "UZ" },
  { value: "ru", label: "Русский", short: "RU" },

]

export interface VocabWord {
  id: string
  term: string
  partOfSpeech: PartOfSpeech
  /** Short English definition. */
  definition: string
  /** Example sentence using the term. */
  example: string
  /** Russian translation. */
  translation: string
  /** Uzbek translation. */
  translationUz: string
}

export interface VocabDeck {
  slug: string
  title: string
  description: string
  level: string
  topic?: string
  difficulty?: "easy" | "medium" | "hard"
  orgId?: string | null
  words: VocabWord[]
}

/** Resolve a word's translation in the chosen language (falls back to RU). */
export function wordTranslation(word: VocabWord, lang: TranslationLang): string {
  if (lang === "uz") return word.translationUz || word.translation
  return word.translation
}

/** Synchronous placeholder — decks come from the DB via fetchVocabDecks(). */
export function listVocabDecks(): VocabDeck[] {
  return []
}

/** All vocabulary decks from the database. */
export async function fetchVocabDecks(): Promise<VocabDeck[]> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.vocab()
  } catch {
    return []
  }
}

/** Synchronous placeholder — use fetchVocabDeck() for real data. */
export function getVocabDeck(_slug: string): VocabDeck | undefined {
  return undefined
}

/** Single deck lookup from the database. */
export async function fetchVocabDeck(slug: string): Promise<VocabDeck | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.vocabDeck(slug)
  } catch {
    return undefined
  }
}

const VOCAB_INVALIDATE = "vocabulary:decks:invalidate"

/** Notify listeners (Exercises page, etc.) that decks changed. */
export function invalidateVocabDecks(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(VOCAB_INVALIDATE))
}

export function onVocabDecksInvalidate(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(VOCAB_INVALIDATE, handler)
  return () => window.removeEventListener(VOCAB_INVALIDATE, handler)
}

/** Homework `exerciseSlug` payload for a vocabulary deck, e.g. "vocab:family". */
export const VOCAB_SLUG_PREFIX = "vocab:"

export function vocabHomeworkSlug(deckSlug: string): string {
  return `${VOCAB_SLUG_PREFIX}${deckSlug}`
}

export function parseVocabHomeworkSlug(slug: string | undefined): string | null {
  if (!slug) return null
  return slug.startsWith(VOCAB_SLUG_PREFIX) ? slug.slice(VOCAB_SLUG_PREFIX.length) : null
}
