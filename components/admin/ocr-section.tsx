"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  FileUp,
  Image as ImageIcon,
  Loader2,
  ScanText,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  extractText,
  ocrHealth,
  OCR_ACCEPT,
  OCR_LANGUAGES,
  type OcrResult,
} from "@/lib/ocr-client"

const MAX_MB = 15

export default function OcrSection() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [lang, setLang] = useState("eng")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    ocrHealth().then((ok) => active && setOnline(ok))
    return () => {
      active = false
    }
  }, [])

  // Build/revoke an object URL for image previews (PDFs get an icon instead).
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const accept = useCallback(
    (f: File | undefined) => {
      if (!f) return
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`File too large (max ${MAX_MB} MB).`)
        return
      }
      setError(null)
      setResult(null)
      setFile(f)
    },
    [],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    accept(e.dataTransfer.files?.[0])
  }

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await extractText(file, lang)
      setResult(res)
      if (!res.text) {
        toast({
          title: "No text detected",
          description: "The document may be blank or too low quality.",
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OCR failed."
      setError(msg)
      toast({ title: "OCR failed", description: msg, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const copyText = async () => {
    if (!result?.text) return
    try {
      await navigator.clipboard.writeText(result.text)
      toast({ title: "Text copied" })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const downloadText = () => {
    if (!result?.text) return
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(file?.name ?? "ocr").replace(/\.[^.]+$/, "")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isPdf = file?.type === "application/pdf"

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <ScanText className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Document OCR</h2>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Beta
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Upload a scan or PDF and extract the text. Images and multi-page PDFs are
              supported.
            </p>
          </div>
          {online !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                online
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  online ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              {online ? "Service online" : "Service offline"}
            </span>
          )}
        </div>
        {online === false && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The OCR service isn&apos;t reachable. Start it from{" "}
            <code className="rounded bg-amber-100 px-1">ocr-service</code> (see its README) and
            set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_OCR_URL</code>.
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardContent className="space-y-4 p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
                dragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <FileUp className="h-6 w-6 text-indigo-500" />
              </span>
              <p className="text-sm font-medium text-slate-900">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP, TIFF, BMP or PDF · up to {MAX_MB} MB</p>
              <input
                ref={inputRef}
                type="file"
                accept={OCR_ACCEPT}
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="preview"
                    className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    {isPdf ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB · {isPdf ? "PDF" : "Image"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Language</label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCR_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={run}
              disabled={!file || busy}
              className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
              {busy ? "Extracting…" : "Extract text"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Extracted text</h3>
              {result && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyText}
                    disabled={!result.text}
                    className="gap-1.5"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadText}
                    disabled={!result.text}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    .txt
                  </Button>
                </div>
              )}
            </div>

            {result && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                <Stat icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}>
                  {result.confidence}% confidence
                </Stat>
                <Stat>
                  {result.page_count} page{result.page_count === 1 ? "" : "s"}
                </Stat>
                <Stat>{result.language}</Stat>
                <Stat>{result.duration_ms} ms</Stat>
              </div>
            )}

            <textarea
              readOnly
              value={result?.text ?? ""}
              placeholder="The recognised text will appear here…"
              className="min-h-[360px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
      {icon}
      {children}
    </span>
  )
}
