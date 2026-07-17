import type { ExerciseTableRow } from "@/components/admin/exercise-assign-table"
import type { GrammarExercise } from "@/lib/grammar-types"
import type { VocabDeck } from "@/lib/vocabulary-data"
import { vocabHomeworkSlug } from "@/lib/vocabulary-data"
import type { PodcastEpisode } from "@/lib/podcast-data"
import { podcastHasWords, podcastHomeworkSlug } from "@/lib/podcast-data"
import type { IeltsReadingSummary } from "@/lib/reading-data"
import { readingHomeworkSlug } from "@/lib/reading-data"
import type { IeltsListeningSummary } from "@/lib/listening-data"
import { listeningHomeworkSlug } from "@/lib/listening-data"
import {
  readingQuestionTypeLabel,
  sortReadingQuestionTypes,
} from "@/lib/reading-question-types"
import {
  listeningQuestionTypeLabel,
  sortListeningQuestionTypes,
} from "@/lib/listening-question-types"
function prettifySubtopic(subtopic: string): string {
  return subtopic
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

type DifficultyMeta = {
  label: string
  cls: string
  dot: string
}

export function grammarExerciseToTableRow(
  ex: GrammarExercise,
  difficultyMeta: Record<GrammarExercise["difficulty"], DifficultyMeta>,
): ExerciseTableRow {
  const diff = difficultyMeta[ex.difficulty]
  const subject = ex.category === "speaking" ? "speaking" : "grammar"
  return {
    id: ex.id,
    title: ex.title,
    subtitle: ex.description,
    level: ex.level,
    tags: [prettifySubtopic(ex.subtopic)],
    questionCount: ex.totalQuestions,
    timeMinutes: ex.estimatedTime,
    difficulty: diff,
    payload: {
      id: ex.id,
      title: ex.title,
      description: ex.description,
      subject,
      exerciseSlug: ex.slug,
      estimatedMinutes: Math.max(1, ex.estimatedTime),
      defaultTimeLimitMinutes: ex.estimatedTime,
      timeLimitKind: "grammar",
    },
  }
}

export function vocabDeckToTableRow(deck: VocabDeck): ExerciseTableRow {
  return {
    id: deck.slug,
    title: deck.title,
    subtitle: deck.description,
    level: deck.level,
    tags: ["Flashcards", "Quiz"],
    questionCount: deck.words.length,
    timeMinutes: Math.max(5, Math.round(deck.words.length / 3)),
    payload: {
      id: deck.slug,
      title: `Vocabulary: ${deck.title}`,
      description: `Review and quiz the ${deck.words.length} words in the ${deck.title} deck.`,
      subject: "vocabulary",
      exerciseSlug: vocabHomeworkSlug(deck.slug),
      estimatedMinutes: Math.max(5, Math.round(deck.words.length / 3)),
    },
  }
}

export function podcastToTableRow(episode: PodcastEpisode): ExerciseTableRow {
  const hasWords = podcastHasWords(episode)
  const tags = [episode.topic, episode.difficulty]
  if (hasWords) tags.push(`${episode.words.length} words`)
  else tags.push("Listen only")

  return {
    id: episode.slug,
    title: episode.title,
    subtitle: episode.description || "Listening podcast episode.",
    level: episode.level,
    tags,
    timeMinutes: episode.durationMinutes > 0 ? episode.durationMinutes : undefined,
    payload: {
      id: episode.slug,
      title: `Podcast: ${episode.title}`,
      description: hasWords
        ? "Listen to the episode, then review the vocabulary."
        : `Listen to the podcast episode "${episode.title}".`,
      subject: "listening",
      exerciseSlug: podcastHomeworkSlug(episode.slug),
      estimatedMinutes: Math.max(5, episode.durationMinutes || 10),
    },
  }
}

export function readingToTableRow(test: IeltsReadingSummary): ExerciseTableRow {
  const typeLabels = sortReadingQuestionTypes(test.questionTypes ?? []).map(
    readingQuestionTypeLabel,
  )
  return {
    id: test.slug,
    title: test.title,
    subtitle: test.subtitle,
    level: "IELTS",
    tags: typeLabels,
    questionCount: test.questionCount,
    timeMinutes: test.totalTimeMinutes,
    payload: {
      id: test.slug,
      title: `Reading: ${test.title}`,
      description: `Complete the IELTS reading passage "${test.title}" (${test.questionCount} questions).`,
      subject: "reading",
      exerciseSlug: readingHomeworkSlug(test.slug),
      estimatedMinutes: Math.max(15, test.totalTimeMinutes || 20),
      defaultTimeLimitMinutes: Math.max(15, test.totalTimeMinutes || 20),
      timeLimitKind: "reading",
    },
  }
}

export function listeningToTableRow(test: IeltsListeningSummary): ExerciseTableRow {
  const typeLabels = sortListeningQuestionTypes(test.questionTypes ?? []).map(
    listeningQuestionTypeLabel,
  )
  const tags = [...typeLabels]
  if (test.subtitle) tags.unshift(test.subtitle)

  return {
    id: test.slug,
    title: test.title,
    level: "IELTS",
    tags,
    questionCount: test.questionCount,
    timeMinutes: test.totalTimeMinutes,
    payload: {
      id: test.slug,
      title: `Listening: ${test.title}`,
      description: `Complete the IELTS listening test "${test.title}" (${test.questionCount} questions).`,
      subject: "listening",
      exerciseSlug: listeningHomeworkSlug(test.slug),
      estimatedMinutes: Math.max(30, test.totalTimeMinutes || 30),
      defaultTimeLimitMinutes: Math.max(30, test.totalTimeMinutes || 30),
      timeLimitKind: "listening",
    },
  }
}
