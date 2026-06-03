// Admin data layer — localStorage-backed mock store for groups, students,
// homework assignments and payments. Replace with backend (Supabase) later.

import { getGrammarExercise, listGrammarExercises } from "./grammar-storage"
import type { GrammarExercise } from "./grammar-types"

export type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar"

export interface Group {
  id: string
  name: string
  description?: string
  teacherId?: string
  studentIds: string[]
  monthlyFee?: number
  createdAt: string
}

export interface Student {
  id: string
  name: string
  email: string
  phone?: string
  groupId?: string
  joinedAt: string
  monthlyFee?: number
  notes?: string
}

export type HomeworkStatus = "pending" | "in_progress" | "submitted" | "graded"

export interface HomeworkAssignment {
  id: string
  title: string
  description: string
  subject: Subject
  groupId: string
  dueAt: string
  estimatedMinutes: number
  createdAt: string
  createdBy: string
  /** Optional reference to a grammar/vocab exercise by slug. */
  exerciseSlug?: string
  /** Countdown limit in minutes for the student. Undefined = unlimited. */
  timeLimitMinutes?: number
}

export interface HomeworkMistake {
  questionId: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
}

export interface HomeworkAttempt {
  totalQuestions: number
  correctCount: number
  durationSeconds?: number
  mistakes: HomeworkMistake[]
  /** True when the student ran out of time before finishing all questions. */
  timedOut?: boolean
  /** How many questions the student actually reached before time ran out. */
  answeredCount?: number
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  status: HomeworkStatus
  score?: number
  /** When the student opened/began the exercise. */
  startedAt?: string
  submittedAt?: string
  feedback?: string
  attempt?: HomeworkAttempt
}

export type PaymentStatus = "pending" | "paid" | "overdue"

export interface Payment {
  id: string
  studentId: string
  groupId: string
  amount: number
  periodLabel: string
  dueDate: string
  paidDate?: string
  status: PaymentStatus
  notes?: string
}

const KEYS = {
  groups: "ielts_admin_groups",
  students: "ielts_admin_students",
  homework: "ielts_admin_homework",
  submissions: "ielts_admin_submissions",
  payments: "ielts_admin_payments",
  seeded: "ielts_admin_seeded_v4",
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// ---------- Seed ----------

function seedIfNeeded(): void {
  if (typeof window === "undefined") return
  if (localStorage.getItem(KEYS.seeded)) return

  const now = Date.now()
  const day = 1000 * 60 * 60 * 24

  const groupA: Group = {
    id: "grp_alpha",
    name: "IELTS 7.0 — Morning",
    description: "Intermediate group targeting Band 7.0",
    teacherId: "teacher-1",
    studentIds: ["student-1", "std_anna", "std_ivan", "std_lena"],
    monthlyFee: 1_200_000,
    createdAt: new Date(now - day * 60).toISOString(),
  }
  const groupB: Group = {
    id: "grp_beta",
    name: "IELTS 6.5 — Evening",
    description: "Pre-intermediate evening group",
    teacherId: "teacher-1",
    studentIds: ["std_mark", "std_polina"],
    monthlyFee: 900_000,
    createdAt: new Date(now - day * 30).toISOString(),
  }

  const students: Student[] = [
    {
      id: "student-1",
      name: "Alex Student",
      email: "student@ielts.com",
      groupId: groupA.id,
      joinedAt: new Date(now - day * 20).toISOString(),
      monthlyFee: 1_200_000,
    },
    {
      id: "std_anna",
      name: "Anna Petrova",
      email: "anna@example.com",
      phone: "+7 999 111-22-33",
      groupId: groupA.id,
      joinedAt: new Date(now - day * 58).toISOString(),
      monthlyFee: 1_200_000,
    },
    {
      id: "std_ivan",
      name: "Ivan Volkov",
      email: "ivan@example.com",
      phone: "+7 999 222-33-44",
      groupId: groupA.id,
      joinedAt: new Date(now - day * 52).toISOString(),
      monthlyFee: 1_200_000,
    },
    {
      id: "std_lena",
      name: "Lena Sokolova",
      email: "lena@example.com",
      groupId: groupA.id,
      joinedAt: new Date(now - day * 40).toISOString(),
      monthlyFee: 1_200_000,
    },
    {
      id: "std_mark",
      name: "Mark Chen",
      email: "mark@example.com",
      groupId: groupB.id,
      joinedAt: new Date(now - day * 25).toISOString(),
      monthlyFee: 900_000,
    },
    {
      id: "std_polina",
      name: "Polina Orlova",
      email: "polina@example.com",
      groupId: groupB.id,
      joinedAt: new Date(now - day * 12).toISOString(),
      monthlyFee: 900_000,
    },
  ]

  const homework: HomeworkAssignment[] = [
    {
      id: "hw_r1",
      title: "Cambridge 17 — Reading Passage 3",
      description: "Read the passage and answer questions 27–40 about global trade.",
      subject: "reading",
      groupId: groupA.id,
      dueAt: new Date(now + day * 2).toISOString(),
      estimatedMinutes: 40,
      createdAt: new Date(now - day * 1).toISOString(),
      createdBy: "Admin",
    },
    {
      id: "hw_w1",
      title: "Task 2 essay: Technology in education",
      description: "Write a 250-word essay arguing for or against tech in classrooms.",
      subject: "writing",
      groupId: groupA.id,
      dueAt: new Date(now + day * 1).toISOString(),
      estimatedMinutes: 40,
      createdAt: new Date(now - day * 2).toISOString(),
      createdBy: "Teacher",
    },
    {
      id: "hw_l1",
      title: "Listening Section 4 practice",
      description: "Complete the academic lecture exercise and submit answers.",
      subject: "listening",
      groupId: groupB.id,
      dueAt: new Date(now - day * 1).toISOString(),
      estimatedMinutes: 30,
      createdAt: new Date(now - day * 6).toISOString(),
      createdBy: "Teacher",
    },
    {
      id: "hw_g1",
      title: "Verb To Be — Am, Is, Are (Intermediate)",
      description: "Practise the verb 'to be' with proper nouns and compound subjects.",
      subject: "grammar",
      groupId: groupA.id,
      dueAt: new Date(now + day * 3).toISOString(),
      estimatedMinutes: 12,
      createdAt: new Date(now - day * 1.5).toISOString(),
      createdBy: "Teacher",
      exerciseSlug: "verb-to-be-positive-intermediate",
    },
    {
      id: "hw_g2",
      title: "There Is / There Are Statements",
      description: "Statements with countable and uncountable nouns.",
      subject: "grammar",
      groupId: groupB.id,
      dueAt: new Date(now + day * 4).toISOString(),
      estimatedMinutes: 10,
      createdAt: new Date(now - day * 0.5).toISOString(),
      createdBy: "Admin",
      exerciseSlug: "there-is-there-are-statements",
    },
    {
      id: "hw_s1",
      title: "Speaking Part 2 — Describe a memorable journey",
      description: "Record a 2-minute response. Cover when, where, who and why memorable.",
      subject: "speaking",
      groupId: groupA.id,
      dueAt: new Date(now + day * 5).toISOString(),
      estimatedMinutes: 15,
      createdAt: new Date(now - day * 0.8).toISOString(),
      createdBy: "Teacher",
    },
    {
      id: "hw_r2",
      title: "Cambridge 18 — Reading Passage 1 (Marine biology)",
      description: "Skim, scan and answer MCQ + matching headings.",
      subject: "reading",
      groupId: groupB.id,
      dueAt: new Date(now - day * 3).toISOString(),
      estimatedMinutes: 35,
      createdAt: new Date(now - day * 10).toISOString(),
      createdBy: "Teacher",
    },
    {
      id: "hw_l2",
      title: "Listening Section 2 — Tour at a museum",
      description: "Map labelling + multiple-choice on a guided tour.",
      subject: "listening",
      groupId: groupA.id,
      dueAt: new Date(now - day * 5).toISOString(),
      estimatedMinutes: 25,
      createdAt: new Date(now - day * 12).toISOString(),
      createdBy: "Admin",
    },
    {
      id: "hw_w2",
      title: "Task 1 letter: Complaint about a delayed flight",
      description: "Write a 150-word semi-formal letter to the airline.",
      subject: "writing",
      groupId: groupB.id,
      dueAt: new Date(now + day * 2).toISOString(),
      estimatedMinutes: 30,
      createdAt: new Date(now - day * 1).toISOString(),
      createdBy: "Teacher",
    },
  ]

  const submissions: HomeworkSubmission[] = [
    {
      id: uid("sub"),
      homeworkId: "hw_r1",
      studentId: "std_anna",
      status: "submitted",
      score: 8,
      submittedAt: new Date(now - day * 0.2).toISOString(),
      attempt: {
        totalQuestions: 14,
        correctCount: 12,
        durationSeconds: 38 * 60,
        mistakes: [
          {
            questionId: 31,
            prompt: "The author's main argument in paragraph 2 is that ______.",
            userAnswer: "tourism harms small towns",
            correctAnswer: "tourism reshapes local economies",
            explanation: "The text emphasises change rather than damage — keyword 'reshape'.",
          },
          {
            questionId: 37,
            prompt: "True / False / Not Given: 'All researchers agree on the cause.'",
            userAnswer: "True",
            correctAnswer: "Not Given",
            explanation: "The passage does not state whether all researchers agree.",
          },
        ],
      },
    },
    { id: uid("sub"), homeworkId: "hw_r1", studentId: "std_ivan", status: "in_progress" },
    { id: uid("sub"), homeworkId: "hw_r1", studentId: "std_lena", status: "pending" },
    {
      id: uid("sub"),
      homeworkId: "hw_w1",
      studentId: "std_anna",
      status: "graded",
      score: 7,
      submittedAt: new Date(now - day * 1).toISOString(),
      feedback: "Strong arguments, work on conjunctions.",
      attempt: {
        totalQuestions: 8,
        correctCount: 6,
        durationSeconds: 52 * 60,
        mistakes: [
          {
            questionId: 3,
            prompt: "Cohesion — overuse of 'and'",
            userAnswer: "and / and / and",
            correctAnswer: "also / moreover / in addition",
            explanation: "Vary linking devices to lift band score.",
          },
          {
            questionId: 6,
            prompt: "Subject–verb agreement",
            userAnswer: "the data shows",
            correctAnswer: "the data show",
            explanation: "'Data' is plural in academic English.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_w1",
      studentId: "std_ivan",
      status: "submitted",
      submittedAt: new Date(now - day * 0.5).toISOString(),
      attempt: {
        totalQuestions: 8,
        correctCount: 5,
        durationSeconds: 41 * 60,
        mistakes: [
          {
            questionId: 1,
            prompt: "Task achievement — addressing both views",
            userAnswer: "Only one side presented",
            correctAnswer: "Cover both perspectives, then state your view",
            explanation: "Task 2 'discuss both views' requires balanced coverage.",
          },
          {
            questionId: 4,
            prompt: "Word choice — informal expression",
            userAnswer: "kids",
            correctAnswer: "children / students",
            explanation: "Academic register avoids colloquial vocabulary.",
          },
          {
            questionId: 7,
            prompt: "Conclusion clarity",
            userAnswer: "In a way, I think both are okay.",
            correctAnswer: "A clear, restated position",
            explanation: "Conclusion must restate the thesis decisively.",
          },
        ],
      },
    },
    { id: uid("sub"), homeworkId: "hw_w1", studentId: "std_lena", status: "pending" },
    {
      id: uid("sub"),
      homeworkId: "hw_l1",
      studentId: "std_mark",
      status: "graded",
      score: 7.5,
      attempt: {
        totalQuestions: 10,
        correctCount: 9,
        durationSeconds: 24 * 60,
        mistakes: [
          {
            questionId: 5,
            prompt: "Fill in the missing number from the audio",
            userAnswer: "14",
            correctAnswer: "40",
            explanation: "Common 'teen vs ty' trap — listen to the stress pattern.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_l1",
      studentId: "std_polina",
      status: "submitted",
      submittedAt: new Date(now - day * 0.6).toISOString(),
      attempt: {
        totalQuestions: 10,
        correctCount: 6,
        durationSeconds: 27 * 60,
        mistakes: [
          {
            questionId: 2,
            prompt: "Date heard in the lecture",
            userAnswer: "1980",
            correctAnswer: "1918",
            explanation: "Speaker says 'nineteen-eighteen' — listen to vowel length.",
          },
          {
            questionId: 4,
            prompt: "Spelling of the surname",
            userAnswer: "Robinson",
            correctAnswer: "Robertson",
            explanation: "Tricky 'son' vs 'tson' — common spelling trap.",
          },
          {
            questionId: 7,
            prompt: "MCQ about lecturer's opinion",
            userAnswer: "B",
            correctAnswer: "C",
            explanation: "Lecturer used 'however' to introduce the correct viewpoint.",
          },
          {
            questionId: 9,
            prompt: "Numeric answer (population)",
            userAnswer: "2,500",
            correctAnswer: "25,000",
            explanation: "Watch for 'thousand' vs 'hundred'.",
          },
        ],
      },
    },

    {
      id: uid("sub"),
      homeworkId: "hw_g1",
      studentId: "std_anna",
      status: "graded",
      score: 8.5,
      submittedAt: new Date(now - day * 0.3).toISOString(),
      feedback: "Great pace, minor slips on plural subjects.",
      attempt: {
        totalQuestions: 12,
        correctCount: 11,
        durationSeconds: 9 * 60,
        mistakes: [
          {
            questionId: 7,
            prompt: "Tom and Jerry _____ best friends.",
            userAnswer: "is",
            correctAnswer: "are",
            explanation: "Compound subjects with 'and' take a plural verb.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_g1",
      studentId: "std_ivan",
      status: "submitted",
      submittedAt: new Date(now - day * 0.2).toISOString(),
      attempt: {
        totalQuestions: 12,
        correctCount: 8,
        durationSeconds: 14 * 60,
        mistakes: [
          {
            questionId: 3,
            prompt: "I _____ a student at this university.",
            userAnswer: "is",
            correctAnswer: "am",
            explanation: "'I' always pairs with 'am'.",
          },
          {
            questionId: 5,
            prompt: "She _____ from Spain.",
            userAnswer: "are",
            correctAnswer: "is",
            explanation: "Third person singular requires 'is'.",
          },
          {
            questionId: 8,
            prompt: "The books _____ on the table.",
            userAnswer: "is",
            correctAnswer: "are",
            explanation: "'Books' is plural, so use 'are'.",
          },
          {
            questionId: 11,
            prompt: "My parents _____ teachers.",
            userAnswer: "is",
            correctAnswer: "are",
            explanation: "'Parents' is plural, so use 'are'.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_g1",
      studentId: "std_lena",
      status: "in_progress",
    },

    {
      id: uid("sub"),
      homeworkId: "hw_g2",
      studentId: "std_mark",
      status: "submitted",
      submittedAt: new Date(now - day * 0.1).toISOString(),
      attempt: {
        totalQuestions: 10,
        correctCount: 9,
        durationSeconds: 7 * 60,
        mistakes: [
          {
            questionId: 4,
            prompt: "_____ many cars on the street.",
            userAnswer: "there is",
            correctAnswer: "there are",
            explanation: "'Cars' is plural → 'there are'.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_g2",
      studentId: "std_polina",
      status: "graded",
      score: 7,
      feedback: "Solid grasp, careful with uncountables.",
      submittedAt: new Date(now - day * 0.4).toISOString(),
      attempt: {
        totalQuestions: 10,
        correctCount: 8,
        durationSeconds: 8 * 60,
        mistakes: [
          {
            questionId: 3,
            prompt: "_____ some milk in the bottle.",
            userAnswer: "there are",
            correctAnswer: "there is",
            explanation: "Milk is uncountable → 'there is'.",
          },
          {
            questionId: 7,
            prompt: "_____ a lot of traffic today.",
            userAnswer: "there are",
            correctAnswer: "there is",
            explanation: "'Traffic' is uncountable → 'there is'.",
          },
        ],
      },
    },

    { id: uid("sub"), homeworkId: "hw_s1", studentId: "std_anna", status: "pending" },
    { id: uid("sub"), homeworkId: "hw_s1", studentId: "std_ivan", status: "pending" },
    {
      id: uid("sub"),
      homeworkId: "hw_s1",
      studentId: "std_lena",
      status: "submitted",
      submittedAt: new Date(now - day * 0.1).toISOString(),
      attempt: {
        totalQuestions: 4,
        correctCount: 3,
        durationSeconds: 2 * 60,
        mistakes: [
          {
            questionId: 4,
            prompt: "Fluency — long pauses while searching for vocabulary",
            userAnswer: "Frequent pauses (avg 3.2s)",
            correctAnswer: "Smooth delivery with natural fillers",
            explanation: "Use fillers like 'well…', 'let me see…' to avoid dead silence.",
          },
        ],
      },
    },

    {
      id: uid("sub"),
      homeworkId: "hw_r2",
      studentId: "std_mark",
      status: "graded",
      score: 6.5,
      submittedAt: new Date(now - day * 4).toISOString(),
      feedback: "Improve matching headings: read each paragraph's first/last lines.",
      attempt: {
        totalQuestions: 13,
        correctCount: 9,
        durationSeconds: 31 * 60,
        mistakes: [
          {
            questionId: 1,
            prompt: "Match heading to paragraph A",
            userAnswer: "iv",
            correctAnswer: "ii",
            explanation: "Paragraph A focuses on origin, not adaptation.",
          },
          {
            questionId: 5,
            prompt: "True / False / Not Given",
            userAnswer: "False",
            correctAnswer: "Not Given",
            explanation: "No information about cost is provided.",
          },
          {
            questionId: 9,
            prompt: "Fill-in: scientific term",
            userAnswer: "bioluminescence",
            correctAnswer: "bioluminescent",
            explanation: "Adjective form required by sentence structure.",
          },
          {
            questionId: 12,
            prompt: "MCQ on author's tone",
            userAnswer: "A",
            correctAnswer: "D",
            explanation: "Tone is cautious, not enthusiastic.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_r2",
      studentId: "std_polina",
      status: "graded",
      score: 7,
      submittedAt: new Date(now - day * 3.5).toISOString(),
      feedback: "Strong scanning, double-check the True/False/Not Given rules.",
      attempt: {
        totalQuestions: 13,
        correctCount: 10,
        durationSeconds: 28 * 60,
        mistakes: [
          {
            questionId: 4,
            prompt: "True / False / Not Given on temperature",
            userAnswer: "True",
            correctAnswer: "Not Given",
            explanation: "Passage does not state actual temperature numbers.",
          },
          {
            questionId: 10,
            prompt: "Vocabulary synonym",
            userAnswer: "fragile",
            correctAnswer: "vulnerable",
            explanation: "'Vulnerable' is the closer synonym in this context.",
          },
          {
            questionId: 13,
            prompt: "Summary completion",
            userAnswer: "predators",
            correctAnswer: "prey",
            explanation: "The sentence describes what the species hunts (prey).",
          },
        ],
      },
    },

    {
      id: uid("sub"),
      homeworkId: "hw_l2",
      studentId: "std_anna",
      status: "graded",
      score: 8,
      submittedAt: new Date(now - day * 6).toISOString(),
      feedback: "Excellent — almost perfect map labelling.",
      attempt: {
        totalQuestions: 10,
        correctCount: 9,
        durationSeconds: 22 * 60,
        mistakes: [
          {
            questionId: 6,
            prompt: "Map labelling — west wing",
            userAnswer: "Gallery",
            correctAnswer: "Auditorium",
            explanation: "Speaker uses 'on the left of the entrance' to describe the auditorium.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_l2",
      studentId: "std_ivan",
      status: "graded",
      score: 6.5,
      submittedAt: new Date(now - day * 5.5).toISOString(),
      feedback: "Watch directions vocabulary (opposite, between, across from).",
      attempt: {
        totalQuestions: 10,
        correctCount: 7,
        durationSeconds: 26 * 60,
        mistakes: [
          {
            questionId: 3,
            prompt: "MCQ on opening hours",
            userAnswer: "C",
            correctAnswer: "B",
            explanation: "Speaker says weekdays only, ruling out option C.",
          },
          {
            questionId: 5,
            prompt: "Map labelling — entrance side",
            userAnswer: "north",
            correctAnswer: "south",
            explanation: "Listen for 'opposite the river' which indicates south.",
          },
          {
            questionId: 8,
            prompt: "Fill-in: ticket price",
            userAnswer: "$15",
            correctAnswer: "$50",
            explanation: "Speaker says fifty, not fifteen. Mind the stress.",
          },
        ],
      },
    },
    {
      id: uid("sub"),
      homeworkId: "hw_l2",
      studentId: "std_lena",
      status: "submitted",
      submittedAt: new Date(now - day * 4.9).toISOString(),
      attempt: {
        totalQuestions: 10,
        correctCount: 8,
        durationSeconds: 24 * 60,
        mistakes: [
          {
            questionId: 2,
            prompt: "Fill-in: founder's first name",
            userAnswer: "Jhon",
            correctAnswer: "John",
            explanation: "Spelling — common typo. Always double-check proper nouns.",
          },
          {
            questionId: 9,
            prompt: "Multiple choice on artist's nationality",
            userAnswer: "Italian",
            correctAnswer: "Spanish",
            explanation: "Speaker mentions Barcelona — points to Spanish origin.",
          },
        ],
      },
    },

    { id: uid("sub"), homeworkId: "hw_w2", studentId: "std_mark", status: "in_progress" },
    { id: uid("sub"), homeworkId: "hw_w2", studentId: "std_polina", status: "pending" },
  ]

  const months = ["April 2026", "May 2026", "June 2026"]
  const payments: Payment[] = []
  for (const s of students) {
    months.forEach((label, idx) => {
      const dueOffsetDays = (months.length - 1 - idx) * 30
      const dueDate = new Date(now - day * dueOffsetDays + day * 5).toISOString()
      const isPast = new Date(dueDate).getTime() < now
      const paid = idx < months.length - 1 ? Math.random() > 0.2 : Math.random() > 0.5
      const status: PaymentStatus = paid ? "paid" : isPast ? "overdue" : "pending"
      payments.push({
        id: uid("pay"),
        studentId: s.id,
        groupId: s.groupId!,
        amount: s.monthlyFee ?? 900_000,
        periodLabel: label,
        dueDate,
        paidDate: paid ? new Date(new Date(dueDate).getTime() - day * 2).toISOString() : undefined,
        status,
      })
    })
  }

  safeWrite(KEYS.groups, [groupA, groupB])
  safeWrite(KEYS.students, students)
  safeWrite(KEYS.homework, homework)
  safeWrite(KEYS.submissions, submissions)
  safeWrite(KEYS.payments, payments)
  localStorage.setItem(KEYS.seeded, "1")
}

// ---------- Public API ----------

export function ensureSeeded(): void {
  seedIfNeeded()
}

// Groups
export function listGroups(): Group[] {
  seedIfNeeded()
  return safeRead<Group[]>(KEYS.groups, [])
}
export function getGroup(id: string): Group | undefined {
  return listGroups().find((g) => g.id === id)
}

/** Known teacher display names (mock — no teacher store yet). */
const TEACHER_NAMES: Record<string, string> = {
  "teacher-1": "Sarah Teacher",
}
export function getTeacherName(teacherId?: string): string | undefined {
  if (!teacherId) return undefined
  return TEACHER_NAMES[teacherId] ?? "Your teacher"
}
export function createGroup(input: Omit<Group, "id" | "createdAt" | "studentIds"> & { studentIds?: string[] }): Group {
  const groups = listGroups()
  const group: Group = {
    ...input,
    id: uid("grp"),
    studentIds: input.studentIds ?? [],
    createdAt: new Date().toISOString(),
  }
  safeWrite(KEYS.groups, [group, ...groups])
  return group
}
export function updateGroup(id: string, patch: Partial<Group>): Group | undefined {
  const groups = listGroups()
  const idx = groups.findIndex((g) => g.id === id)
  if (idx === -1) return undefined
  groups[idx] = { ...groups[idx], ...patch }
  safeWrite(KEYS.groups, groups)
  return groups[idx]
}
export function deleteGroup(id: string): void {
  const groups = listGroups().filter((g) => g.id !== id)
  safeWrite(KEYS.groups, groups)
  const students = listStudents().map((s) => (s.groupId === id ? { ...s, groupId: undefined } : s))
  safeWrite(KEYS.students, students)
}
export function addStudentToGroup(groupId: string, studentId: string): void {
  const groups = listGroups()
  const idx = groups.findIndex((g) => g.id === groupId)
  if (idx === -1) return
  if (!groups[idx].studentIds.includes(studentId)) {
    groups[idx].studentIds = [...groups[idx].studentIds, studentId]
    safeWrite(KEYS.groups, groups)
  }
  updateStudent(studentId, { groupId })
}
export function removeStudentFromGroup(groupId: string, studentId: string): void {
  const groups = listGroups()
  const idx = groups.findIndex((g) => g.id === groupId)
  if (idx === -1) return
  groups[idx].studentIds = groups[idx].studentIds.filter((sid) => sid !== studentId)
  safeWrite(KEYS.groups, groups)
  const student = getStudent(studentId)
  if (student && student.groupId === groupId) updateStudent(studentId, { groupId: undefined })
}

// Students
export function listStudents(): Student[] {
  seedIfNeeded()
  return safeRead<Student[]>(KEYS.students, [])
}
export function getStudent(id: string): Student | undefined {
  return listStudents().find((s) => s.id === id)
}
export function createStudent(input: Omit<Student, "id" | "joinedAt">): Student {
  const list = listStudents()
  const student: Student = {
    ...input,
    id: uid("std"),
    joinedAt: new Date().toISOString(),
  }
  safeWrite(KEYS.students, [student, ...list])
  if (student.groupId) addStudentToGroup(student.groupId, student.id)
  return student
}
export function updateStudent(id: string, patch: Partial<Student>): Student | undefined {
  const list = listStudents()
  const idx = list.findIndex((s) => s.id === id)
  if (idx === -1) return undefined
  list[idx] = { ...list[idx], ...patch }
  safeWrite(KEYS.students, list)
  return list[idx]
}
export function deleteStudent(id: string): void {
  const student = getStudent(id)
  if (student?.groupId) removeStudentFromGroup(student.groupId, id)
  safeWrite(KEYS.students, listStudents().filter((s) => s.id !== id))
  safeWrite(KEYS.submissions, listSubmissions().filter((s) => s.studentId !== id))
  safeWrite(KEYS.payments, listPayments().filter((p) => p.studentId !== id))
}

// Homework
export function listHomework(): HomeworkAssignment[] {
  seedIfNeeded()
  return safeRead<HomeworkAssignment[]>(KEYS.homework, [])
}
export function getHomework(id: string): HomeworkAssignment | undefined {
  return listHomework().find((h) => h.id === id)
}
export function createHomework(input: Omit<HomeworkAssignment, "id" | "createdAt">): HomeworkAssignment {
  const list = listHomework()
  const hw: HomeworkAssignment = {
    ...input,
    id: uid("hw"),
    createdAt: new Date().toISOString(),
  }
  safeWrite(KEYS.homework, [hw, ...list])
  const group = getGroup(hw.groupId)
  if (group) {
    const subs = listSubmissions()
    const exercise =
      hw.subject === "grammar" && hw.exerciseSlug
        ? getGrammarExercise(hw.exerciseSlug)
        : undefined
    const newSubs: HomeworkSubmission[] = group.studentIds.map((studentId, idx) => {
      const sub: HomeworkSubmission = {
        id: uid("sub"),
        homeworkId: hw.id,
        studentId,
        status: "pending",
      }
      // The real demo student (Alex) must actually solve the homework, so
      // never pre-fill a mock attempt for them — keep it pending.
      if (exercise && studentId !== DEMO_STUDENT.id) {
        // Pre-fill ~60% of students with a mock attempt so the teacher view
        // immediately shows realistic per-student results.
        const stableHash = (studentId + hw.id).split("").reduce(
          (a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0,
          0,
        )
        const r = Math.abs(stableHash) % 100
        if (r < 60) {
          const attempt = buildMockAttempt(exercise, stableHash)
          sub.attempt = attempt
          sub.status = r < 25 ? "graded" : "submitted"
          sub.score = Math.round(
            ((attempt.correctCount / attempt.totalQuestions) * 9) * 2,
          ) / 2
          sub.submittedAt = new Date(
            Date.now() - (idx + 1) * 60 * 60 * 1000,
          ).toISOString()
        }
      }
      return sub
    })
    safeWrite(KEYS.submissions, [...subs, ...newSubs])
  }
  return hw
}

function buildMockAttempt(
  exercise: GrammarExercise,
  seed: number,
): HomeworkAttempt {
  const qs = exercise.content.questions ?? []
  const pairs = exercise.content.pairs ?? []
  // Normalise every supported type into a flat list of gradable items.
  const items: { id: number; prompt: string; correct: string; explanation: string }[] =
    pairs.length > 0
      ? pairs.map((p, i) => ({
          id: i + 1,
          prompt: p.left,
          correct: p.right,
          explanation: `${p.left} → ${p.right}`,
        }))
      : qs.map((q) => ({
          id: q.id,
          prompt: q.text,
          correct: (
            q.answer ??
            q.correctAnswer ??
            q.blanks?.[0] ??
            q.acceptableAnswers?.[0]?.[0] ??
            (q.correctBool !== undefined ? (q.correctBool ? "True" : "False") : undefined) ??
            "—"
          ).toString(),
          explanation: q.explanation,
        }))
  const total = items.length || exercise.totalQuestions || 0
  if (total === 0 || items.length === 0) {
    return { totalQuestions: total, correctCount: total, mistakes: [] }
  }
  let s = Math.abs(seed) || 1
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const wrongCount = Math.min(total, Math.floor(rand() * 4) + (rand() > 0.6 ? 1 : 0))
  const indices = new Set<number>()
  while (indices.size < wrongCount) {
    indices.add(Math.floor(rand() * total))
  }
  const mistakes: HomeworkMistake[] = Array.from(indices).map((i) => {
    const item = items[i]
    const correct = item.correct
    const wrong = makeWrongAnswer(correct, rand)
    return {
      questionId: item.id,
      prompt: item.prompt,
      userAnswer: wrong,
      correctAnswer: correct,
      explanation: item.explanation,
    }
  })
  return {
    totalQuestions: total,
    correctCount: total - mistakes.length,
    durationSeconds: Math.round(exercise.estimatedTime * 60 * (0.8 + rand() * 0.6)),
    mistakes,
  }
}

const COMMON_WRONG_POOL = ["am", "is", "are", "was", "were", "there is", "there are", "have", "has", "do", "does"]

function makeWrongAnswer(correct: string, rand: () => number): string {
  const c = correct.trim().toLowerCase()
  const alt = COMMON_WRONG_POOL.find((w) => w !== c) ?? "—"
  if (c === "true") return "False"
  if (c === "false") return "True"
  if (c === "am") return rand() > 0.5 ? "is" : "are"
  if (c === "is") return rand() > 0.5 ? "are" : "am"
  if (c === "are") return rand() > 0.5 ? "is" : "am"
  if (c === "there is") return "there are"
  if (c === "there are") return "there is"
  return alt
}
export function deleteHomework(id: string): void {
  safeWrite(KEYS.homework, listHomework().filter((h) => h.id !== id))
  safeWrite(KEYS.submissions, listSubmissions().filter((s) => s.homeworkId !== id))
}
export function listSubmissions(): HomeworkSubmission[] {
  seedIfNeeded()
  return safeRead<HomeworkSubmission[]>(KEYS.submissions, [])
}
export function updateSubmission(id: string, patch: Partial<HomeworkSubmission>): void {
  const list = listSubmissions()
  const idx = list.findIndex((s) => s.id === id)
  if (idx === -1) return
  list[idx] = { ...list[idx], ...patch }
  safeWrite(KEYS.submissions, list)
}

// ---------- Student-facing helpers ----------

/** Demo student tied to the seeded "student@ielts.com" auth account (id student-1). */
const DEMO_STUDENT = {
  id: "student-1",
  name: "Alex Student",
  email: "student@ielts.com",
}

/**
 * Make sure a Student record exists for the given account and belongs to a
 * group, so that homework assigned to that group reaches them. Idempotent —
 * safe to call on every dashboard/admin load. Defaults to the demo student.
 */
export function ensureStudentAccount(
  account: { id: string; name: string; email: string } = DEMO_STUDENT,
): Student {
  seedIfNeeded()
  const existing = getStudent(account.id)
  const pickGroupId = (): string => {
    const groups = listGroups()
    if (groups[0]) return groups[0].id
    return createGroup({ name: "My Group", description: "Default group" }).id
  }

  if (!existing) {
    const groupId = pickGroupId()
    const student: Student = {
      id: account.id,
      name: account.name,
      email: account.email,
      groupId,
      joinedAt: new Date().toISOString(),
    }
    safeWrite(KEYS.students, [student, ...listStudents()])
    addStudentToGroup(groupId, student.id)
    return student
  }

  if (!existing.groupId) {
    const groupId = pickGroupId()
    addStudentToGroup(groupId, existing.id)
    return getStudent(existing.id) ?? existing
  }
  return existing
}

/** Stable id for the always-present demo assignment for Alex. */
const DEMO_HOMEWORK_ID = "hw-demo-alex"

/**
 * Guarantee that the demo student (Alex) always has at least one homework
 * assignment in their group, starting in "pending" status. Idempotent.
 */
export function ensureDemoHomework(): void {
  const student = ensureStudentAccount()
  if (!student.groupId) return

  if (listHomework().some((h) => h.id === DEMO_HOMEWORK_ID)) return

  const exercise =
    getGrammarExercise("verb-to-be-positive-easy") ??
    listGrammarExercises().find((e) => e.category === "grammar")
  if (!exercise) return

  const hw: HomeworkAssignment = {
    id: DEMO_HOMEWORK_ID,
    title: exercise.title,
    description: exercise.description,
    subject: "grammar",
    groupId: student.groupId,
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    estimatedMinutes: Math.max(1, exercise.estimatedTime),
    createdAt: new Date().toISOString(),
    createdBy: "System",
    exerciseSlug: exercise.slug,
  }
  safeWrite(KEYS.homework, [hw, ...listHomework()])

  const subs = listSubmissions()
  if (!subs.some((s) => s.homeworkId === DEMO_HOMEWORK_ID && s.studentId === student.id)) {
    subs.push({
      id: uid("sub"),
      homeworkId: DEMO_HOMEWORK_ID,
      studentId: student.id,
      status: "pending",
    })
    safeWrite(KEYS.submissions, subs)
  }
}

export interface StudentHomeworkEntry {
  homework: HomeworkAssignment
  submission: HomeworkSubmission
}

/** All homework assigned to a student (via their submission records). */
export function listStudentHomework(studentId: string): StudentHomeworkEntry[] {
  const subs = listSubmissions().filter((s) => s.studentId === studentId)
  const hw = listHomework()
  const out: StudentHomeworkEntry[] = []
  for (const s of subs) {
    const h = hw.find((x) => x.id === s.homeworkId)
    if (h) out.push({ homework: h, submission: s })
  }
  return out
}

/**
 * Mark a homework as started by the student (status → in_progress) the first
 * time they open the exercise. No-op if it's already submitted/graded.
 */
export function markHomeworkStarted(homeworkId: string, studentId: string): void {
  const list = listSubmissions()
  const startedAt = new Date().toISOString()
  const idx = list.findIndex(
    (s) => s.homeworkId === homeworkId && s.studentId === studentId,
  )
  if (idx === -1) {
    list.push({
      id: uid("sub"),
      homeworkId,
      studentId,
      status: "in_progress",
      startedAt,
    })
  } else {
    const current = list[idx]
    if (current.status === "submitted" || current.status === "graded") return
    list[idx] = {
      ...current,
      status: "in_progress",
      startedAt: current.startedAt ?? startedAt,
    }
  }
  safeWrite(KEYS.submissions, list)
}

/** Record a student's own attempt at a homework exercise and mark it submitted. */
export function recordHomeworkAttempt(params: {
  homeworkId: string
  studentId: string
  attempt: HomeworkAttempt
}): void {
  const list = listSubmissions()
  const score =
    params.attempt.totalQuestions > 0
      ? Math.round((params.attempt.correctCount / params.attempt.totalQuestions) * 9 * 2) / 2
      : undefined
  const idx = list.findIndex(
    (s) => s.homeworkId === params.homeworkId && s.studentId === params.studentId,
  )
  const submittedAt = new Date().toISOString()
  if (idx === -1) {
    list.push({
      id: uid("sub"),
      homeworkId: params.homeworkId,
      studentId: params.studentId,
      status: "submitted",
      score,
      startedAt: submittedAt,
      submittedAt,
      attempt: params.attempt,
    })
  } else {
    list[idx] = {
      ...list[idx],
      status: "submitted",
      score,
      startedAt: list[idx].startedAt ?? submittedAt,
      submittedAt,
      attempt: params.attempt,
    }
  }
  safeWrite(KEYS.submissions, list)
}

// Payments
export function listPayments(): Payment[] {
  seedIfNeeded()
  return safeRead<Payment[]>(KEYS.payments, [])
}
export function createPayment(input: Omit<Payment, "id">): Payment {
  const list = listPayments()
  const payment: Payment = { ...input, id: uid("pay") }
  safeWrite(KEYS.payments, [payment, ...list])
  return payment
}
export function updatePayment(id: string, patch: Partial<Payment>): Payment | undefined {
  const list = listPayments()
  const idx = list.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  list[idx] = { ...list[idx], ...patch }
  safeWrite(KEYS.payments, list)
  return list[idx]
}
export function deletePayment(id: string): void {
  safeWrite(KEYS.payments, listPayments().filter((p) => p.id !== id))
}
export function markPaymentPaid(id: string): void {
  updatePayment(id, {
    status: "paid",
    paidDate: new Date().toISOString(),
  })
}
export function markPaymentUnpaid(id: string): void {
  const payment = listPayments().find((p) => p.id === id)
  if (!payment) return
  const overdue = new Date(payment.dueDate).getTime() < Date.now()
  updatePayment(id, {
    status: overdue ? "overdue" : "pending",
    paidDate: undefined,
  })
}

// Derived helpers
export interface StudentProgress {
  totalHomework: number
  completedHomework: number
  pendingHomework: number
  averageScore: number | null
  upcomingPayment?: Payment
  unpaidTotal: number
  paidTotal: number
}

export function getStudentProgress(studentId: string): StudentProgress {
  const subs = listSubmissions().filter((s) => s.studentId === studentId)
  const completed = subs.filter((s) => s.status === "graded" || s.status === "submitted")
  const scored = subs.filter((s) => typeof s.score === "number")
  const avg = scored.length ? scored.reduce((a, b) => a + (b.score ?? 0), 0) / scored.length : null

  const payments = listPayments().filter((p) => p.studentId === studentId)
  const upcoming = payments
    .filter((p) => p.status !== "paid")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
  const unpaidTotal = payments
    .filter((p) => p.status !== "paid")
    .reduce((a, b) => a + b.amount, 0)
  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((a, b) => a + b.amount, 0)

  return {
    totalHomework: subs.length,
    completedHomework: completed.length,
    pendingHomework: subs.length - completed.length,
    averageScore: avg,
    upcomingPayment: upcoming,
    unpaidTotal,
    paidTotal,
  }
}

export function getGroupFinanceSummary(groupId: string): {
  expectedTotal: number
  paidTotal: number
  overdueTotal: number
  pendingTotal: number
} {
  const payments = listPayments().filter((p) => p.groupId === groupId)
  let expectedTotal = 0
  let paidTotal = 0
  let overdueTotal = 0
  let pendingTotal = 0
  for (const p of payments) {
    expectedTotal += p.amount
    if (p.status === "paid") paidTotal += p.amount
    else if (p.status === "overdue") overdueTotal += p.amount
    else pendingTotal += p.amount
  }
  return { expectedTotal, paidTotal, overdueTotal, pendingTotal }
}
