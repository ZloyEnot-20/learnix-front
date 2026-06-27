import type { IeltsReadingPart } from "./reading-data"

const ROMAN_NUMERAL = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)$/i
const ROMAN_NUMERAL_OPTION = /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.\s/i

export function decodeReadingText(value: string): string {
  return value
    .replace(/&rsquo;|&#8217;|&apos;/gi, "'")
    .replace(/&lsquo;|&#8216;/gi, "'")
    .replace(/&ldquo;|&#8220;/gi, '"')
    .replace(/&rdquo;|&#8221;/gi, '"')
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, " ")
}

export function extractReadingOptionValue(option: string): string {
  const trimmed = decodeReadingText(option).trim()
  const roman = trimmed.match(/^((?:i{1,3}|iv|v|vi{0,3}|ix|x))\.(?:\s|$)/i)
  if (roman) return roman[1].toLowerCase()
  const letter = trimmed.match(/^([A-Z])\.(?:\s|$)/)
  if (letter) return letter[1]
  return trimmed
}

export function isPlaceholderReadingQuestion(text: string): boolean {
  const t = decodeReadingText(text).trim()
  if (!t) return true
  if (/^Question\s+\d+$/i.test(t)) return true
  if (/^[A-K]$/i.test(t)) return true
  if (t.length <= 2 && /^[A-Za-z0-9]$/.test(t)) return true
  return false
}

export function cleanPartQuestionInstruction(raw: string | undefined): string {
  const text = decodeReadingText(raw ?? "").trim()
  if (!text) return ""

  const splitPatterns = [
    /^(.*?(?:on your answer sheet\.?))\s+(.+)$/is,
    /^(.*?(?:Write the correct letter[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:Write the correct number[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:Write your answers in boxes \d+[-–]\d+ on your answer sheet\.?))\s+(.+)$/is,
    /^(.*?(?:NOT GIVEN[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:NO MORE THAN[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:ONE WORD[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:TWO WORDS[^.]*\.))\s+(.+)$/is,
    /^(.*?(?:THREE WORDS[^.]*\.))\s+(.+)$/is,
  ]

  for (const pattern of splitPatterns) {
    const match = text.match(pattern)
    if (!match?.[2]) continue
    const tail = match[2].trim()
    if (!tail || /^(Write|Choose|In boxes|You should|Reading Passage)/i.test(tail)) continue
    return match[1].trim()
  }

  return text
}

export function extractTrailingInstructionPrompt(raw: string | undefined): string {
  const text = decodeReadingText(raw ?? "").trim()
  if (!text) return ""

  const cleaned = cleanPartQuestionInstruction(raw)
  if (!cleaned || cleaned === text) return ""

  if (text.startsWith(cleaned)) {
    return text.slice(cleaned.length).trim()
  }

  return ""
}

export function resolveReadingQuestionPrompt(
  question: string,
  options?: string[],
  partInstruction?: string,
): string {
  let text = decodeReadingText(question).trim()
  if (!isPlaceholderReadingQuestion(text)) {
    if (options?.length) {
      const inlineOptions = text.match(/^(.+?)\s+[A-D]\s+[A-Z]/i)
      if (inlineOptions) text = inlineOptions[1].trim()
    }
    return text
  }

  return extractTrailingInstructionPrompt(partInstruction)
}

type ReadingQuestion = IeltsReadingPart["questions"][number]

export function formatReadingCorrectAnswer(question: ReadingQuestion): string {
  if (Array.isArray(question.correctAnswer)) {
    return question.correctAnswer.map((a) => String(a).trim()).filter(Boolean).join(", ")
  }
  return String(question.correctAnswer).trim()
}

export function isReadingAnswerCorrect(question: ReadingQuestion, answer: string): boolean {
  const normalized = answer.trim()
  if (!normalized) return false

  if (question.type === "multiple-choice") {
    const userKey = extractReadingOptionValue(normalized).toLowerCase()
    const correctRaw =
      typeof question.correctAnswer === "number"
        ? String(question.correctAnswer)
        : String(question.correctAnswer).trim()
    const correctKey = extractReadingOptionValue(correctRaw).toLowerCase()

    if (ROMAN_NUMERAL.test(userKey) || ROMAN_NUMERAL.test(correctKey)) {
      return userKey === correctKey
    }

    const user = normalized.toUpperCase()
    const correct = correctRaw.toUpperCase()
    if (user.length === 1 && correct.length === 1) return user === correct
    return user === correct || user.startsWith(`${correct}.`) || user.startsWith(`${correct} `)
  }

  if (Array.isArray(question.correctAnswer)) {
    const userAnswers = normalized.split("|||").filter(Boolean).map((a) => a.trim().toUpperCase())
    const correctAnswers = question.correctAnswer.map((a) => String(a).trim().toUpperCase())
    return (
      userAnswers.length === correctAnswers.length &&
      userAnswers.every((a) => correctAnswers.includes(a))
    )
  }

  return normalized.toUpperCase() === String(question.correctAnswer).trim().toUpperCase()
}
