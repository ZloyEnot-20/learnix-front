import { z } from "zod"
import { saveGrammarExercise } from "./grammar-storage"
import { invalidateExercises } from "./exercises-cache"
import { saveCustomTopic } from "./topic-storage"
import { saveVocabDeck } from "./vocabulary-data"
import { exercisesApi } from "./api"
import type { GrammarExercise } from "./grammar-types"
import type { TopicMeta } from "./grammar-utils"
import type { VocabDeck } from "./vocabulary-data"

export type ContentKind = "exercise" | "topic" | "test" | "vocabulary"

/** A simple slug used for ids and storage keys. */
const slug = z.string().min(1).max(200)

// ─── Exercise / questions ───────────────────────────────────────────────────
const matchingPair = z.object({ left: z.string(), right: z.string() })

const grammarQuestion = z.object({
  id: z.number(),
  instruction: z.string().optional(),
  text: z.string().min(1),
  blanks: z.array(z.string()).optional(),
  acceptableAnswers: z.array(z.array(z.string())).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  answer: z.string().optional(),
  correctBool: z.boolean().optional(),
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
    difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
    level: z.string().max(40).default("A1"),
    type: z.enum([
      "fill-in-the-blank",
      "multiple-choice",
      "matching",
      "word-formation",
      "sentence-transformation",
      "true-false",
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
}) as unknown as z.ZodType<TopicMeta>

// ─── IELTS test ──────────────────────────────────────────────────────────────
const testSchema = z.object({
  testId: slug,
  title: z.string().min(1).max(300),
  type: z.enum(["reading", "listening", "writing", "speaking"]),
  totalTime: z.number().int().positive(),
  partCount: z.number().int().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  parts: z.array(z.any()).optional().default([]),
})

type TestInput = z.infer<typeof testSchema>

// ─── Vocabulary deck ─────────────────────────────────────────────────────────
const vocabWord = z
  .object({
    id: z.string().min(1),
    term: z.string().min(1),
    partOfSpeech: z.enum(["noun", "verb", "adjective", "adverb", "phrase"]),
    definition: z.string().min(1),
    example: z.string().default(""),
    translation: z.string().default(""),
    translationUz: z.string().default(""),
  })
  // Keep both languages populated so the in-exercise toggle always has a value.
  .transform((word) => ({
    ...word,
    translationUz: word.translationUz || word.translation,
  }))

const vocabDeckSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  level: z.string().max(40).default("A1"),
  words: z.array(vocabWord).min(1),
}) as unknown as z.ZodType<VocabDeck>

const SCHEMAS: Record<ContentKind, z.ZodTypeAny> = {
  exercise: exerciseSchema,
  topic: topicSchema,
  test: testSchema,
  vocabulary: vocabDeckSchema,
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
      decks.forEach(saveVocabDeck)
      return decks.length
    }
    case "test": {
      if (typeof window === "undefined") return 0
      const saved = JSON.parse(localStorage.getItem("adminTests") || "{}")
      for (const t of items as TestInput[]) {
        saved[t.testId] = {
          ...t,
          partCount: t.partCount ?? (Array.isArray(t.parts) ? t.parts.length : 0),
          createdAt: new Date().toISOString(),
        }
      }
      localStorage.setItem("adminTests", JSON.stringify(saved))
      return (items as TestInput[]).length
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
  test: JSON.stringify(
    {
      testId: "reading-002",
      title: "IELTS Academic Reading 2",
      type: "reading",
      totalTime: 60,
      partCount: 3,
      description: "Three passages, 40 questions.",
      parts: [],
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
}
