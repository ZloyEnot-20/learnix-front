/**
 * Client for the standalone Python OCR microservice (see /ocr-service).
 *
 * The base URL comes from NEXT_PUBLIC_OCR_URL (defaults to localhost:8000).
 * Uploads are sent as multipart/form-data; nothing is persisted client-side.
 */
const OCR_URL =
  process.env.NEXT_PUBLIC_OCR_URL?.replace(/\/$/, "") ?? "http://localhost:8000"

export interface OcrPage {
  page: number
  text: string
  confidence: number
}

export interface OcrResult {
  text: string
  pages: OcrPage[]
  language: string
  page_count: number
  confidence: number
  duration_ms: number
}

export const OCR_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp,.pdf,image/*,application/pdf"

export const OCR_LANGUAGES: { value: string; label: string }[] = [
  { value: "eng", label: "English" },
  // { value: "rus", label: "Russian" },
  // { value: "uzb", label: "Uzbek" },
  // { value: "eng+rus", label: "English + Russian" },
  // { value: "deu", label: "German" },
  // { value: "fra", label: "French" },
  // { value: "spa", label: "Spanish" },
]

export async function extractText(file: File, lang = "eng"): Promise<OcrResult> {
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(`${OCR_URL}/ocr?lang=${encodeURIComponent(lang)}`, {
    method: "POST",
    body: form,
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* non-JSON error body */
  }

  if (!res.ok) {
    const detail =
      (data as { detail?: string } | null)?.detail ??
      "OCR failed. Is the OCR service running?"
    throw new Error(detail)
  }
  return data as OcrResult
}

export async function ocrHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OCR_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

export { OCR_URL }
