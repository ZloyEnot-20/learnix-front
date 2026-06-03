"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GrammarMaterial } from "@/lib/grammar-materials"

interface MaterialsGridProps {
  materials: GrammarMaterial[]
  heading?: string
  description?: string
}

export default function MaterialsGrid({
  materials,
  heading = "Printable charts perfect for your classroom wall or personal study notes.",
  description,
}: MaterialsGridProps) {
  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300">
          <Printer className="h-6 w-6 text-slate-600" />
        </div>
        <p className="mt-3 font-semibold text-slate-900">
          No materials for this topic yet
        </p>
        <p className="mt-1 mx-auto max-w-md text-sm text-slate-500">
          Reference charts and printable resources for this topic haven&apos;t been
          added yet.
        </p>
      </div>
    )
  }

  const handlePrint = (mat: GrammarMaterial) => {
    if (typeof window === "undefined") return
    const w = window.open("", "_blank", "width=900,height=1200")
    if (!w) {
      window.print()
      return
    }
    w.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${mat.title}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 24px; font-family: -apple-system, sans-serif; background: #f8fafc; }
            h1 { font-size: 18px; color: #0f172a; margin: 0 0 16px; text-align: center; }
            img { width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 8px; background: white; }
            @media print {
              body { background: white; padding: 0; }
              img { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <h1>${mat.title}</h1>
          <img src="${mat.image}" alt="${mat.title}" onload="setTimeout(() => { window.focus(); window.print(); }, 200)" />
        </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{heading}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}

      <div className="grid gap-5 justify-center" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 380px))" }}>
        {materials.map((mat) => (
          <div
            key={mat.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className={cn("relative p-3", mat.tint)}>
              <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                <div className="relative mx-auto h-[380px] w-full max-w-[225px]">
                  <Image
                    src={mat.image}
                    alt={mat.title}
                    fill
                    sizes="225px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="text-center">
                <p className="text-base font-semibold text-slate-900">
                  {mat.title}
                </p>
                {mat.subtitle && (
                  <p className="text-xs text-slate-500">{mat.subtitle}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => handlePrint(mat)}
                  className="flex-1 gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <a
                  href={mat.image}
                  download={mat.downloadFilename}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors",
                    mat.downloadButtonClass,
                  )}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
