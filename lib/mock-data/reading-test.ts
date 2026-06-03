import type { ReadingTest } from "../test-types"

export const mockReadingTest: ReadingTest = {
  testId: "reading-001",
  title: "IELTS Reading Test",
  totalTime: 60,
  parts: [
    {
      partNumber: 1,
      title: "Part 1",
      instruction: "Read the text and answer questions 1–13.",
      passageTitle: "The life and work of Marie Curie",
      questionInstruction:
        "Choose TRUE if the statement agrees with the information given in the text, choose FALSE if the statement contradicts the information, or choose NOT GIVEN if there is no information on this.",
      passage: `Marie Curie is probably the most famous woman scientist who has ever lived. Born Maria Sklodowska in Poland in 1867, she is famous for her work on radioactivity, and was twice a winner of the Nobel Prize. With her husband, Pierre Curie, and Henri Becquerel, she was awarded the 1903 Nobel Prize for Physics, and was then sole winner of the 1911 Nobel Prize for Chemistry. She was the first woman to win a Nobel Prize.

From childhood, Marie was remarkable for her prodigious memory, and at the age of 16 won a gold medal on completion of her secondary education. Because her father lost his savings through bad investment, she then had to take work as a teacher. From her earnings she was able to finance her sister Bronia's medical studies in Paris, on the understanding that Bronia would, in turn, later help her to get an education.

In 1891 this promise was fulfilled and Marie went to Paris and began to study at the Sorbonne (the University of Paris). She often worked far into the night and lived on little more than bread and butter and tea. She came first in the examination in the physical sciences in 1893, and in 1894 was placed second in the examination in mathematical sciences. It was not until the spring of that year that she was introduced to Pierre Curie.

Their marriage in 1895 marked the start of a partnership that was soon to achieve results of world significance. Following Henri Becquerel's discovery in 1896 of a new phenomenon, which Marie later called 'radioactivity', Marie Curie decided to find out if the radioactivity discovered in uranium was to be found in other elements. She discovered that this was true for thorium.

Turning her attention to minerals, she found her interest drawn to pitchblende, a mineral whose radioactivity, superior to that of pure uranium, could be explained only by the presence in the ore of small quantities of an unknown substance of very high activity. Pierre Curie joined her in the work that she had undertaken to resolve this problem, and that led to the discovery of the new elements, polonium and radium. While Pierre Curie devoted himself chiefly to the physical study of the new radiations, Marie Curie struggled to obtain pure radium in the metallic state. This was achieved in 1910.`,
      totalQuestions: 13,
      questions: [
        {
          id: 1,
          type: "true-false-not-given",
          question: "Marie Curie's husband was a joint winner of both Marie's Nobel Prizes.",
          correctAnswer: "FALSE",
        },
        {
          id: 2,
          type: "true-false-not-given",
          question: "Marie became interested in science when she was a child.",
          correctAnswer: "NOT GIVEN",
        },
        {
          id: 3,
          type: "true-false-not-given",
          question: "Marie was able to attend the Sorbonne because of her sister's financial contribution.",
          correctAnswer: "TRUE",
        },
        {
          id: 4,
          type: "true-false-not-given",
          question: "Marie stopped teaching when she went to Paris.",
          correctAnswer: "NOT GIVEN",
        },
        {
          id: 5,
          type: "true-false-not-given",
          question: "Marie had the best grades in her physics examination.",
          correctAnswer: "TRUE",
        },
        {
          id: 6,
          type: "true-false-not-given",
          question: "Marie and Pierre got married soon after they met.",
          correctAnswer: "NOT GIVEN",
        },
        {
          id: 7,
          type: "true-false-not-given",
          question: "Marie discovered radioactivity in uranium.",
          correctAnswer: "FALSE",
        },
        {
          id: 8,
          type: "true-false-not-given",
          question: "Marie found that thorium was radioactive.",
          correctAnswer: "TRUE",
        },
        {
          id: 9,
          type: "true-false-not-given",
          question: "Pitchblende was more radioactive than pure uranium.",
          correctAnswer: "TRUE",
        },
        {
          id: 10,
          type: "true-false-not-given",
          question: "Marie and Pierre discovered polonium and radium together.",
          correctAnswer: "TRUE",
        },
        {
          id: 11,
          type: "true-false-not-given",
          question: "Pierre focused on the chemical properties of radioactive elements.",
          correctAnswer: "FALSE",
        },
        {
          id: 12,
          type: "true-false-not-given",
          question: "Marie obtained pure radium in 1910.",
          correctAnswer: "TRUE",
        },
        {
          id: 13,
          type: "true-false-not-given",
          question: "Marie's work on radioactivity made her wealthy.",
          correctAnswer: "NOT GIVEN",
        },
      ],
    },
    {
      partNumber: 2,
      title: "Part 2",
      instruction: "Read the text and answer questions 14–26.",
      passageTitle: "Traffic Flow and Chaos Theory",
      questionInstruction: "Answer the questions below.",
      passage: `Physicists have long been interested in understanding the complex patterns of traffic flow. In the 1990s, researchers Boris Helbing and Stefan Kerner began applying principles from chaos theory to explain why traffic jams occur even when there are no obvious causes like accidents or road construction.

Their research revealed fascinating parallels between the behavior of gas molecules and traffic patterns. Just as gas molecules move randomly and collide with each other, vehicles on a highway interact in complex ways. However, unlike gas molecules, drivers can anticipate and react to the behavior of other drivers by adjusting their speed and maintaining safe distances.

Using computer simulations based on mathematical models more commonly used to illustrate the movement of molecules in a gas, the physicists demonstrated that traffic congestion can emerge spontaneously. Their investigations seemed to show that congestion can occur even when traffic is moving without problem and when its density is within approved levels for the road. Something as simple as a slight variation in how fast the cars are travelling or the distance separating them can lead to lengthy traffic flow problems.

The researchers found that small disturbances in traffic flow can amplify through a chain reaction. When one driver brakes slightly, the driver behind must brake a bit more, and this effect cascades backward through the traffic stream. This phenomenon, known as a "phantom traffic jam," can persist for hours even after the initial cause has disappeared.

Weather and temperature conditions can also significantly impact traffic behavior. Studies have shown that rain, snow, or extreme heat can alter driver behavior and vehicle performance, leading to changes in traffic flow patterns. Additionally, the time of day and seasonal variations affect traffic density and driver alertness, contributing to the complexity of traffic dynamics.`,
      totalQuestions: 13,
      questions: [
        {
          id: 14,
          type: "true-false-not-given",
          question: "Boris Helbing and Stefan Kerner were the first to study traffic patterns.",
          correctAnswer: "NOT GIVEN",
        },
        {
          id: 15,
          type: "true-false-not-given",
          question: "Chaos theory was applied to traffic flow in the 1990s.",
          correctAnswer: "TRUE",
        },
        {
          id: 16,
          type: "true-false-not-given",
          question: "Gas molecules and traffic behave identically.",
          correctAnswer: "FALSE",
        },
        {
          id: 17,
          type: "true-false-not-given",
          question: "Drivers can adjust their speed based on other drivers' behavior.",
          correctAnswer: "TRUE",
        },
        {
          id: 18,
          type: "multiple-select",
          question: "Which TWO options describe what the writer is doing in section two?",
          selectCount: 2,
          options: [
            "explaining Helbing and Kerner's attitude to chaos theory",
            "clarifying Helbing and Kerner's conclusions about traffic behaviour",
            "showing how weather and temperature can change traffic flow",
            "drawing parallels between the behaviour of gas molecules and traffic",
            "giving examples of different potential causes of congestion",
          ],
          correctAnswer: [
            "clarifying Helbing and Kerner's conclusions about traffic behaviour",
            "drawing parallels between the behaviour of gas molecules and traffic",
          ],
        },
        {
          id: 20,
          type: "true-false-not-given",
          question: "Computer simulations proved that traffic jams always have a specific cause.",
          correctAnswer: "FALSE",
        },
        {
          id: 21,
          type: "true-false-not-given",
          question: "Traffic congestion can occur even when density is within normal levels.",
          correctAnswer: "TRUE",
        },
        {
          id: 22,
          type: "true-false-not-given",
          question: "Small variations in speed can cause major traffic problems.",
          correctAnswer: "TRUE",
        },
        {
          id: 23,
          type: "true-false-not-given",
          question: "Phantom traffic jams disappear quickly once the initial cause is removed.",
          correctAnswer: "FALSE",
        },
        {
          id: 24,
          type: "summary-completion",
          question: "Complete the summary. Write ONE WORD ONLY from the text for each answer.",
          summaryText: `Using simulations based on [24] more commonly used to illustrate the movement of molecules in a gas, physicists showed that there are similarities between the ways gas molecules and traffic behave. They are not similar in all aspects – gas molecules randomly crash into one another but drivers prevent [25] from happening by altering their speed. The physicists' investigations seemed to show that congestion can occur even when traffic is moving without problem and when its [26] is within approved levels for the road. Something as simple as a slight variation in how fast the cars are travelling or the distance separating them can lead to lengthy traffic flow problems.`,
          blankIds: [24, 25, 26],
          correctAnswer: "models",
        },
        {
          id: 25,
          type: "fill-in-blank",
          question: "Blank 25",
          correctAnswer: "collisions",
        },
        {
          id: 26,
          type: "fill-in-blank",
          question: "Blank 26",
          correctAnswer: "density",
        },
      ],
    },
    {
      partNumber: 3,
      title: "Part 3",
      instruction: "Read the text and answer questions 27–40.",
      passageTitle: "Climate Change and Coral Reefs",
      questionInstruction:
        "Choose TRUE if the statement agrees with the information given in the text, choose FALSE if the statement contradicts the information, or choose NOT GIVEN if there is no information on this.",
      passage: `Coral reefs are among the most diverse and valuable ecosystems on Earth, supporting approximately 25% of all marine species despite covering less than 1% of the ocean floor. However, these vital ecosystems are under severe threat from climate change, with rising ocean temperatures causing widespread coral bleaching events.

Coral bleaching occurs when corals expel the symbiotic algae (zooxanthellae) that live in their tissues and provide them with food through photosynthesis. When water temperatures rise above normal levels for extended periods, corals become stressed and expel these algae, causing them to turn white or "bleach." While bleached corals are not dead, they are under severe stress and are more vulnerable to disease and death.

The frequency and severity of bleaching events have increased dramatically in recent decades. The Great Barrier Reef, the world's largest coral reef system, experienced unprecedented back-to-back bleaching events in 2016 and 2017, resulting in the death of approximately 50% of the reef's corals. Scientists warn that if current trends continue, most of the world's coral reefs could be lost by 2050.

Ocean acidification, another consequence of increased atmospheric carbon dioxide, poses an additional threat to coral reefs. As the ocean absorbs CO2 from the atmosphere, it becomes more acidic, making it harder for corals to build their calcium carbonate skeletons. This process weakens the structural integrity of reefs and reduces their ability to recover from bleaching events.

Despite these challenges, there is hope for coral reef conservation. Some coral species have shown remarkable resilience and ability to adapt to changing conditions. Scientists are working on various conservation strategies, including coral restoration projects, the development of heat-resistant coral strains, and the establishment of marine protected areas. However, experts agree that the most effective solution is to address the root cause of the problem by reducing greenhouse gas emissions and limiting global temperature rise.`,
      totalQuestions: 14,
      questions: [
        {
          id: 27,
          type: "true-false-not-given",
          question: "Coral reefs cover more than 1% of the ocean floor.",
          correctAnswer: "FALSE",
        },
        {
          id: 28,
          type: "true-false-not-given",
          question: "Coral reefs support a quarter of all marine species.",
          correctAnswer: "TRUE",
        },
        {
          id: 29,
          type: "true-false-not-given",
          question: "Coral bleaching is caused by pollution.",
          correctAnswer: "FALSE",
        },
        {
          id: 30,
          type: "true-false-not-given",
          question: "Zooxanthellae provide food to corals through photosynthesis.",
          correctAnswer: "TRUE",
        },
        {
          id: 31,
          type: "true-false-not-given",
          question: "Bleached corals always die within a few weeks.",
          correctAnswer: "FALSE",
        },
        {
          id: 32,
          type: "true-false-not-given",
          question: "The Great Barrier Reef experienced bleaching in consecutive years.",
          correctAnswer: "TRUE",
        },
        {
          id: 33,
          type: "true-false-not-given",
          question: "Half of the Great Barrier Reef's corals died between 2016 and 2017.",
          correctAnswer: "TRUE",
        },
        {
          id: 34,
          type: "true-false-not-given",
          question: "All coral reefs will be extinct by 2050.",
          correctAnswer: "FALSE",
        },
        {
          id: 35,
          type: "true-false-not-given",
          question: "Ocean acidification is caused by increased CO2 in the atmosphere.",
          correctAnswer: "TRUE",
        },
        {
          id: 36,
          type: "true-false-not-given",
          question: "Acidic water makes it easier for corals to build their skeletons.",
          correctAnswer: "FALSE",
        },
        {
          id: 37,
          type: "true-false-not-given",
          question: "Some coral species can adapt to changing ocean conditions.",
          correctAnswer: "TRUE",
        },
        {
          id: 38,
          type: "true-false-not-given",
          question: "Scientists have successfully created heat-resistant coral strains.",
          correctAnswer: "NOT GIVEN",
        },
        {
          id: 39,
          type: "true-false-not-given",
          question: "Marine protected areas can help conserve coral reefs.",
          correctAnswer: "TRUE",
        },
        {
          id: 40,
          type: "true-false-not-given",
          question: "Reducing greenhouse gas emissions is the most effective solution.",
          correctAnswer: "TRUE",
        },
      ],
    },
  ],
}
