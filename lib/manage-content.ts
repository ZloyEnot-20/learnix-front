import { z } from "zod"
import { saveGrammarExercise } from "./grammar-storage"
import { invalidateExercises } from "./exercises-cache"
import { saveCustomTopic } from "./topic-storage"
import { invalidateVocabDecks } from "./vocabulary-data"
import { invalidatePodcasts } from "./podcast-data"
import { exercisesApi } from "./api"
import type { GrammarExercise } from "./grammar-types"
import type { TopicMeta } from "./grammar-utils"
import type { VocabDeck } from "./vocabulary-data"
import type { PodcastEpisode, PodcastWord } from "./podcast-data"

export type ContentKind = "exercise" | "topic" | "vocabulary" | "podcast"

/** A simple slug used for ids and storage keys. */
const slug = z.string().min(1).max(200)

// ─── Exercise / questions ───────────────────────────────────────────────────
const matchingPair = z.object({ left: z.string(), right: z.string() })

const errorSegment = z.object({
  id: z.string(),
  text: z.string(),
  after: z.string().optional(),
  correctText: z.string().optional(),
  acceptableText: z.array(z.string()).optional(),
  hint: z.string().optional(),
})

const grammarQuestion = z.object({
  id: z.number(),
  instruction: z.string().optional(),
  text: z.string().min(1),
  blanks: z.array(z.string()).optional(),
  acceptableAnswers: z.array(z.array(z.string())).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  answer: z.string().optional(),
  accepted: z.array(z.string()).optional(),
  correctBool: z.boolean().optional(),
  segments: z.array(errorSegment).optional(),
  prefix: z.array(z.string()).optional(),
  scrambled: z.array(z.string()).optional(),
  correct: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  alternates: z.array(z.array(z.string())).optional(),
  explanation: z.string().default(""),
  hint: z.string().optional(),
})

const exerciseSchema = z
  .object({
    id: slug.optional(),
    slug,
    title: z.string().min(1).max(300),
    description: z.string().max(2000).default(""),
    category: z.enum(["grammar", "vocabulary"]).default("grammar"),
    topic: slug,
    subtopic: z.string().max(200).default(""),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("easy"),
    level: z.string().max(40).default("A1"),
    type: z.enum([
      "fill-in-the-blank",
      "multiple-choice",
      "matching",
      "word-formation",
      "sentence-transformation",
      "true-false",
      "error-correction",
      "word-order",
    ]),
    estimatedTime: z.number().int().nonnegative().default(10),
    totalQuestions: z.number().int().nonnegative().default(0),
    passingScore: z.number().int().nonnegative().default(0),
    tags: z.array(z.string()).default([]),
    instructions: z.string().max(4000).default(""),
    tips: z.array(z.string()).default([]),
    content: z.object({
      questions: z.array(grammarQuestion).optional(),
      pairs: z.array(matchingPair).optional(),
    }),
  })
  .transform((e) => ({ ...e, id: e.id ?? e.slug })) as unknown as z.ZodType<GrammarExercise>

// ─── Topic folder ────────────────────────────────────────────────────────────
const topicSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  levels: z.string().max(60).default("A1"),
  exerciseCount: z.number().int().nonnegative().default(0),
  questionCount: z.number().int().nonnegative().default(0),
  totalMinutes: z.number().int().nonnegative().default(0),
  color: z.string().max(40).optional(),
}) as unknown as z.ZodType<TopicMeta>

// ─── Vocabulary deck ─────────────────────────────────────────────────────────
const VALID_POS = new Set(["noun", "verb", "adjective", "adverb", "phrase"])

/** Map loose part-of-speech labels onto the supported set (default "noun"). */
function normalizePartOfSpeech(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase()
  if (VALID_POS.has(v)) return v
  if (v.startsWith("n")) return "noun"
  if (v.startsWith("v")) return "verb"
  if (v === "adj" || v.startsWith("adjective")) return "adjective"
  if (v === "adv" || v.startsWith("adverb")) return "adverb"
  if (v.includes("phrase") || v.includes("idiom") || v.includes("expression")) return "phrase"
  return "noun"
}

// Accept loosely-shaped word objects: auto-fill ids, normalise the part of
// speech, and default optional text so real-world decks validate cleanly.
const vocabWord = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    term: z.string().optional(),
    word: z.string().optional(),
    partOfSpeech: z.unknown().optional(),
    pos: z.unknown().optional(),
    definition: z.string().optional().default(""),
    meaning: z.string().optional(),
    example: z.string().optional().default(""),
    translation: z.string().optional().default(""),
    translationUz: z.string().optional().default(""),
    translationUZ: z.string().optional(),
  })
  .passthrough()
  .superRefine((word, ctx) => {
    if (!(word.term || word.word || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "term or word is required",
        path: ["term"],
      })
    }
  })
  .transform((word) => {
    const term = (word.term || word.word || "").trim()
    const idBase =
      word.id != null && String(word.id).trim()
        ? String(word.id).trim()
        : term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    const translation = word.translation || ""
    const translationUz = word.translationUz || word.translationUZ || translation
    return {
      id: idBase || term,
      term,
      partOfSpeech: normalizePartOfSpeech(word.partOfSpeech ?? word.pos),
      definition: word.definition || word.meaning || "",
      example: word.example || "",
      translation,
      translationUz,
    }
  })

const vocabDeckSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    slug: slug.optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().default(""),
    level: z.string().max(40).optional().default("A1"),
    words: z.array(vocabWord).min(1),
  })
  .transform((deck) => {
    const deckSlug =
      (deck.slug && String(deck.slug).trim()) ||
      (deck.id != null && String(deck.id).trim()) ||
      deck.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return {
      slug: deckSlug,
      title: deck.title,
      description: deck.description,
      level: deck.level,
      words: deck.words,
    }
  }) as unknown as z.ZodType<VocabDeck>

const podcastWord = z
  .object({
    word: z.string().optional(),
    term: z.string().optional(),
    definition: z.string().optional().default(""),
    meaning: z.string().optional(),
  })
  .superRefine((raw, ctx) => {
    if (!(raw.word || raw.term || "").trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "word is required" })
    }
  })
  .transform((raw) => ({
    word: (raw.word || raw.term || "").trim(),
    definition: (raw.definition || raw.meaning || "").trim(),
  })) as unknown as z.ZodType<PodcastWord>

const podcastSchema = z
  .object({
    id: slug.optional(),
    slug: slug.optional(),
    title: z.string().min(1).max(200),
    topic: z.string().min(1).max(200),
    description: z.string().max(2000).default(""),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("A1"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    audioUrl: z.string().min(1).max(2000),
    durationMinutes: z.number().nonnegative().default(0),
    words: z.array(podcastWord).optional().default([]),
  })
  .transform((p) => {
    const podcastSlug =
      (p.slug && String(p.slug).trim()) ||
      (p.id != null && String(p.id).trim()) ||
      p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    return {
      slug: podcastSlug,
      title: p.title,
      topic: p.topic,
      description: p.description,
      level: p.level,
      difficulty: p.difficulty,
      audioUrl: p.audioUrl,
      durationMinutes: p.durationMinutes,
      words: p.words ?? [],
    }
  }) as unknown as z.ZodType<PodcastEpisode>

const SCHEMAS: Record<ContentKind, z.ZodTypeAny> = {
  exercise: exerciseSchema,
  topic: topicSchema,
  vocabulary: vocabDeckSchema,
  podcast: podcastSchema,
}

export interface ParseResult<T> {
  ok: boolean
  items: T[]
  error?: string
}

/** Parse + validate raw JSON text. Accepts a single object or an array. */
export function parseContent(kind: ContentKind, raw: string): ParseResult<unknown> {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (err) {
    return { ok: false, items: [], error: `Invalid JSON: ${(err as Error).message}` }
  }
  const list = Array.isArray(json) ? json : [json]
  if (list.length === 0) return { ok: false, items: [], error: "No items found." }

  const schema = SCHEMAS[kind]
  const parsed: unknown[] = []
  for (let i = 0; i < list.length; i++) {
    const result = schema.safeParse(list[i])
    if (!result.success) {
      const issue = result.error.issues[0]
      const path = issue.path.join(".")
      return {
        ok: false,
        items: [],
        error: `Item ${i + 1}${path ? ` (${path})` : ""}: ${issue.message}`,
      }
    }
    parsed.push(result.data)
  }
  return { ok: true, items: parsed }
}

/** Persist validated items. Returns how many were saved. */
export async function saveContent(kind: ContentKind, items: unknown[]): Promise<number> {
  switch (kind) {
    case "exercise": {
      const exercises = items as GrammarExercise[]
      exercises.forEach(saveGrammarExercise)
      invalidateExercises()
      // Best-effort: also push into the database so other clients see it.
      try {
        await exercisesApi.import({ topics: [], exercises })
      } catch {
        /* localStorage copy is the source of truth offline */
      }
      return exercises.length
    }
    case "topic": {
      const topics = items as TopicMeta[]
      topics.forEach(saveCustomTopic)
      invalidateExercises()
      try {
        await exercisesApi.import({ topics, exercises: [] })
      } catch {
        /* offline fallback */
      }
      return topics.length
    }
    case "vocabulary": {
      const decks = items as VocabDeck[]
      // DB is the single source of truth — no localStorage copy.
      await exercisesApi.importVocab(decks)
      invalidateVocabDecks()
      return decks.length
    }
    case "podcast": {
      const podcasts = items as PodcastEpisode[]
      await exercisesApi.importPodcasts(podcasts)
      invalidatePodcasts()
      return podcasts.length
    }
  }
}

// ─── Example payloads shown in the UI ────────────────────────────────────────
export const CONTENT_EXAMPLES: Record<ContentKind, string> = {
  exercise: JSON.stringify(
    {
      slug: "present-simple-multiple-choice",
      title: "Present Simple — Multiple Choice",
      description: "Choose the correct present simple form.",
      category: "grammar",
      topic: "present-simple",
      subtopic: "multiple-choice-basic",
      difficulty: "easy",
      level: "A1",
      type: "multiple-choice",
      estimatedTime: 10,
      totalQuestions: 2,
      passingScore: 1,
      tags: ["present simple", "A1 grammar"],
      instructions: "Choose the correct verb form.",
      tips: ["Add -s for he/she/it."],
      content: {
        questions: [
          {
            id: 1,
            text: "She ___ to school every day.",
            options: ["go", "goes", "going"],
            correctAnswer: "goes",
            hint: "he/she/it → verb + s",
            explanation: "Third person singular takes -s: goes.",
          },
          {
            id: 2,
            text: "They ___ football on Sundays.",
            options: ["play", "plays", "playing"],
            correctAnswer: "play",
            explanation: "They → play (no -s).",
          },
        ],
      },
    },
    null,
    2,
  ),
  topic: JSON.stringify(
    {
      slug: "present-simple",
      title: "Present Simple",
      description: "Daily routines and general facts.",
      levels: "A1-A2",
      exerciseCount: 0,
      questionCount: 0,
      totalMinutes: 0,
    },
    null,
    2,
  ),
  vocabulary: JSON.stringify(
    {
      slug: "travel",
      title: "Travel",
      description: "Words for trips, transport and holidays.",
      level: "A2",
      words: [
        {
          id: "tr-01",
          term: "journey",
          partOfSpeech: "noun",
          definition: "an act of travelling from one place to another",
          example: "The journey took five hours.",
          translation: "путешествие",
          translationUz: "sayohat",
        },
        {
          id: "tr-02",
          term: "luggage",
          partOfSpeech: "noun",
          definition: "bags and cases for travelling",
          example: "Don't forget your luggage.",
          translation: "багаж",
          translationUz: "yuk",
        },
      ],
    },
    null,
    2,
  ),
  podcast: JSON.stringify(
    {
      slug: "morning-routine",
      title: "A Morning Routine",
      topic: "Daily life",
      description: "Anna describes her typical morning.",
      level: "A2",
      difficulty: "easy",
      audioUrl: "https://example.com/audio/morning-routine.mp3",
      durationMinutes: 4,
      words: [
        {
          word: "routine",
          definition: "a regular way of doing things",
        },
        {
          word: "rush hour",
          definition: "the busiest time on roads and public transport",
        },
      ],
    },
    null,
    2,
  ),
}
