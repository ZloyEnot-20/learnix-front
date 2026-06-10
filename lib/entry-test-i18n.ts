export type EntryTestLang = "uz" | "ru"

export const ENTRY_TEST_LANGS: { value: EntryTestLang; label: string; short: string }[] = [
  { value: "uz", label: "O'zbekcha", short: "UZ" },
  { value: "ru", label: "Русский", short: "RU" },
]

const messages = {
  pageTitle: {
    uz: "Kirish testi",
    ru: "Entry Test",
  },
  startDescription: {
    uz: "Testni boshlash yoki natijalarni ko'rish uchun o'qituvchi bergan telefon raqamingizni kiriting.",
    ru: "Введите номер телефона, который указал преподаватель, чтобы начать тест или посмотреть результаты.",
  },
  phoneLabel: {
    uz: "Telefon raqami",
    ru: "Номер телефона",
  },
  continue: {
    uz: "Davom etish",
    ru: "Продолжить",
  },
  invalidPhone: {
    uz: "To'g'ri O'zbekiston raqamini kiriting: +998 XX XXX XX XX",
    ru: "Введите корректный номер Узбекистана: +998 XX XXX XX XX",
  },
  testNotFound: {
    uz: "Bu raqam uchun test topilmadi. O'qituvchingizga murojaat qiling.",
    ru: "Тест для этого номера не найден. Обратитесь к преподавателю.",
  },
  candidate: {
    uz: "Nomzod",
    ru: "Кандидат",
  },
  otherPhone: {
    uz: "Boshqa raqam",
    ru: "Другой номер",
  },
  headerTitle: {
    uz: "Kirish / daraja testi",
    ru: "Entry / Placement Test",
  },
  headerSubtitle: {
    uz: "Ingliz tili darajangizni aniqlang",
    ru: "Определите свой уровень английского",
  },
  back: {
    uz: "Orqaga",
    ru: "Назад",
  },
  dashboard: {
    uz: "Asosiy sahifa",
    ru: "Главная",
  },
  threeSections: {
    uz: "Uch bo'lim",
    ru: "Три секции",
  },
  overviewDesc: {
    uz: "Darajangizni aniqlash uchun har bir bo'limni bajarishingiz kerak. Istalgan vaqtda to'xtatib, keyin davom ettirishingiz mumkin — jarayon avtomatik saqlanadi.",
    ru: "Пройдите каждую секцию, чтобы определить уровень. Можно остановиться и продолжить позже — прогресс сохраняется автоматически.",
  },
  allSubmitted: {
    uz: "Barcha bo'limlar yuborildi. O'qituvchingiz writing bo'limini tekshiradi va darajangizni tasdiqlaydi.",
    ru: "Все секции отправлены. Преподаватель проверит writing и подтвердит ваш уровень.",
  },
  grammarTitle: {
    uz: "Grammatika — ko'p tanlovli",
    ru: "Грамматика — множественный выбор",
  },
  questionsAutoScored: {
    uz: "{count} ta savol · avtomatik baholanadi",
    ru: "{count} вопросов · автоматическая оценка",
  },
  readingTitle: {
    uz: "O'qish",
    ru: "Чтение",
  },
  writingTitle: {
    uz: "Yozish",
    ru: "Письмо",
  },
  gradedByTeacher: {
    uz: "O'qituvchi baholaydi",
    ru: "Оценивает преподаватель",
  },
  completed: {
    uz: "Bajarildi",
    ru: "Завершено",
  },
  notStarted: {
    uz: "Boshlanmadi",
    ru: "Не начато",
  },
  answered: {
    uz: "{count}/{total} javob berildi",
    ru: "{count}/{total} ответов",
  },
  start: {
    uz: "Boshlash",
    ru: "Начать",
  },
  continueAction: {
    uz: "Davom etish",
    ru: "Продолжить",
  },
  done: {
    uz: "Tayyor",
    ru: "Готово",
  },
  view: {
    uz: "Ko'rish",
    ru: "Открыть",
  },
  submittedAwaiting: {
    uz: "Yuborildi — tekshirilmoqda",
    ru: "Отправлено — ожидает проверки",
  },
  draftSaved: {
    uz: "Qoralama saqlandi",
    ru: "Черновик сохранён",
  },
  reviewedLevel: {
    uz: "Tekshirildi · {level}",
    ru: "Проверено · {level}",
  },
  scoreLevel: {
    uz: "{score}/{total} · {level}",
    ru: "{score}/{total} · {level}",
  },
  resultsReady: {
    uz: "Natijalaringiz tayyor",
    ru: "Ваши результаты готовы",
  },
  teacherAssessed: {
    uz: "O'qituvchingiz darajangizni baholadi.",
    ru: "Преподаватель оценил ваш уровень.",
  },
  overallLevel: {
    uz: "Umumiy darajangiz",
    ru: "Ваш общий уровень",
  },
  finalPlacement: {
    uz: "O'qituvchi belgilagan yakuniy daraja",
    ru: "Итоговый уровень, установленный преподавателем",
  },
  grammarMc: {
    uz: "Grammatika (MC)",
    ru: "Грамматика (MC)",
  },
  correctCount: {
    uz: "{score}/{total} to'g'ri",
    ru: "{score}/{total} правильно",
  },
  gradedByTeacherShort: {
    uz: "O'qituvchi baholadi",
    ru: "Оценено преподавателем",
  },
  teacherComment: {
    uz: "O'qituvchi izohi",
    ru: "Комментарий преподавателя",
  },
  questionOf: {
    uz: "Savol {current} / {total}",
    ru: "Вопрос {current} из {total}",
  },
  backToSections: {
    uz: "Bo'limlarga qaytish",
    ru: "К секциям",
  },
  readTheText: {
    uz: "Matnni o'qing",
    ru: "Прочитайте текст",
  },
  true: {
    uz: "To'g'ri",
    ru: "Верно",
  },
  false: {
    uz: "Noto'g'ri",
    ru: "Неверно",
  },
  submitReading: {
    uz: "O'qish bo'limini yuborish ({count}/{total})",
    ru: "Отправить чтение ({count}/{total})",
  },
  writingTaskLabel: {
    uz: "Topshiriq (ingliz tilida yozing)",
    ru: "Задание (пишите на английском)",
  },
  minWordsHint: {
    uz: "Kamida {min} ta so'z yozing · ~{minutes} daqiqa",
    ru: "Напишите минимум {min} слов · ~{minutes} мин",
  },
  reviewedByTeacher: {
    uz: "O'qituvchi tekshirdi · {level}",
    ru: "Проверено преподавателем · {level}",
  },
  writePlaceholder: {
    uz: "Javobingizni bu yerda yozing…",
    ru: "Напишите ответ здесь…",
  },
  wordCount: {
    uz: "{count} ta so'z",
    ru: "{count} слов",
  },
  submittedAwaitingReview: {
    uz: "Yuborildi — o'qituvchi tekshiradi",
    ru: "Отправлено — ожидает проверки преподавателем",
  },
  submitWriting: {
    uz: "Yozish bo'limini yuborish",
    ru: "Отправить письмо",
  },
  autofill: {
    uz: "To'ldirish",
    ru: "Заполнить",
  },
  autofillAll: {
    uz: "Barcha bo'limlarni to'ldirish",
    ru: "Заполнить все секции",
  },
  demo: {
    uz: "Demo",
    ru: "Демо",
  },
  prev: {
    uz: "Oldingi",
    ru: "Назад",
  },
  next: {
    uz: "Keyingi",
    ru: "Далее",
  },
  submitSection: {
    uz: "Bo'limni yuborish",
    ru: "Отправить секцию",
  },
  noTestAssigned: {
    uz: "Kirish testi tayinlanmagan",
    ru: "Entry test не назначен",
  },
  noTestAssignedDesc: {
    uz: "O'qituvchingiz hali daraja testini tayinlamagan.",
    ru: "Преподаватель ещё не назначил вам placement test.",
  },
  langToggleLabel: {
    uz: "Til",
    ru: "Язык",
  },
} as const

export type EntryTestMessageKey = keyof typeof messages

export function entryTestT(
  lang: EntryTestLang,
  key: EntryTestMessageKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = messages[key][lang]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}
