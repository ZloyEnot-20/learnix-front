import type { GrammarExercise } from "./grammar-types"
import topicsMetaRaw from "./grammar-topics-meta.json"

export interface TopicMeta {
  slug: string
  title: string
  exerciseCount: number
  questionCount: number
  levels: string
  totalMinutes: number
  description: string
}

const TOPICS_META: TopicMeta[] = topicsMetaRaw as TopicMeta[]

const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS_META.map((t) => [t.slug, t.title]),
)

export function topicTitle(topic: string): string {
  if (TOPIC_LABELS[topic]) return TOPIC_LABELS[topic]
  return topic
    .split("-")
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
}

export interface TopicSummary {
  topic: string
  title: string
  category: GrammarExercise["category"]
  exercises: GrammarExercise[]
  exerciseCount: number
  questionCount: number
  levels: string[]
  totalMinutes: number
  description?: string
  /** True if no real exercises exist for this topic yet (placeholder). */
  comingSoon: boolean
}

export function groupExercisesByTopic(exercises: GrammarExercise[]): TopicSummary[] {
  const map = new Map<string, GrammarExercise[]>()
  for (const ex of exercises) {
    if (!map.has(ex.topic)) map.set(ex.topic, [])
    map.get(ex.topic)!.push(ex)
  }
  return Array.from(map.entries()).map(([topic, list]) => {
    const levels = Array.from(new Set(list.map((e) => e.level)))
    const questionCount = list.reduce((acc, e) => acc + e.totalQuestions, 0)
    const totalMinutes = list.reduce((acc, e) => acc + e.estimatedTime, 0)
    return {
      topic,
      title: topicTitle(topic),
      category: list[0]?.category ?? "grammar",
      exercises: list,
      exerciseCount: list.length,
      questionCount,
      levels,
      totalMinutes,
      description: TOPICS_META.find((t) => t.slug === topic)?.description,
      comingSoon: false,
    }
  })
}

/**
 * Returns the full catalogue of grammar topics — combining real exercises
 * with placeholder topics defined in `grammar-topics-meta.json`.
 * Topics with real exercises keep their real counts; placeholders use
 * planned counts from the meta file and are flagged with `comingSoon: true`.
 */
export function listAllTopicSummaries(
  exercises: GrammarExercise[],
): TopicSummary[] {
  return buildTopicSummaries(exercises, TOPICS_META)
}

/**
 * Like {@link listAllTopicSummaries} but with an explicit topic-meta list, so
 * callers can supply folders fetched from the database instead of the bundled
 * JSON. Topics with real exercises keep real counts; the rest are placeholders.
 */
export function buildTopicSummaries(
  exercises: GrammarExercise[],
  metas: TopicMeta[],
): TopicSummary[] {
  const real = groupExercisesByTopic(exercises)
  const realSlugs = new Set(real.map((t) => t.topic))
  const placeholders: TopicSummary[] = metas
    .filter((m) => !realSlugs.has(m.slug))
    .map((m) => ({
      topic: m.slug,
      title: m.title,
      category: "grammar",
      exercises: [],
      exerciseCount: m.exerciseCount,
      questionCount: m.questionCount,
      levels: [m.levels],
      totalMinutes: m.totalMinutes,
      description: m.description,
      comingSoon: true,
    }))
  const metaOrder = new Map(metas.map((t, idx) => [t.slug, idx]))
  return [...real, ...placeholders].sort((a, b) => {
    const ai = metaOrder.get(a.topic) ?? Number.MAX_SAFE_INTEGER
    const bi = metaOrder.get(b.topic) ?? Number.MAX_SAFE_INTEGER
    if (ai !== bi) return ai - bi
    return a.title.localeCompare(b.title)
  })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hr = Math.floor(minutes / 60)
  const min = minutes % 60
  if (min === 0) return `${hr} hr`
  return `${hr} hr ${min} min`
}
