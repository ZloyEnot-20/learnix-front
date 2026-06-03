import type { WritingTest } from "../test-types"

export const mockWritingTest: WritingTest = {
  testId: "writing-001",
  title: "IELTS Academic Writing",
  totalTime: 60,
  tasks: [
    {
      taskNumber: 1,
      title: "Academic Writing Part 1",
      instruction: "You should spend about 20 minutes on this task. Write at least 150 words.",
      description:
        "The chart below shows the number of trips made by children in one country in 1990 and 2010 to travel to and from school using different modes of transport.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      imageUrl:
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D0%A1%D0%BD%D0%B8%D0%BC%D0%BE%D0%BA%20%D1%8D%D0%BA%D1%80%D0%B0%D0%BD%D0%B0%202025-10-07%20%D0%B2%2021.43.15-OhxMpsnSlAqQKupv0l4HrhGKg07Xql.png",
      minWords: 150,
      suggestedTime: 20,
    },
    {
      taskNumber: 2,
      title: "Academic Writing Part 2",
      instruction: "You should spend about 40 minutes on this task. Write at least 250 words.",
      description:
        "Some people believe that unpaid community service should be a compulsory part of high school programmes (for example working for a charity, improving the neighbourhood or teaching sports to younger children).\n\nTo what extent do you agree or disagree?",
      minWords: 250,
      suggestedTime: 40,
    },
  ],
}
