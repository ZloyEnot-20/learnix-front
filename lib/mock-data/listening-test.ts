import type { ListeningTest } from "../test-types"

export const mockListeningTest: ListeningTest = {
  testId: "listening-001",
  title: "IELTS Listening Test",
  totalTime: 30,
  parts: [
    {
      partNumber: 1,
      title: "Part 1",
      instruction: "Listen and answer questions 1–7.",
      audioUrl: "/audio/listening-part1.mp3",
      content: `Questions 1–7

Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.

Phone call about second-hand furniture

Items

Dining table
• [1] shape
• medium size
• [2] old
• £25.00

Dining chairs
• set of [3] chairs
• seats covered in [4] material
• in [5] condition
• £20.00

Desk
• length: [6]
• 3 drawers. Top drawer has a [7]
• £50.00`,
      questions: [
        { id: 1, type: "fill-in-blank", label: "1", correctAnswer: "rectangular" },
        { id: 2, type: "fill-in-blank", label: "2", correctAnswer: "50" },
        { id: 3, type: "fill-in-blank", label: "3", correctAnswer: "4" },
        { id: 4, type: "fill-in-blank", label: "4", correctAnswer: "leather" },
        { id: 5, type: "fill-in-blank", label: "5", correctAnswer: "good" },
        { id: 6, type: "fill-in-blank", label: "6", correctAnswer: "120cm" },
        { id: 7, type: "fill-in-blank", label: "7", correctAnswer: "lock" },
      ],
    },
    {
      partNumber: 2,
      title: "Part 2",
      instruction: "Listen and answer questions 8–17.",
      audioUrl: "/audio/listening-part2.mp3",
      content: `Questions 8–17

Complete the sentences. Write NO MORE THAN TWO WORDS for each answer.

Community Center Information

8. The community center is located on __________ Street.
9. The center opens at __________ every morning.
10. The swimming pool is available for __________ only.
11. Yoga classes are held in the __________ room.
12. Members can borrow __________ from the library.
13. The café serves __________ and snacks.
14. Parking is available in the __________ area.
15. The annual membership fee is __________ pounds.
16. Children under __________ can use facilities for free.
17. The center closes at __________ on weekends.`,
      questions: [
        { id: 8, type: "fill-in-blank", label: "8", correctAnswer: "Main" },
        { id: 9, type: "fill-in-blank", label: "9", correctAnswer: "7am" },
        { id: 10, type: "fill-in-blank", label: "10", correctAnswer: "adults" },
        { id: 11, type: "fill-in-blank", label: "11", correctAnswer: "fitness" },
        { id: 12, type: "fill-in-blank", label: "12", correctAnswer: "books" },
        { id: 13, type: "fill-in-blank", label: "13", correctAnswer: "coffee" },
        { id: 14, type: "fill-in-blank", label: "14", correctAnswer: "underground" },
        { id: 15, type: "fill-in-blank", label: "15", correctAnswer: "150" },
        { id: 16, type: "fill-in-blank", label: "16", correctAnswer: "12" },
        { id: 17, type: "fill-in-blank", label: "17", correctAnswer: "10pm" },
      ],
    },
    {
      partNumber: 3,
      title: "Part 3",
      instruction: "Listen and answer questions 18–27.",
      audioUrl: "/audio/listening-part3.mp3",
      content: `Questions 18–27

Choose the correct letter, A, B, or C.

Discussion about University Project

18. What is the main topic of their project?
A. Climate change
B. Renewable energy
C. Water conservation

19. When is the project deadline?
A. Next Monday
B. Next Friday
C. Next month

20. Who will present the findings?
A. Sarah only
B. Both students
C. The professor

21. What research method will they use?
A. Surveys
B. Interviews
C. Both A and B

22. Where will they conduct their research?
A. Library
B. Campus
C. City center

23. How many participants do they need?
A. 50
B. 100
C. 150

24. What is their main challenge?
A. Time management
B. Finding participants
C. Data analysis

25. Who suggested the topic?
A. Sarah
B. The professor
C. John

26. What will they do next week?
A. Collect data
B. Write the report
C. Practice presentation

27. How will they share the workload?
A. Equally
B. Based on skills
C. Not decided yet`,
      questions: [
        { id: 18, type: "multiple-choice", label: "18", correctAnswer: "B" },
        { id: 19, type: "multiple-choice", label: "19", correctAnswer: "B" },
        { id: 20, type: "multiple-choice", label: "20", correctAnswer: "B" },
        { id: 21, type: "multiple-choice", label: "21", correctAnswer: "C" },
        { id: 22, type: "multiple-choice", label: "22", correctAnswer: "C" },
        { id: 23, type: "multiple-choice", label: "23", correctAnswer: "B" },
        { id: 24, type: "multiple-choice", label: "24", correctAnswer: "A" },
        { id: 25, type: "multiple-choice", label: "25", correctAnswer: "B" },
        { id: 26, type: "multiple-choice", label: "26", correctAnswer: "A" },
        { id: 27, type: "multiple-choice", label: "27", correctAnswer: "B" },
      ],
    },
    {
      partNumber: 4,
      title: "Part 4",
      instruction: "Listen and answer questions 28–40.",
      audioUrl: "/audio/listening-part4.mp3",
      content: `Questions 28–40

Complete the notes. Write NO MORE THAN THREE WORDS for each answer.

Lecture on Ancient Civilizations

The Mayan Civilization

Location and Time Period
28. The Mayans lived in __________ America.
29. Their civilization flourished between __________ and 900 AD.

Achievements
30. They developed an advanced __________ system.
31. Their calendar was extremely __________.
32. They built impressive __________ structures.

Society and Culture
33. The society was divided into __________ classes.
34. Religion played a __________ role in daily life.
35. They practiced __________ agriculture.

Decline
36. The civilization began to decline around __________ AD.
37. Possible causes include __________ and warfare.
38. Many cities were __________ by the jungle.

Legacy
39. Their __________ influenced later cultures.
40. Modern descendants still speak __________ languages.`,
      questions: [
        { id: 28, type: "fill-in-blank", label: "28", correctAnswer: "Central" },
        { id: 29, type: "fill-in-blank", label: "29", correctAnswer: "250" },
        { id: 30, type: "fill-in-blank", label: "30", correctAnswer: "writing" },
        { id: 31, type: "fill-in-blank", label: "31", correctAnswer: "accurate" },
        { id: 32, type: "fill-in-blank", label: "32", correctAnswer: "stone" },
        { id: 33, type: "fill-in-blank", label: "33", correctAnswer: "social" },
        { id: 34, type: "fill-in-blank", label: "34", correctAnswer: "central" },
        { id: 35, type: "fill-in-blank", label: "35", correctAnswer: "intensive" },
        { id: 36, type: "fill-in-blank", label: "36", correctAnswer: "900" },
        { id: 37, type: "fill-in-blank", label: "37", correctAnswer: "drought" },
        { id: 38, type: "fill-in-blank", label: "38", correctAnswer: "reclaimed" },
        { id: 39, type: "fill-in-blank", label: "39", correctAnswer: "achievements" },
        { id: 40, type: "fill-in-blank", label: "40", correctAnswer: "Mayan" },
      ],
    },
  ],
}
