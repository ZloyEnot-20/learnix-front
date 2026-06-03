/**
 * Lightweight client-side analytics for grammar exercise performance.
 *
 * Every finished attempt is recorded against its topic + subtopic + exercise so
 * that — in the future — we can surface where students struggle and which
 * topics a teacher should reinforce. Stored in localStorage; safe to call on
 * the server (becomes a no-op).
 */

export interface ExerciseResultEvent {
  topic: string
  subtopic?: string
  slug: string
  title: string
  type: string
  correctCount: number
  totalQuestions: number
  timedOut?: boolean
  studentId?: string
  at: string
}

/** Aggregated stats keyed by exercise slug. */
export interface ExerciseStat {
  slug: string
  title: string
  topic: string
  subtopic?: string
  type: string
  attempts: number
  totalCorrect: number
  totalQuestions: number
  timeouts: number
  /** 0–100 average accuracy across attempts. */
  accuracy: number
}

export interface SubtopicStat {
  subtopic: string
  attempts: number
  accuracy: number
  exercises: ExerciseStat[]
}

export interface TopicStat {
  topic: string
  attempts: number
  accuracy: number
  timeouts: number
  subtopics: SubtopicStat[]
}

const STORAGE_KEY = "grammar:analytics:v1"

function read(): ExerciseResultEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExerciseResultEvent[]) : []
  } catch {
    return []
  }
}

function write(events: ExerciseResultEvent[]): void {
  if (typeof window === "undefined") return
  try {
    // Cap history so localStorage never grows unbounded.
    const trimmed = events.slice(-2000)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore quota errors */
  }
}

/** Record a single finished attempt. */
export function recordExerciseResult(
  event: Omit<ExerciseResultEvent, "at">,
): void {
  if (typeof window === "undefined") return
  const events = read()
  events.push({ ...event, at: new Date().toISOString() })
  write(events)
}

export function listExerciseResults(): ExerciseResultEvent[] {
  return read()
}

function pct(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

/** Aggregate recorded events into a topic → subtopic → exercise tree. */
export function aggregateTopicStats(
  events: ExerciseResultEvent[] = read(),
): TopicStat[] {
  const byTopic = new Map<string, ExerciseResultEvent[]>()
  for (const e of events) {
    const arr = byTopic.get(e.topic) ?? []
    arr.push(e)
    byTopic.set(e.topic, arr)
  }

  const topics: TopicStat[] = []
  for (const [topic, topicEvents] of byTopic) {
    const bySub = new Map<string, ExerciseResultEvent[]>()
    for (const e of topicEvents) {
      const key = e.subtopic ?? "general"
      const arr = bySub.get(key) ?? []
      arr.push(e)
      bySub.set(key, arr)
    }

    const subtopics: SubtopicStat[] = []
    for (const [subtopic, subEvents] of bySub) {
      const byEx = new Map<string, ExerciseResultEvent[]>()
      for (const e of subEvents) {
        const arr = byEx.get(e.slug) ?? []
        arr.push(e)
        byEx.set(e.slug, arr)
      }
      const exercises: ExerciseStat[] = []
      for (const [slug, exEvents] of byEx) {
        const totalCorrect = exEvents.reduce((a, e) => a + e.correctCount, 0)
        const totalQuestions = exEvents.reduce((a, e) => a + e.totalQuestions, 0)
        exercises.push({
          slug,
          title: exEvents[0].title,
          topic,
          subtopic: exEvents[0].subtopic,
          type: exEvents[0].type,
          attempts: exEvents.length,
          totalCorrect,
          totalQuestions,
          timeouts: exEvents.filter((e) => e.timedOut).length,
          accuracy: pct(totalCorrect, totalQuestions),
        })
      }
      const subCorrect = subEvents.reduce((a, e) => a + e.correctCount, 0)
      const subTotal = subEvents.reduce((a, e) => a + e.totalQuestions, 0)
      subtopics.push({
        subtopic,
        attempts: subEvents.length,
        accuracy: pct(subCorrect, subTotal),
        exercises: exercises.sort((a, b) => a.accuracy - b.accuracy),
      })
    }

    const topicCorrect = topicEvents.reduce((a, e) => a + e.correctCount, 0)
    const topicTotal = topicEvents.reduce((a, e) => a + e.totalQuestions, 0)
    topics.push({
      topic,
      attempts: topicEvents.length,
      accuracy: pct(topicCorrect, topicTotal),
      timeouts: topicEvents.filter((e) => e.timedOut).length,
      subtopics: subtopics.sort((a, b) => a.accuracy - b.accuracy),
    })
  }

  return topics.sort((a, b) => a.accuracy - b.accuracy)
}
