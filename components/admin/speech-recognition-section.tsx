"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle2, Mic, RefreshCw, Server, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { speechApi, type SpeechServiceStatus } from "@/lib/api"
import { StatCardsSkeleton } from "@/components/admin/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
      )}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

export default function SpeechRecognitionSection() {
  const { toast } = useToast()
  const [status, setStatus] = useState<SpeechServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testUrl, setTestUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await speechApi.status()
      setStatus(data)
    } catch {
      setStatus(null)
      toast({
        title: "Could not reach the API",
        description: "Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const runTest = async () => {
    const url = testUrl.trim()
    if (!url) {
      toast({ title: "Enter an audio URL", variant: "destructive" })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const { text } = await speechApi.test(url)
      setTestResult(text || "(empty transcription)")
      toast({ title: "Transcription complete" })
    } catch (err) {
      toast({
        title: "Test failed",
        description: err instanceof Error ? err.message : "Could not transcribe",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={3} />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const serviceReady = Boolean(status?.online && status?.loaded)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Automatic speech-to-text for student speaking homework. Recordings are transcribed after
          submission and shown to teachers during review.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadStatus(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Service</p>
              <StatusBadge ok={Boolean(status?.online)} label={status?.online ? "Online" : "Offline"} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Model</p>
              <p className="text-sm font-semibold text-slate-900">{status?.model ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                serviceReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
              )}
            >
              {serviceReady ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Ready</p>
              <StatusBadge
                ok={serviceReady}
                label={serviceReady ? "Transcribing" : status?.loaded === false ? "Model loading" : "Unavailable"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Service URL</p>
            <p className="mt-1 font-mono text-xs text-slate-800">{status?.serviceUrl ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Language</p>
            <p className="mt-1 text-slate-800">{status?.language ?? "—"}</p>
          </div>
          {status?.error ? (
            <div className="sm:col-span-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {status.error}
            </div>
          ) : null}
          {!serviceReady ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Start the Whisper service:{" "}
              <code className="rounded bg-white/80 px-1 py-0.5">.\start.bat</code> in{" "}
              <code className="rounded bg-white/80 px-1 py-0.5">learnix-whisper</code>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test transcription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Paste a public URL of a speaking recording (e.g. from S3 or local uploads) to verify the
            pipeline.
          </p>
          <div>
            <Label htmlFor="speech-test-url" className="text-xs">
              Audio URL
            </Label>
            <Input
              id="speech-test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://…/speaking/…/audio.m4a"
              className="mt-1"
            />
          </div>
          <Button onClick={() => void runTest()} disabled={testing || !serviceReady}>
            {testing ? "Transcribing…" : "Run test"}
          </Button>
          {testResult !== null ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {testResult}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
