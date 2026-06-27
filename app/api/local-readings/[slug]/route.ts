import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

const READING_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "exercises/ielts/reading"),
  path.resolve(process.cwd(), "../exercises/ielts/reading"),
  path.resolve(process.cwd(), "../learnix-backend/exercises/ielts/reading"),
]

function resolveReadingDir(): string | null {
  return READING_DIR_CANDIDATES.find((dir) => fs.existsSync(dir)) ?? null
}

function countQuestions(data: { parts?: { questions?: unknown[] }[] }): number {
  return (data.parts ?? []).reduce((sum, part) => sum + (part.questions?.length ?? 0), 0)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const readingDir = resolveReadingDir()
  if (!readingDir) {
    return NextResponse.json({ error: "Reading catalogue not available" }, { status: 503 })
  }
  const filePath = path.join(readingDir, `${slug}.json`)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
  const questionCount = countQuestions(data)

  const doc = {
    slug,
    title: data.title ?? slug,
    totalTimeMinutes: data.totalTimeMinutes ?? 20,
    questionCount,
    data: {
      id: data.id ?? slug,
      title: data.title ?? slug,
      totalTimeMinutes: data.totalTimeMinutes ?? 20,
      parts: data.parts ?? [],
    },
  }

  return NextResponse.json(doc)
}
