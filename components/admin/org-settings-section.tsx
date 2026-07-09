"use client"

import { useCallback, useEffect, useState } from "react"
import { orgApi, speechApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Camera, CheckCircle2, ClipboardList, Mic, Shield, Sparkles, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function OrgSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function OrgSettingsSection() {
  const [allowScreenshots, setAllowScreenshots] = useState(false)
  const [entryTestAutocomplete, setEntryTestAutocomplete] = useState(false)
  const [speechWorking, setSpeechWorking] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<"allowScreenshots" | "entryTestAutocomplete" | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [settings, speechStatus] = await Promise.all([
        orgApi.settings(),
        speechApi.status().catch(() => null),
      ])
      setAllowScreenshots(settings.allowScreenshots === true)
      setEntryTestAutocomplete(settings.entryTestAutocomplete === true)
      setSpeechWorking(
        speechStatus ? Boolean(speechStatus.online && speechStatus.loaded) : false,
      )
    } catch {
      setError("Failed to load settings. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleAllowScreenshotsToggle = async (checked: boolean) => {
    const previous = allowScreenshots
    setAllowScreenshots(checked)
    setSavingKey("allowScreenshots")
    setError(null)
    try {
      const updated = await orgApi.updateSettings({ allowScreenshots: checked })
      setAllowScreenshots(updated.allowScreenshots === true)
      setEntryTestAutocomplete(updated.entryTestAutocomplete === true)
    } catch {
      setAllowScreenshots(previous)
      setError("Could not save settings. Please try again.")
    } finally {
      setSavingKey(null)
    }
  }

  const handleEntryTestAutocompleteToggle = async (checked: boolean) => {
    const previous = entryTestAutocomplete
    setEntryTestAutocomplete(checked)
    setSavingKey("entryTestAutocomplete")
    setError(null)
    try {
      const updated = await orgApi.updateSettings({ entryTestAutocomplete: checked })
      setAllowScreenshots(updated.allowScreenshots === true)
      setEntryTestAutocomplete(updated.entryTestAutocomplete === true)
    } catch {
      setEntryTestAutocomplete(previous)
      setError("Could not save settings. Please try again.")
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return <OrgSettingsSkeleton />
  }

  const speechOk = speechWorking === true

  return (
    <div className="space-y-6">
      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-slate-500" />
            Homework integrity
          </CardTitle>
          <CardDescription>
            Control how the mobile app protects homework sessions for your students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="space-y-1">
              <Label htmlFor="allow-screenshots" className="flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-4 w-4 text-slate-500" />
                Allow screenshots
              </Label>
              <p className="text-sm text-slate-500">
                When disabled, students cannot take screenshots while doing homework in the mobile app.
                Recommended for exams and graded assignments.
              </p>
            </div>
            <Switch
              id="allow-screenshots"
              checked={allowScreenshots}
              disabled={savingKey !== null}
              onCheckedChange={(checked) => void handleAllowScreenshotsToggle(checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-slate-500" />
            Entry test
          </CardTitle>
          <CardDescription>
            Options for phone-based placement tests and student entry tests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="space-y-1">
              <Label
                htmlFor="entry-test-autocomplete"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                Autocomplete button
              </Label>
              <p className="text-sm text-slate-500">
                When enabled, entry test screens show a demo autocomplete button to quickly fill
                answers. Useful for staff demos and internal testing — keep disabled for real candidates.
              </p>
            </div>
            <Switch
              id="entry-test-autocomplete"
              checked={entryTestAutocomplete}
              disabled={savingKey !== null}
              onCheckedChange={(checked) => void handleEntryTestAutocompleteToggle(checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-slate-500" />
            Speech recognition
          </CardTitle>
          <CardDescription>
            Automatic speech-to-text for student speaking homework.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Whisper service</p>
              <p className="text-sm text-slate-500">
                Transcribes speaking recordings after submission for teacher review.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                speechOk ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
              )}
            >
              {speechOk ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {speechOk ? "Working" : "Not working"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
