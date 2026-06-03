import type { GrammarExercise } from "./grammar-types"
import verbToBeSeed from "./grammar-verb-to-be.json"

const STORAGE_KEY = "grammar:exercises:v6"

/** 11 exercises from exercises.json — topic verb-to-be */
const VERB_TO_BE: GrammarExercise[] = verbToBeSeed as GrammarExercise[]

/** Multiple-choice exercises for the verb-to-be topic. */
const VERB_TO_BE_MC: GrammarExercise[] = [
  {
    id: "verb-to-be-multiple-choice-basic",
    slug: "verb-to-be-multiple-choice-basic",
    title: "Verb To Be — Multiple Choice (Basic)",
    description: "Choose the correct form of the verb 'to be'.",
    category: "grammar",
    topic: "verb-to-be",
    subtopic: "multiple-choice-basic",
    difficulty: "easy",
    level: "A1",
    type: "multiple-choice",
    estimatedTime: 10,
    totalQuestions: 10,
    passingScore: 7,
    tags: ["verb to be", "am", "is", "are", "A1 grammar"],
    instructions: "Choose the correct form of the verb 'to be' (am, is, are).",
    tips: [
      "Use 'am' with I.",
      "Use 'is' with he, she, it.",
      "Use 'are' with you, we, they.",
    ],
    content: {
      questions: [
        { id: 1, text: "I ___ a student.", options: ["am", "is", "are"], correctAnswer: "am", hint: "Use 'am' with I.", explanation: "I am a student." },
        { id: 2, text: "She ___ my sister.", options: ["am", "is", "are"], correctAnswer: "is", hint: "Use 'is' with he/she/it.", explanation: "She is my sister." },
        { id: 3, text: "They ___ at home.", options: ["am", "is", "are"], correctAnswer: "are", hint: "Use 'are' with they.", explanation: "They are at home." },
        { id: 4, text: "We ___ friends.", options: ["am", "is", "are"], correctAnswer: "are", hint: "Use 'are' with we.", explanation: "We are friends." },
        { id: 5, text: "He ___ a teacher.", options: ["am", "is", "are"], correctAnswer: "is", hint: "He → is", explanation: "He is a teacher." },
        { id: 6, text: "You ___ very kind.", options: ["am", "is", "are"], correctAnswer: "are", hint: "Use 'are' with you.", explanation: "You are very kind." },
        { id: 7, text: "It ___ cold today.", options: ["am", "is", "are"], correctAnswer: "is", hint: "Use 'is' with it.", explanation: "It is cold today." },
        { id: 8, text: "I ___ happy.", options: ["am", "is", "are"], correctAnswer: "am", hint: "I → am", explanation: "I am happy." },
        { id: 9, text: "They ___ students.", options: ["am", "is", "are"], correctAnswer: "are", hint: "They → are", explanation: "They are students." },
        { id: 10, text: "She ___ at work.", options: ["am", "is", "are"], correctAnswer: "is", hint: "She → is", explanation: "She is at work." },
      ],
    },
  },
  {
    id: "verb-to-be-matching-basic",
    slug: "verb-to-be-matching-basic",
    title: "Verb To Be — Matching",
    description: "Match the subject with the correct form of the verb 'to be'.",
    category: "grammar",
    topic: "verb-to-be",
    subtopic: "matching-basic",
    difficulty: "easy",
    level: "A1",
    type: "matching",
    estimatedTime: 7,
    totalQuestions: 5,
    passingScore: 3,
    tags: ["verb to be", "matching", "A1 grammar"],
    instructions: "Match each subject with the correct form of the verb 'to be'.",
    tips: [],
    content: {
      pairs: [
        { left: "I", right: "am" },
        { left: "He", right: "is" },
        { left: "They", right: "are" },
        { left: "It", right: "is" },
        { left: "We", right: "are" },
      ],
    },
  },
  {
    id: "verb-to-be-word-formation-basic",
    slug: "verb-to-be-word-formation-basic",
    title: "Verb To Be — Word Formation",
    description: "Use the correct form of the verb 'to be'.",
    category: "grammar",
    topic: "verb-to-be",
    subtopic: "word-formation-basic",
    difficulty: "easy",
    level: "A1",
    type: "word-formation",
    estimatedTime: 8,
    totalQuestions: 5,
    passingScore: 3,
    tags: ["verb to be", "word formation", "A1 grammar"],
    instructions: "Write the correct form of the verb 'to be'.",
    tips: [],
    content: {
      questions: [
        { id: 1, text: "I ___ (be) a student.", answer: "am", explanation: "I → am" },
        { id: 2, text: "She ___ (be) happy.", answer: "is", explanation: "She → is" },
        { id: 3, text: "They ___ (be) at home.", answer: "are", explanation: "They → are" },
        { id: 4, text: "We ___ (be) ready.", answer: "are", explanation: "We → are" },
        { id: 5, text: "It ___ (be) cold.", answer: "is", explanation: "It → is" },
      ],
    },
  },
  {
    id: "verb-to-be-true-false-basic",
    slug: "verb-to-be-true-false-basic",
    title: "Verb To Be — True or False",
    description: "Decide if the sentence is correct.",
    category: "grammar",
    topic: "verb-to-be",
    subtopic: "true-false-basic",
    difficulty: "easy",
    level: "A1",
    type: "true-false",
    estimatedTime: 7,
    totalQuestions: 5,
    passingScore: 3,
    tags: ["verb to be", "true false", "A1 grammar"],
    instructions: "Choose whether the sentence is correct or incorrect.",
    tips: [],
    content: {
      questions: [
        { id: 1, text: "I is a student.", correctBool: false, explanation: "Correct: I am a student." },
        { id: 2, text: "She is my friend.", correctBool: true, explanation: "Correct sentence." },
        { id: 3, text: "They am at home.", correctBool: false, explanation: "Correct: They are at home." },
        { id: 4, text: "We are ready.", correctBool: true, explanation: "Correct sentence." },
        { id: 5, text: "He are a teacher.", correctBool: false, explanation: "Correct: He is a teacher." },
      ],
    },
  },
  {
    id: "verb-to-be-sentence-transformation-basic",
    slug: "verb-to-be-sentence-transformation-basic",
    title: "Verb To Be — Sentence Transformation",
    description: "Rewrite the sentence using contractions.",
    category: "grammar",
    topic: "verb-to-be",
    subtopic: "sentence-transformation-basic",
    difficulty: "easy",
    level: "A1",
    type: "sentence-transformation",
    estimatedTime: 10,
    totalQuestions: 5,
    passingScore: 3,
    tags: ["verb to be", "sentence transformation", "contractions", "A1 grammar"],
    instructions: "Rewrite each sentence using the short form (contraction).",
    tips: [],
    content: {
      questions: [
        { id: 1, text: "I am a student.", answer: "I'm a student.", explanation: "I am → I'm" },
        { id: 2, text: "She is my sister.", answer: "She's my sister.", explanation: "She is → She's" },
        { id: 3, text: "They are at home.", answer: "They're at home.", explanation: "They are → They're" },
        { id: 4, text: "We are ready.", answer: "We're ready.", explanation: "We are → We're" },
        { id: 5, text: "It is cold.", answer: "It's cold.", explanation: "It is → It's" },
      ],
    },
  },
]

const THERE_IS: GrammarExercise[] = [
  {
    id: "there-is-there-are-statements",
    slug: "there-is-there-are-statements",
    title: "There Is / There Are Statements",
    description: "Practise statements with countable and uncountable nouns",
    category: "grammar",
    topic: "there-is-there-are",
    subtopic: "statements",
    difficulty: "easy",
    level: "A1-A2",
    type: "fill-in-the-blank",
    estimatedTime: 10,
    totalQuestions: 10,
    passingScore: 7,
    tags: ["there is", "there are", "statements", "A1-A2 grammar"],
    instructions: "Complete each statement with the correct form.",
    tips: [
      "Use 'There is' before singular and uncountable nouns.",
      "Use 'There are' before plural nouns.",
    ],
    content: {
      questions: [
        { id: 1, instruction: "Complete the statement.", text: "_____ a book on the desk.", blanks: ["there is"], acceptableAnswers: [["there is"]], explanation: "Book is singular, so use 'there is'.", hint: "Singular noun." },
        { id: 2, instruction: "Complete the statement.", text: "_____ two windows in this room.", blanks: ["there are"], acceptableAnswers: [["there are"]], explanation: "Windows is plural, so use 'there are'.", hint: "Plural noun." },
        { id: 3, instruction: "Complete the statement.", text: "_____ some milk in the bottle.", blanks: ["there is"], acceptableAnswers: [["there is"]], explanation: "Milk is uncountable, so use 'there is'.", hint: "Uncountable noun." },
        { id: 4, instruction: "Complete the statement.", text: "_____ many cars on the street.", blanks: ["there are"], acceptableAnswers: [["there are"]], explanation: "Cars is plural, so use 'there are'.", hint: "Plural noun." },
        { id: 5, instruction: "Complete the statement.", text: "_____ no time to wait.", blanks: ["there is"], acceptableAnswers: [["there is"]], explanation: "Time is uncountable, so use 'there is'.", hint: "Uncountable noun." },
        { id: 6, instruction: "Complete the statement.", text: "_____ three boys in my class.", blanks: ["there are"], acceptableAnswers: [["there are"]], explanation: "Boys is plural, so use 'there are'.", hint: "Plural noun." },
        { id: 7, instruction: "Complete the statement.", text: "_____ a lot of traffic today.", blanks: ["there is"], acceptableAnswers: [["there is"]], explanation: "Traffic is uncountable, so use 'there is'.", hint: "Uncountable noun." },
        { id: 8, instruction: "Complete the statement.", text: "_____ several mistakes in your essay.", blanks: ["there are"], acceptableAnswers: [["there are"]], explanation: "Mistakes is plural, so use 'there are'.", hint: "Plural noun." },
        { id: 9, instruction: "Complete the statement.", text: "_____ a small bakery near my house.", blanks: ["there is"], acceptableAnswers: [["there is"]], explanation: "Bakery is singular, so use 'there is'.", hint: "Singular noun." },
        { id: 10, instruction: "Complete the statement.", text: "_____ four seasons in a year.", blanks: ["there are"], acceptableAnswers: [["there are"]], explanation: "Seasons is plural, so use 'there are'.", hint: "Plural noun." },
      ],
    },
  },
  {
    id: "there-is-there-are-questions",
    slug: "there-is-there-are-questions",
    title: "Is There / Are There Questions",
    description: "Practise yes-no questions with singular, plural, and uncountable nouns",
    category: "grammar",
    topic: "there-is-there-are",
    subtopic: "questions",
    difficulty: "easy",
    level: "A1-A2",
    type: "fill-in-the-blank",
    estimatedTime: 12,
    totalQuestions: 20,
    passingScore: 14,
    tags: ["is there", "are there", "questions", "A1-A2 grammar"],
    instructions: "Complete each question with the correct opening phrase.",
    tips: [
      "Use 'Is there ...?' with singular countable and uncountable nouns.",
      "Use 'Are there ...?' with plural nouns.",
      "Questions often use a, an, or any inside the opening phrase.",
    ],
    content: {
      questions: [
        { id: 1, instruction: "Complete the question.", text: "_____ hot water in the shower now?", blanks: ["is there any"], acceptableAnswers: [["is there any"]], explanation: "'Hot water' is uncountable, so the correct opening is 'Is there any ...?'", hint: "What form matches an uncountable noun?" },
        { id: 2, instruction: "Complete the question.", text: "_____ pharmacy near the hotel?", blanks: ["is there a"], acceptableAnswers: [["is there a"]], explanation: "'Pharmacy' is singular and countable, so the correct question is 'Is there a pharmacy ...?'", hint: "Do you need a singular or plural question?" },
        { id: 3, instruction: "Complete the question.", text: "_____ information about the museum online?", blanks: ["is there any"], acceptableAnswers: [["is there any"]], explanation: "'Information' is uncountable, so the correct opening is 'Is there any ...?'", hint: "How do you ask about an uncountable noun?" },
        { id: 4, instruction: "Complete the question.", text: "_____ airport near your town?", blanks: ["is there an"], acceptableAnswers: [["is there an"]], explanation: "'Airport' is singular and begins with a vowel sound, so we use 'an'.", hint: "Which article fits before a word starting with a vowel sound?" },
        { id: 5, instruction: "Complete the question.", text: "_____ chairs in the waiting room?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Chairs' is plural, so the correct form is 'Are there any chairs ...?'", hint: "What opening matches plural nouns?" },
        { id: 6, instruction: "Complete the question.", text: "_____ orange in your lunch box?", blanks: ["is there an"], acceptableAnswers: [["is there an"]], explanation: "'Orange' is singular and begins with a vowel sound, so the article is 'an'.", hint: "Which article fits before this noun?" },
        { id: 7, instruction: "Complete the question.", text: "_____ students absent today?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Students' is plural, so the question needs 'Are there any ...?'", hint: "What opening goes with plural people?" },
        { id: 8, instruction: "Complete the question.", text: "_____ swimming pool in your building?", blanks: ["is there a"], acceptableAnswers: [["is there a"]], explanation: "'Swimming pool' is singular, so we use 'Is there a ...?'", hint: "Are you asking about one pool or several?" },
        { id: 9, instruction: "Complete the question.", text: "_____ sugar in this tea?", blanks: ["is there any"], acceptableAnswers: [["is there any"]], explanation: "'Sugar' is uncountable, so the correct question is 'Is there any sugar ...?'", hint: "Would you use a/an with this noun?" },
        { id: 10, instruction: "Complete the question.", text: "_____ supermarkets open on Sundays here?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Supermarkets' is plural, so the question takes 'Are there any ...?'", hint: "Does the noun phrase refer to one shop or more?" },
        { id: 11, instruction: "Complete the question.", text: "_____ cinema in your neighbourhood?", blanks: ["is there a"], acceptableAnswers: [["is there a"]], explanation: "'Cinema' is singular and countable, so we use 'Is there a ...?'", hint: "What article do you need before this noun?" },
        { id: 12, instruction: "Complete the question.", text: "_____ good cafes near the station?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Good cafes' is plural, so the correct opening is 'Are there any ...?'", hint: "What form matches plural places?" },
        { id: 13, instruction: "Complete the question.", text: "_____ teachers in the room yet?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Teachers' is plural, so the question starts with 'Are there any ...?'", hint: "Are you asking about one teacher or several?" },
        { id: 14, instruction: "Complete the question.", text: "_____ homework for tomorrow?", blanks: ["is there any"], acceptableAnswers: [["is there any"]], explanation: "'Homework' is uncountable, so the correct opening is 'Is there any ...?'", hint: "Does this noun use a/an or any?" },
        { id: 15, instruction: "Complete the question.", text: "_____ clean plates in the cupboard?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Clean plates' is plural, so the correct form is 'Are there any ...?'", hint: "Which question opening matches plural nouns?" },
        { id: 16, instruction: "Complete the question.", text: "_____ milk in the fridge?", blanks: ["is there any"], acceptableAnswers: [["is there any"]], explanation: "'Milk' is uncountable, so the question begins 'Is there any milk ...?'", hint: "What do we usually use with uncountable nouns in questions?" },
        { id: 17, instruction: "Complete the question.", text: "_____ parks for children near your home?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Parks' is plural, so the question needs 'Are there any ...?'", hint: "How many parks are possible in the answer?" },
        { id: 18, instruction: "Complete the question.", text: "_____ bus stop near your office?", blanks: ["is there a"], acceptableAnswers: [["is there a"]], explanation: "'Bus stop' is singular, so the correct question starts with 'Is there a ...?'", hint: "Do you need a singular or plural starter?" },
        { id: 19, instruction: "Complete the question.", text: "_____ problems with the printer again?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Problems' is plural, so the question needs 'Are there any ...?' rather than a singular starter.", hint: "Which opening matches plural nouns?" },
        { id: 20, instruction: "Complete the question.", text: "_____ eggs left in the box?", blanks: ["are there any"], acceptableAnswers: [["are there any"]], explanation: "'Eggs' is plural, so we ask 'Are there any eggs ...?'", hint: "How many eggs are possible here?" },
      ],
    },
  },
]

const SEED: GrammarExercise[] = [...VERB_TO_BE, ...VERB_TO_BE_MC, ...THERE_IS]

function read(): GrammarExercise[] {
  if (typeof window === "undefined") return SEED
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED
    const parsed = JSON.parse(raw) as GrammarExercise[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED
  } catch {
    return SEED
  }
}

function write(items: GrammarExercise[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

export function ensureGrammarSeed(): void {
  if (typeof window === "undefined") return
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) write(SEED)
}

export function listGrammarExercises(): GrammarExercise[] {
  return read()
}

export function getGrammarExercise(slug: string): GrammarExercise | undefined {
  return read().find((e) => e.slug === slug || e.id === slug)
}

export function saveGrammarExercise(exercise: GrammarExercise): void {
  const items = read()
  const idx = items.findIndex((e) => e.id === exercise.id || e.slug === exercise.slug)
  if (idx >= 0) items[idx] = exercise
  else items.push(exercise)
  write(items)
}

export function deleteGrammarExercise(slug: string): void {
  write(read().filter((e) => e.slug !== slug && e.id !== slug))
}

/**
 * Compare a user's input against accepted answers for one blank.
 * Case-insensitive, collapses whitespace, trims.
 */
export function isBlankCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const got = norm(input)
  return accepted.some((a) => norm(a) === got)
}
