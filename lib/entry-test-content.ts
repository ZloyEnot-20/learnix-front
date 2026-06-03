/**
 * Static content + scoring for the placement / entry test.
 * Three sections: multiple-choice grammar (50 q), reading (10 q), writing (1 task).
 */

export interface EntryMCQuestion {
  id: number
  text: string
  options: string[]
  correctAnswer: string
}

export interface EntryReadingQuestion {
  id: number
  type: "multiple-choice" | "true-false"
  question: string
  options?: string[]
  /** index into options (multiple-choice) or boolean (true-false). */
  correctAnswer: number | boolean
}

export const ENTRY_MC_QUESTIONS: EntryMCQuestion[] = [
  { id: 1, text: "Tom is from Spain. He ___ in Madrid and works in a small office near his home.", options: ["live", "lives", "living", "lived"], correctAnswer: "lives" },
  { id: 2, text: "I usually drink coffee in the morning, but today I ___ tea because I feel sick.", options: ["drink", "am drinking", "drank", "have drunk"], correctAnswer: "am drinking" },
  { id: 3, text: "Sarah ___ to school every day. Yesterday, she ___ late because she missed the bus.", options: ["go / is", "goes / was", "go / was", "goes / is"], correctAnswer: "goes / was" },
  { id: 4, text: "We ___ TV when suddenly the lights went out. We couldn’t see anything.", options: ["watch", "were watching", "watched", "have watched"], correctAnswer: "were watching" },
  { id: 5, text: "I can’t find my keys anywhere. I think I ___ them at home.", options: ["leave", "left", "have left", "had left"], correctAnswer: "have left" },
  { id: 6, text: "She ___ her homework already, so now she is relaxing and watching TV.", options: ["finishes", "finished", "has finished", "had finished"], correctAnswer: "has finished" },
  { id: 7, text: "If it ___ tomorrow, we will stay at home and watch films together.", options: ["rain", "rains", "rained", "will rain"], correctAnswer: "rains" },
  { id: 8, text: "If I ___ more free time, I would learn another language and travel more.", options: ["have", "had", "will have", "would have"], correctAnswer: "had" },
  { id: 9, text: "This is the restaurant ___ we had dinner last night. The food was amazing.", options: ["which", "where", "who", "what"], correctAnswer: "where" },
  { id: 10, text: "The man ___ helped me yesterday was very kind and gave me useful advice.", options: ["which", "who", "where", "what"], correctAnswer: "who" },
  { id: 11, text: "I have lived in this city ___ 2015, and I really enjoy living here.", options: ["for", "since", "during", "from"], correctAnswer: "since" },
  { id: 12, text: "He has been working here ___ five years. He started in 2019.", options: ["since", "for", "from", "during"], correctAnswer: "for" },
  { id: 13, text: "When I arrived at the party, most of the guests ___ already left, so it was quiet.", options: ["have", "had", "were", "are"], correctAnswer: "had" },
  { id: 14, text: "She was very tired because she ___ all day before the important exam.", options: ["studied", "had studied", "has studied", "was studying"], correctAnswer: "had studied" },
  { id: 15, text: "The project ___ by the team last week. It took them several months to complete it.", options: ["completed", "was completed", "is completed", "has completed"], correctAnswer: "was completed" },
  { id: 16, text: "A new bridge ___ in our city at the moment, so traffic is much worse than usual.", options: ["builds", "is building", "is being built", "was built"], correctAnswer: "is being built" },
  { id: 17, text: "You ___ wear a seatbelt while driving. It’s required by law in this country.", options: ["must", "can", "may", "should"], correctAnswer: "must" },
  { id: 18, text: "You ___ smoke here. It’s not allowed inside this building.", options: ["don’t have to", "mustn’t", "can", "should"], correctAnswer: "mustn’t" },
  { id: 19, text: "I enjoy ___ books in my free time, especially science fiction novels.", options: ["read", "to read", "reading", "reads"], correctAnswer: "reading" },
  { id: 20, text: "She decided ___ abroad after finishing university to gain new experience.", options: ["go", "to go", "going", "went"], correctAnswer: "to go" },
  { id: 21, text: "He speaks English much ___ than before because he practices every day with native speakers.", options: ["good", "better", "best", "well"], correctAnswer: "better" },
  { id: 22, text: "This is the ___ movie I have ever seen. I would definitely watch it again.", options: ["more interesting", "most interesting", "interesting", "interest"], correctAnswer: "most interesting" },
  { id: 23, text: "She told me she ___ tired and needed some rest after the long journey.", options: ["is", "was", "were", "has been"], correctAnswer: "was" },
  { id: 24, text: "He said that he ___ call me later that evening, but he never did.", options: ["will", "would", "calls", "is going to"], correctAnswer: "would" },
  { id: 25, text: "If I ___ you, I would take that job. It offers great opportunities for growth.", options: ["am", "was", "were", "would be"], correctAnswer: "were" },
  { id: 26, text: "If she had studied harder, she ___ the exam easily and wouldn’t be worried now.", options: ["would pass", "would have passed", "passed", "had passed"], correctAnswer: "would have passed" },
  { id: 27, text: "I wish I ___ more time to travel, but my schedule is always too busy.", options: ["have", "had", "would have", "will have"], correctAnswer: "had" },
  { id: 28, text: "He talks as if he ___ everything about the topic, but in reality he doesn’t.", options: ["knows", "knew", "know", "has known"], correctAnswer: "knew" },
  { id: 29, text: "She has been working here for years, so she is used to ___ long hours every day.", options: ["work", "working", "worked", "to work"], correctAnswer: "working" },
  { id: 30, text: "I’m not used to ___ up early, so I often feel tired in the mornings.", options: ["get", "getting", "got", "to get"], correctAnswer: "getting" },
  { id: 31, text: "Hardly ___ the meeting started when the fire alarm suddenly went off.", options: ["did", "had", "has", "was"], correctAnswer: "had" },
  { id: 32, text: "No sooner ___ home than it started to rain heavily outside.", options: ["I arrived", "had I arrived", "did I arrive", "I had arrived"], correctAnswer: "had I arrived" },
  { id: 33, text: "Not only ___ late, but he also forgot to bring the documents we needed.", options: ["he was", "was he", "he is", "did he"], correctAnswer: "was he" },
  { id: 34, text: "Rarely ___ such a beautiful place during my travels around the world.", options: ["I see", "have I seen", "I saw", "did I see"], correctAnswer: "have I seen" },
  { id: 35, text: "The more you practice speaking, the ___ your English becomes over time.", options: ["good", "better", "best", "well"], correctAnswer: "better" },
  { id: 36, text: "He denied ___ the money, even though there was strong evidence against him.", options: ["to take", "taking", "take", "took"], correctAnswer: "taking" },
  { id: 37, text: "I regret ___ that I cannot attend the meeting tomorrow due to personal reasons.", options: ["say", "saying", "to say", "said"], correctAnswer: "to say" },
  { id: 38, text: "She stopped ___ when she saw her old friend walking towards her on the street.", options: ["to walk", "walking", "walk", "to walking"], correctAnswer: "walking" },
  { id: 39, text: "This is the first time I ___ such a difficult and complex problem in my work.", options: ["solve", "have solved", "solved", "am solving"], correctAnswer: "have solved" },
  { id: 40, text: "By the time we arrived at the cinema, the film ___ already started.", options: ["has", "had", "was", "is"], correctAnswer: "had" },
  { id: 41, text: "He is unlikely ___ the offer because he already has another better opportunity.", options: ["accept", "to accept", "accepting", "accepted"], correctAnswer: "to accept" },
  { id: 42, text: "It’s important that she ___ present at the meeting tomorrow morning.", options: ["is", "be", "was", "will be"], correctAnswer: "be" },
  { id: 43, text: "I would rather you ___ me the truth instead of hiding important information.", options: ["tell", "told", "to tell", "telling"], correctAnswer: "told" },
  { id: 44, text: "It’s high time we ___ something about this serious problem before it gets worse.", options: ["do", "did", "done", "doing"], correctAnswer: "did" },
  { id: 45, text: "Despite ___ very tired after work, she continued studying for her exams late at night.", options: ["be", "being", "was", "to be"], correctAnswer: "being" },
  { id: 46, text: "He succeeded ___ passing the exam after months of hard preparation and practice.", options: ["in", "on", "at", "for"], correctAnswer: "in" },
  { id: 47, text: "The book, ___ was published last year, became an instant bestseller worldwide.", options: ["that", "which", "who", "what"], correctAnswer: "which" },
  { id: 48, text: "She explained the problem very clearly, ___ helped everyone understand it better.", options: ["that", "which", "what", "who"], correctAnswer: "which" },
  { id: 49, text: "If he ___ earlier, he wouldn’t have missed the train and arrived late.", options: ["left", "had left", "would leave", "leaves"], correctAnswer: "had left" },
  { id: 50, text: "Had I known about the problem earlier, I ___ something to help solve it.", options: ["would do", "would have done", "did", "will do"], correctAnswer: "would have done" },
]

export const ENTRY_READING_TEXT =
  "In recent years, remote work has become increasingly popular around the world. Many companies have discovered that employees can be just as productive working from home as they are in the office. This shift began slowly, but it accelerated dramatically during global events such as the COVID-19 pandemic.\n\nOne of the main advantages of remote work is flexibility. Employees can organize their schedules more effectively, often leading to a better work-life balance. For example, they can avoid long commutes and spend more time with their families. In addition, companies can hire talent from different countries, giving them access to a wider range of skills and perspectives.\n\nHowever, remote work also has its challenges. Some workers report feeling isolated or disconnected from their colleagues. Communication can become more difficult, especially when team members are in different time zones. As a result, companies have had to invest in new technologies and tools to keep their teams connected.\n\nAnother concern is productivity. While some employees thrive in a home environment, others struggle to stay focused without direct supervision. Distractions at home, such as household responsibilities or family members, can reduce efficiency. To address this issue, many organizations provide training on time management and self-discipline.\n\nLooking ahead, experts believe that hybrid work models will become more common. In this approach, employees divide their time between working remotely and working in an office. This allows them to benefit from flexibility while still maintaining social connections with colleagues.\n\nOverall, remote work is changing the way people think about their careers. While it offers many benefits, it also requires new skills and adjustments. The future of work will likely depend on how well both employees and employers adapt to these changes."

export const ENTRY_READING_QUESTIONS: EntryReadingQuestion[] = [
  { id: 1, type: "multiple-choice", question: "What is the main topic of the text?", options: ["The history of office work", "The growth of remote work", "The importance of technology", "The problems of modern companies"], correctAnswer: 1 },
  { id: 2, type: "multiple-choice", question: "Why did remote work increase rapidly?", options: ["Because of new laws", "Because of global events like COVID-19", "Because people prefer offices", "Because companies reduced salaries"], correctAnswer: 1 },
  { id: 3, type: "multiple-choice", question: "What is one benefit of remote work mentioned?", options: ["Higher salaries", "Better communication", "More flexibility", "Less responsibility"], correctAnswer: 2 },
  { id: 4, type: "multiple-choice", question: "What problem do some remote workers experience?", options: ["Too much travel", "Isolation", "Lack of skills", "Too many meetings"], correctAnswer: 1 },
  { id: 5, type: "true-false", question: "All employees are more productive at home.", correctAnswer: false },
  { id: 6, type: "true-false", question: "Companies can hire people from other countries.", correctAnswer: true },
  { id: 7, type: "multiple-choice", question: "What is a hybrid work model?", options: ["Working only from home", "Working only in the office", "Mix of remote and office work", "Working at night"], correctAnswer: 2 },
  { id: 8, type: "multiple-choice", question: "What do companies use to improve communication?", options: ["More managers", "New technologies", "Shorter work hours", "Less teamwork"], correctAnswer: 1 },
  { id: 9, type: "multiple-choice", question: "What can reduce productivity at home?", options: ["Quiet environment", "Flexible schedule", "Distractions", "Technology"], correctAnswer: 2 },
  { id: 10, type: "multiple-choice", question: "What is the future of work likely to depend on?", options: ["Office size", "Employee adaptation", "Government rules", "Salary levels"], correctAnswer: 1 },
]

export const ENTRY_WRITING_PROMPT = {
  title: "Writing Task",
  prompt:
    "Write about your typical day. Describe your daily routine: when you wake up, what you do in the morning, afternoon and evening, and what you like to do in your free time.",
  minWords: 80,
  estimatedMinutes: 20,
}

export const ENTRY_MC_TOTAL = ENTRY_MC_QUESTIONS.length // 50
export const ENTRY_READING_TOTAL = ENTRY_READING_QUESTIONS.length // 10

/** CEFR levels used across the entry test (lowest → highest). */
export const CEFR_LEVELS = [
  "Beginner (A1)",
  "Elementary (A2)",
  "Pre-Intermediate (B1)",
  "Intermediate (B1+)",
  "Upper-Intermediate (B2)",
  "Strong B2 / B2+",
] as const

export const MC_CRITERIA: { range: string; level: string }[] = [
  { range: "0–15", level: "Beginner (A1)" },
  { range: "16–25", level: "Elementary (A2)" },
  { range: "26–35", level: "Pre-Intermediate (B1)" },
  { range: "36–43", level: "Intermediate (B1+)" },
  { range: "44–47", level: "Upper-Intermediate (B2)" },
  { range: "48–50", level: "Strong B2 / B2+" },
]

export const READING_CRITERIA: { range: string; level: string }[] = [
  { range: "0–3", level: "Beginner (A1)" },
  { range: "4–5", level: "Elementary (A2)" },
  { range: "6–7", level: "Pre-Intermediate (B1)" },
  { range: "8–9", level: "Intermediate (B1+)" },
  { range: "10", level: "Upper-Intermediate (B2)" },
]

/** Map a multiple-choice score (0–50) to a CEFR level. */
export function mcLevel(score: number): string {
  if (score <= 15) return "Beginner (A1)"
  if (score <= 25) return "Elementary (A2)"
  if (score <= 35) return "Pre-Intermediate (B1)"
  if (score <= 43) return "Intermediate (B1+)"
  if (score <= 47) return "Upper-Intermediate (B2)"
  return "Strong B2 / B2+"
}

/** Map a reading score (0–10) to a CEFR level. */
export function readingLevel(score: number): string {
  if (score <= 3) return "Beginner (A1)"
  if (score <= 5) return "Elementary (A2)"
  if (score <= 7) return "Pre-Intermediate (B1)"
  if (score <= 9) return "Intermediate (B1+)"
  return "Upper-Intermediate (B2)"
}

/** Pick a random item from an array. */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Demo: random MC answers keyed by question id. */
export function buildDemoMCAnswers(): Record<number, string> {
  return Object.fromEntries(
    ENTRY_MC_QUESTIONS.map((q) => [q.id, pickRandom(q.options)]),
  )
}

/** Demo: random reading answers keyed by question id. */
export function buildDemoReadingAnswers(): Record<number, number | boolean> {
  return Object.fromEntries(
    ENTRY_READING_QUESTIONS.map((q) => {
      if (q.type === "true-false") {
        return [q.id, Math.random() < 0.5]
      }
      return [q.id, Math.floor(Math.random() * (q.options?.length ?? 4))]
    }),
  )
}

/** Demo writing sample (≥ minWords). */
export const DEMO_WRITING_TEXT = `I usually wake up at seven o'clock in the morning. First, I take a shower and have breakfast. I often eat toast with cheese and drink a cup of tea. After breakfast, I get dressed and leave home at half past eight.

In the morning I work or study. I have lunch at one o'clock. In the afternoon I continue my tasks and sometimes meet friends for coffee. In the evening I cook dinner, watch a series or read a book, and go to bed around eleven.

At the weekend I like to walk in the park, listen to music, and spend time with my family. I also enjoy learning English because it helps me travel and meet new people.`
