import type { TopicMeta } from "./grammar-utils"

const TOPIC_STORAGE_KEY = "grammar:custom-topics:v1"

/** Topic folders added via the admin "Manage content" JSON uploader. */
export function listCustomTopics(): TopicMeta[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(TOPIC_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TopicMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustomTopics(topics: TopicMeta[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TOPIC_STORAGE_KEY, JSON.stringify(topics))
  } catch {
    /* ignore quota errors */
  }
}

/** Upsert a custom topic by slug. */
export function saveCustomTopic(topic: TopicMeta): void {
  const topics = listCustomTopics()
  const idx = topics.findIndex((t) => t.slug === topic.slug)
  if (idx >= 0) topics[idx] = topic
  else topics.push(topic)
  writeCustomTopics(topics)
}

/** Merge a base topic list with locally-stored custom topics (custom wins). */
export function mergeCustomTopics(base: TopicMeta[]): TopicMeta[] {
  const custom = listCustomTopics()
  if (custom.length === 0) return base
  const customSlugs = new Set(custom.map((t) => t.slug))
  return [...base.filter((t) => !customSlugs.has(t.slug)), ...custom]
}
