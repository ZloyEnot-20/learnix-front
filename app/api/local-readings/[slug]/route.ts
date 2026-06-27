import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"

const READING_DIR = path.resolve(process.cwd(), "../exercises/ielts/reading")

function countQuestions(data: { parts?: { questions?: unknown[] }[] }): number {
  return (data.parts ?? []).reduce((sum, part) => sum + (part.questions?.length ?? 0), 0)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const filePath = path.join(READING_DIR, `${slug}.json`)

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
