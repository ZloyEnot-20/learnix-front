// One-shot helper: paste the HTML snippet into html-input.txt to regenerate
// lib/grammar-topics-meta.json. Not used at runtime.
const fs = require("fs")
const html = fs.readFileSync(
  process.argv[2] || "html-input.txt",
  "utf-8",
)

// Parse duration like "2 hr 6 min", "1 hr", "44 min" → minutes.
function parseDuration(text) {
  let total = 0
  const hr = text.match(/(\d+)\s*hr/)
  if (hr) total += Number(hr[1]) * 60
  const min = text.match(/(\d+)\s*min/)
  if (min) total += Number(min[1])
  return total
}

const out = []
// Match every <a class="group ..." href="/<slug>-exercises">
const cardRegex = /<a class="group[^"]*" href="\/([a-z0-9-]+)-exercises">([\s\S]*?)<\/a>/g
let m
while ((m = cardRegex.exec(html)) !== null) {
  const slug = m[1]
  const body = m[2]
  const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(body)
  const chipMatches = [...body.matchAll(/<span class="rounded-full[^"]*">([\s\S]*?)<\/span>/g)].map(
    (x) => x[1].trim(),
  )
  const desc = /<p class="text-sm[^"]*">([\s\S]*?)<\/p>/.exec(body)
  const title = h3 ? h3[1].replace(/&amp;/g, "&").trim() : slug
  const description = desc ? desc[1].replace(/&amp;/g, "&").trim() : ""
  const exMatch = chipMatches.find((c) => /exercise/.test(c))
  const qMatch = chipMatches.find((c) => /question/.test(c))
  const lvlMatch = chipMatches.find((c) => /^[A-C][12](-[A-C][12])?$/.test(c))
  const durMatch = chipMatches.find((c) => /hr|min/.test(c))
  out.push({
    slug,
    title,
    description,
    exerciseCount: exMatch ? Number(exMatch.replace(/[^0-9]/g, "")) : 0,
    questionCount: qMatch ? Number(qMatch.replace(/[^0-9]/g, "")) : 0,
    level: lvlMatch ?? "A1",
    totalMinutes: durMatch ? parseDuration(durMatch) : 0,
  })
}

fs.writeFileSync("lib/grammar-topics-meta.json", JSON.stringify(out, null, 2))
console.log("topics:", out.length)
