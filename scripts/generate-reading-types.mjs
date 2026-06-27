/**
 * Builds public/reading-types.json for production filter chips when API omits questionTypes.
 * Run before `next build` (see package.json prebuild).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const READING_DIR = path.resolve(__dirname, "../../exercises/ielts/reading")
const OUT = path.resolve(__dirname, "../public/reading-types.json")

function collectQuestionTypes(data) {
  const types = new Set()
  for (const part of data.parts ?? []) {
    for (const q of part.questions ?? []) {
      if (q?.type) types.add(String(q.type))
    }
  }
  return [...types].sort()
}

function main() {
  const indexPath = path.join(READING_DIR, "index.json")
  if (!fs.existsSync(indexPath)) {
    console.warn("[generate-reading-types] skip: missing index.json")
    return
  }

  const { items } = JSON.parse(fs.readFileSync(indexPath, "utf8"))
  const bySlug = {}

  for (const item of items ?? []) {
    const filePath = path.join(READING_DIR, item.file)
    if (!fs.existsSync(filePath)) continue
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
    bySlug[item.id] = collectQuestionTypes(data)
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(bySlug, null, 0))
  console.log(`[generate-reading-types] wrote ${Object.keys(bySlug).length} slug(s) → public/reading-types.json`)
}

main()
