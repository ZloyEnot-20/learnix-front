/**
 * Printable / downloadable materials per grammar topic.
 * `image` is a public-served path (anything inside `/public`).
 */
export interface GrammarMaterial {
  id: string
  title: string
  subtitle?: string
  image: string
  /** Tailwind background tint for the preview frame. */
  tint: string
  /** Tailwind classes for the download button. */
  downloadButtonClass: string
  /** Filename to suggest when the user downloads the file. */
  downloadFilename: string
}

export const TOPIC_MATERIALS: Record<string, GrammarMaterial[]> = {
  "verb-to-be": [
    {
      id: "verb-to-be-present",
      title: "Present Tense: Am, Is, Are",
      subtitle: "Printable chart",
      image: "/materials/verb-to-be-present.png",
      tint: "bg-blue-50",
      downloadButtonClass: "bg-blue-600 hover:bg-blue-700",
      downloadFilename: "verb-to-be-present.png",
    },
    {
      id: "verb-to-be-past",
      title: "Past Tense: Was, Were",
      subtitle: "Printable chart",
      image: "/materials/verb-to-be-past.png",
      tint: "bg-emerald-50",
      downloadButtonClass: "bg-emerald-600 hover:bg-emerald-700",
      downloadFilename: "verb-to-be-past.png",
    },
  ],
  "there-is-there-are": [
    {
      id: "there-is-there-are-forms",
      title: "Core Forms and Quick Rules",
      subtitle: "Printable chart",
      image: "/materials/there-is-there-are-forms.png",
      tint: "bg-blue-50",
      downloadButtonClass: "bg-blue-600 hover:bg-blue-700",
      downloadFilename: "there-is-there-are-forms.png",
    },
    {
      id: "there-is-there-are-mistakes",
      title: "Common Mistakes",
      subtitle: "Printable chart",
      image: "/materials/there-is-there-are-mistakes.png",
      tint: "bg-rose-50",
      downloadButtonClass: "bg-rose-600 hover:bg-rose-700",
      downloadFilename: "there-is-there-are-mistakes.png",
    },
  ],
}

export function getMaterialsForTopic(topic: string): GrammarMaterial[] {
  return TOPIC_MATERIALS[topic] ?? []
}
