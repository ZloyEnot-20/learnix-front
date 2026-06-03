"use client"

import Image from "next/image"
import { Download, Sparkles } from "lucide-react"

/**
 * Coming-soon preview for the topic Explanation tab.
 * Renders a static sample article (OSASCOMP adjective order) so the user
 * can see what the section will look like once written.
 */
export default function ExplanationPreview() {
  const imgSrc = "/materials/word-order-adjective-order.png"

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = imgSrc
    a.download = "word-order-adjective-order.png"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="mx-auto w-full max-w-[896px] space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <p className="text-sm text-amber-900">
          <span className="font-semibold">Coming soon.</span> A detailed
          written explanation with rules, examples and infographics will live
          here. Below is a preview of the format.
        </p>
      </div>

      <article className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          <Sparkles className="h-3 w-3" />
          Soon
        </span>

        <div className="p-6 md:p-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            What order do adjectives go in before a noun?
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-gray-700">
            English has a strict but largely unconscious rule for adjective
            order before nouns. The mnemonic{" "}
            <span className="font-semibold">OSASCOMP</span> helps remember:
            Opinion-Size-Age-Shape-Colour-Origin-Material-Purpose. Native
            speakers follow this order instinctively — &ldquo;a beautiful old
            Italian wooden table&rdquo; sounds right, while &ldquo;a wooden
            Italian old beautiful table&rdquo; sounds completely wrong.
          </p>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <OsascompTile letter="O" label="Opinion" example="lovely, ugly" cls="bg-blue-50" text="text-blue-800" />
            <OsascompTile letter="S" label="Size" example="big, tiny" cls="bg-green-50" text="text-green-800" />
            <OsascompTile letter="A" label="Age" example="old, new" cls="bg-yellow-50" text="text-yellow-800" />
            <OsascompTile letter="S" label="Shape" example="round, flat" cls="bg-purple-50" text="text-purple-800" />
            <OsascompTile letter="C" label="Colour" example="red, blue" cls="bg-red-50" text="text-red-800" />
            <OsascompTile letter="O" label="Origin" example="French, Japanese" cls="bg-orange-50" text="text-orange-800" />
            <OsascompTile letter="M" label="Material" example="wooden, metal" cls="bg-teal-50" text="text-teal-800" />
            <OsascompTile letter="P" label="Purpose" example="sleeping, cooking" cls="bg-pink-50" text="text-pink-800" />
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <div className="mx-auto max-w-md">
              <Image
                src={imgSrc}
                alt="OSASCOMP Adjective Order - Opinion Size Age Shape Colour Origin Material Purpose"
                width={668}
                height={1024}
                className="w-full rounded-lg shadow-sm"
                sizes="(max-width: 768px) 100vw, 448px"
              />
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background:
                      "linear-gradient(rgb(59, 130, 246), rgb(37, 99, 235))",
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download Infographic
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

function OsascompTile({
  letter,
  label,
  example,
  cls,
  text,
}: {
  letter: string
  label: string
  example: string
  cls: string
  text: string
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${cls}`}>
      <p className={`text-lg font-bold ${text}`}>{letter}</p>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-xs italic text-gray-500">{example}</p>
    </div>
  )
}
