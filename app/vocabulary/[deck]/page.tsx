"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookMarked,
  Check,
  ChevronLeft,
  Flame,
  Layers,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  X,
  Zap,
} from "lucide-react"
import {
  getVocabDeck,
  fetchVocabDeck,
  wordTranslation,
  TRANSLATION_LANGS,
  type TranslationLang,
  type VocabDeck,
  type VocabWord,
} from "@/lib/vocabulary-data"
import { homeworkApi, analyticsApi } from "@/lib/api"
import { invalidateMyHomework } from "@/lib/homework-cache"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const XP_PER_CORRECT = 10
const XP_STREAK_BONUS = 5

type Mode = "menu" | "flashcards" | "quiz" | "results"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VocabularyDeckPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <VocabularyDeckInner />
    </Suspense>
  )
}

function VocabularyDeckInner() {
  const params = useParams<{ deck: string }>()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const slug = params?.deck ?? ""
  // Start from any local copy for instant render, then confirm against the DB.
  const [deck, setDeck] = useState<VocabDeck | undefined>(() => getVocabDeck(slug))
  const [deckLoading, setDeckLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setDeckLoading(true)
    fetchVocabDeck(slug)
      .then((d) => {
        if (!cancelled) setDeck(d ?? getVocabDeck(slug))
      })
      .finally(() => {
        if (!cancelled) setDeckLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const homeworkId = searchParams?.get("hw") ?? undefined
  const isStudent = user?.type === "student"

  const [mode, setMode] = useState<Mode>("menu")
  const [lang, setLang] = useState<TranslationLang>("uz")

  // Mark the homework as started the first time a student opens it.
  useEffect(() => {
    if (homeworkId && isStudent) {
      void homeworkApi
        .start(homeworkId)
        .then(() => invalidateMyHomework())
        .catch(() => {})
    }
  }, [homeworkId, isStudent])

  if (!deck) {
    if (deckLoading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#C8102E]" />
          <p className="text-sm text-slate-500">Loading deck…</p>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <BookMarked className="h-10 w-10 text-slate-300" />
        <p className="text-lg font-semibold text-slate-900">Deck not found</p>
        <Button asChild variant="outline">
          <Link href="/exercises">Back to exercises</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/exercises"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Exercises
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={setLang} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <BookMarked className="h-3.5 w-3.5" />
              Vocabulary · {deck.level}
            </span>
          </div>
        </div>

        {mode === "menu" && (
          <MenuScreen
            deck={deck}
            onFlashcards={() => setMode("flashcards")}
            onQuiz={() => setMode("quiz")}
          />
        )}
        {mode === "flashcards" && (
          <Flashcards
            deck={deck}
            lang={lang}
            onExit={() => setMode("menu")}
            onQuiz={() => setMode("quiz")}
          />
        )}
        {mode === "quiz" && (
          <Quiz
            deck={deck}
            lang={lang}
            homeworkId={isStudent ? homeworkId : undefined}
            onExit={() => setMode("menu")}
          />
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Language toggle ─────────────────────────

function LangToggle({
  lang,
  onChange,
}: {
  lang: TranslationLang
  onChange: (lang: TranslationLang) => void
}) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm"
      role="group"
      aria-label="Translation language"
    >
      {TRANSLATION_LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => onChange(l.value)}
          aria-pressed={lang === l.value}
          title={l.label}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            lang === l.value
              ? "bg-violet-600 text-white"
              : "text-slate-500 hover:text-slate-900",
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────── Menu ─────────────────────────

function MenuScreen({
  deck,
  onFlashcards,
  onQuiz,
}: {
  deck: VocabDeck
  onFlashcards: () => void
  onQuiz: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-md">
            <BookMarked className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{deck.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{deck.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Pill icon={Layers}>{deck.words.length} words</Pill>
              <Pill icon={Star}>Level {deck.level}</Pill>
              <Pill icon={Zap}>Earn up to {deck.words.length * XP_PER_CORRECT} XP</Pill>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          accent="from-sky-400 to-blue-500"
          icon={Layers}
          title="Flashcards"
          description="Flip cards to learn meanings, examples and translations at your own pace."
          cta="Start learning"
          onClick={onFlashcards}
        />
        <ModeCard
          accent="from-violet-400 to-fuchsia-500"
          icon={Sparkles}
          title="Quiz"
          description="Test yourself with multiple-choice questions and build a streak for bonus XP."
          cta="Start quiz"
          onClick={onQuiz}
        />
      </div>
    </div>
  )
}

function Pill({ icon: Icon, children }: { icon: typeof Star; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}

function ModeCard({
  accent,
  icon: Icon,
  title,
  description,
  cta,
  onClick,
}: {
  accent: string
  icon: typeof Star
  title: string
  description: string
  cta: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm",
          accent,
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

// ───────────────────────── Flashcards ─────────────────────────

function Flashcards({
  deck,
  lang,
  onExit,
  onQuiz,
}: {
  deck: VocabDeck
  lang: TranslationLang
  onExit: () => void
  onQuiz: () => void
}) {
  const cards = useMemo(() => shuffle(deck.words), [deck])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [done, setDone] = useState(false)

  const card = cards[index]
  const progress = Math.round((index / cards.length) * 100)

  const next = (didKnow: boolean) => {
    if (didKnow) setKnown((k) => k + 1)
    if (index + 1 >= cards.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  if (done) {
    return (
      <ResultCard
        title="Deck complete!"
        subtitle={`You knew ${known} of ${cards.length} words`}
        xp={known * XP_PER_CORRECT}
        stars={starsFor(known, cards.length)}
        primary={{ label: "Take the quiz", onClick: onQuiz, icon: Sparkles }}
        secondary={{
          label: "Study again",
          onClick: () => {
            setIndex(0)
            setKnown(0)
            setFlipped(false)
            setDone(false)
          },
          icon: RotateCcw,
        }}
        onExit={onExit}
      />
    )
  }

  return (
    <div className="space-y-5">
      <TopBar
        left={`Card ${index + 1} / ${cards.length}`}
        right={
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" />
            {known} known
          </span>
        }
        progress={progress}
        onExit={onExit}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
        className="relative block h-72 w-full cursor-pointer select-none [perspective:1200px]"
        aria-label="Flip card"
      >
        <div
          className={cn(
            "relative h-full w-full rounded-3xl transition-transform duration-500 will-change-transform [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-violet-200 bg-white p-6 text-center shadow-sm [backface-visibility:hidden] [transform:translateZ(0)]">
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600">
              {card.partOfSpeech}
            </span>
            <p className="text-3xl font-bold text-slate-900">{card.term}</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Volume2 className="h-3.5 w-3.5" />
              Tap to flip
            </span>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(0)]">
            <p className="text-xl font-bold text-slate-900">{wordTranslation(card, lang)}</p>
            <p className="text-sm text-slate-600">{card.definition}</p>
            <p className="mt-1 text-sm italic text-slate-500">“{card.example}”</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => next(false)}
          className="h-12 border-slate-300 text-slate-700"
        >
          <X className="mr-1.5 h-4 w-4 text-rose-500" />
          Still learning
        </Button>
        <Button onClick={() => next(true)} className="h-12 bg-emerald-600 hover:bg-emerald-700">
          <Check className="mr-1.5 h-4 w-4" />
          I know it
        </Button>
      </div>
    </div>
  )
}

// ───────────────────────── Quiz ─────────────────────────

interface QuizQuestion {
  word: VocabWord
  /** Option words (the correct one + distractors), already shuffled. */
  options: VocabWord[]
}

function buildQuiz(deck: VocabDeck): QuizQuestion[] {
  const all = deck.words
  // Store option *words* (not translated strings) so the displayed language can
  // change mid-quiz without rebuilding the questions.
  return shuffle(all).map((word) => {
    const distractors = shuffle(all.filter((x) => x.id !== word.id)).slice(0, 3)
    const options = shuffle([word, ...distractors])
    return { word, options }
  })
}

function Quiz({
  deck,
  lang,
  homeworkId,
  onExit,
}: {
  deck: VocabDeck
  lang: TranslationLang
  homeworkId?: string
  onExit: () => void
}) {
  const questions = useMemo(() => buildQuiz(deck), [deck])
  const [index, setIndex] = useState(0)
  // Track the picked option by word id (stable across language switches).
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [xp, setXp] = useState(0)
  const [done, setDone] = useState(false)
  const startedAt = useRef(Date.now())
  const recorded = useRef(false)
  const { user } = useAuth()

  const q = questions[index]
  const progress = Math.round((index / questions.length) * 100)

  const choose = (optionId: string) => {
    if (picked) return
    setPicked(optionId)
    const isRight = optionId === q.word.id
    if (isRight) {
      const newStreak = streak + 1
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      setCorrect((c) => c + 1)
      setXp((x) => x + XP_PER_CORRECT + (newStreak >= 3 ? XP_STREAK_BONUS : 0))
    } else {
      setStreak(0)
    }
  }

  const advance = () => {
    if (index + 1 >= questions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }

  // Record completion once the quiz is finished.
  useEffect(() => {
    if (!done || recorded.current) return
    recorded.current = true
    if (homeworkId) {
      void homeworkApi
        .recordAttempt(homeworkId, {
          totalQuestions: questions.length,
          correctCount: correct,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          mistakes: [],
        })
        .then(() => invalidateMyHomework())
        .catch(() => {})
      return
    }
    if (user?.type === "student") {
      void analyticsApi
        .recordVocab({
          deckSlug: deck.slug,
          deckTitle: deck.title,
          correct,
          total: questions.length,
          source: "game",
          words: deck.words.map((w) => ({
            term: w.term,
            partOfSpeech: w.partOfSpeech,
            definition: w.definition,
            deckSlug: deck.slug,
            deckTitle: deck.title,
          })),
        })
        .catch(() => {})
    }
  }, [done, homeworkId, questions.length, correct, user?.type, deck])

  if (done) {
    return (
      <ResultCard
        title="Quiz finished!"
        subtitle={`${correct} / ${questions.length} correct · best streak ${bestStreak}`}
        xp={xp}
        stars={starsFor(correct, questions.length)}
        primary={{
          label: "Try again",
          onClick: () => {
            setIndex(0)
            setPicked(null)
            setCorrect(0)
            setStreak(0)
            setBestStreak(0)
            setXp(0)
            setDone(false)
            startedAt.current = Date.now()
            recorded.current = false
          },
          icon: RotateCcw,
        }}
        onExit={onExit}
        homeworkDone={!!homeworkId}
      />
    )
  }

  return (
    <div className="space-y-5">
      <TopBar
        left={`Question ${index + 1} / ${questions.length}`}
        right={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
              <Flame className={cn("h-4 w-4", streak >= 3 && "animate-pulse")} />
              {streak}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600">
              <Zap className="h-4 w-4" />
              {xp} XP
            </span>
          </span>
        }
        progress={progress}
        onExit={onExit}
      />

      <div className="rounded-3xl border border-violet-200 bg-white p-6 text-center shadow-sm">
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600">
          {q.word.partOfSpeech}
        </span>
        <p className="mt-3 text-sm text-slate-400">What does this word mean?</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{q.word.term}</p>
      </div>

      <div className="grid gap-3">
        {q.options.map((option) => {
          const isAnswer = option.id === q.word.id
          const isPicked = picked === option.id
          const state = !picked
            ? "idle"
            : isAnswer
              ? "correct"
              : isPicked
                ? "wrong"
                : "muted"
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              disabled={!!picked}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all",
                state === "idle" &&
                  "border-slate-200 bg-white text-slate-800 hover:border-violet-300 hover:bg-violet-50/50",
                state === "correct" && "border-emerald-400 bg-emerald-50 text-emerald-800",
                state === "wrong" && "border-rose-400 bg-rose-50 text-rose-800",
                state === "muted" && "border-slate-200 bg-white text-slate-400",
              )}
            >
              {wordTranslation(option, lang)}
              {state === "correct" && <Check className="h-5 w-5 text-emerald-600" />}
              {state === "wrong" && <X className="h-5 w-5 text-rose-600" />}
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{q.word.term}</span> —{" "}
            <span className="font-medium text-violet-700">{wordTranslation(q.word, lang)}</span>
            <p className="mt-0.5">{q.word.definition}</p>
            <p className="mt-1 italic text-slate-500">“{q.word.example}”</p>
          </div>
          <Button onClick={advance} className="h-12 w-full bg-violet-600 hover:bg-violet-700">
            {index + 1 >= questions.length ? "See results" : "Next"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── Shared ─────────────────────────

function TopBar({
  left,
  right,
  progress,
  onExit,
}: {
  left: string
  right: React.ReactNode
  progress: number
  onExit: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {left}
        </button>
        {right}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function starsFor(correct: number, total: number): number {
  if (total === 0) return 0
  const pct = correct / total
  if (pct >= 0.9) return 3
  if (pct >= 0.6) return 2
  if (pct >= 0.3) return 1
  return 0
}

function ResultCard({
  title,
  subtitle,
  xp,
  stars,
  primary,
  secondary,
  onExit,
  homeworkDone,
}: {
  title: string
  subtitle: string
  xp: number
  stars: number
  primary: { label: string; onClick: () => void; icon: typeof Star }
  secondary?: { label: string; onClick: () => void; icon: typeof Star }
  onExit: () => void
  homeworkDone?: boolean
}) {
  const PrimaryIcon = primary.icon
  const SecondaryIcon = secondary?.icon
  return (
    <div className="rounded-3xl border border-violet-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md">
        <Trophy className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-4 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-8 w-8",
              i < stars ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200",
            )}
          />
        ))}
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
        <Zap className="h-4 w-4" />+{xp} XP earned
      </div>

      {homeworkDone && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          Homework saved
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button onClick={primary.onClick} className="h-12 bg-violet-600 hover:bg-violet-700">
          <PrimaryIcon className="mr-1.5 h-4 w-4" />
          {primary.label}
        </Button>
        {secondary && SecondaryIcon ? (
          <Button onClick={secondary.onClick} variant="outline" className="h-12">
            <SecondaryIcon className="mr-1.5 h-4 w-4" />
            {secondary.label}
          </Button>
        ) : (
          <Button onClick={onExit} variant="outline" className="h-12">
            <Layers className="mr-1.5 h-4 w-4" />
            Back to deck
          </Button>
        )}
      </div>

      {secondary && (
        <button
          type="button"
          onClick={onExit}
          className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-700"
        >
          Back to deck menu
        </button>
      )}
    </div>
  )
}
