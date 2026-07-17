/**
 * Builds public/cefr-reading-catalog.json for CEFR reading folder counts in Exercises UI.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INDEX = path.resolve(__dirname, "../lib/data/cefr-reading-index.json")
const OUT = path.resolve(__dirname, "../public/cefr-reading-catalog.json")

function main() {
  if (!fs.existsSync(INDEX)) {
    console.warn("[generate-cefr-reading-catalog] skip: missing index.json")
    return
  }
  const { items } = JSON.parse(fs.readFileSync(INDEX, "utf8"))
  const catalog = (items ?? []).map((item, idx) => ({
    slug: item.id,
    title: item.title,
    subtitle: item.subtitle ?? "",
    totalTimeMinutes: item.estimatedMinutes ?? 15,
    questionCount: item.questionCount ?? 0,
    level: item.level ?? "",
    order: 1000 + idx,
  }))
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
  console.log(`[generate-cefr-reading-catalog] wrote ${catalog.length} item(s)`)
}

main()
