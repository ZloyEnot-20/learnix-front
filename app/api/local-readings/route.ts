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

function collectQuestionTypes(data: { parts?: { questions?: { type?: string }[] }[] }): string[] {
  const types = new Set<string>()
  for (const part of data.parts ?? []) {
    for (const question of part.questions ?? []) {
      if (question.type) types.add(question.type)
    }
  }
  return [...types].sort()
}

function countQuestions(data: { parts?: { questions?: unknown[] }[] }): number {
  return (data.parts ?? []).reduce((sum, part) => sum + (part.questions?.length ?? 0), 0)
}

export async function GET() {
  const readingDir = resolveReadingDir()
  if (!readingDir) {
    return NextResponse.json({ error: "Reading catalogue not available" }, { status: 503 })
  }

  const files = fs
    .readdirSync(readingDir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .sort((a, b) => b.localeCompare(a))

  const summaries = files.map((file, idx) => {
    const slug = file.replace(/\.json$/, "")
    const data = JSON.parse(fs.readFileSync(path.join(readingDir, file), "utf8"))
    const questionCount = countQuestions(data)
    const questionTypes = collectQuestionTypes(data)
    return {
      slug,
      title: data.title ?? slug,
      subtitle: data.subtitle ?? `${questionCount} questions`,
      totalTimeMinutes: data.totalTimeMinutes ?? 20,
      questionCount,
      questionTypes,
      order: idx,
    }
  })

  return NextResponse.json(summaries)
}
