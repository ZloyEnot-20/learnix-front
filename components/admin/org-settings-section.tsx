"use client"

import { useCallback, useEffect, useState } from "react"
import { orgApi, speechApi } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Camera, CheckCircle2, Mic, Sparkles, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function SettingsGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 first:pt-0">
      {children}
    </p>
  )
}

function SettingsRow({
  icon,
  iconClassName,
  title,
  description,
  htmlFor,
  control,
}: {
  icon: React.ReactNode
  iconClassName?: string
  title: string
  description?: string
  htmlFor?: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-900">
          {title}
        </Label>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function OrgSettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="px-4 py-3">
          <Skeleton className="mb-3 h-3 w-20" />
          {[0, 1, 2].map((i) => (
            <div key={i}>
              {i > 0 ? (
                <>
                  <Separator className="my-2" />
                  <Skeleton className="mb-2 h-3 w-24" />
                </>
              ) : null}
              <div className="flex items-center gap-3 py-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
    <div className="mx-auto max-w-2xl space-y-3">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="px-4 py-3">
          <SettingsGroupLabel>Mobile app</SettingsGroupLabel>
          <SettingsRow
            icon={<Camera className="h-4 w-4" />}
            title="Allow screenshots"
            description="Block screenshots during homework on mobile."
            htmlFor="allow-screenshots"
            control={
              <Switch
                id="allow-screenshots"
                checked={allowScreenshots}
                disabled={savingKey !== null}
                onCheckedChange={(checked) => void handleAllowScreenshotsToggle(checked)}
              />
            }
          />

          <Separator className="my-2" />

          <SettingsGroupLabel>Entry test</SettingsGroupLabel>
          <SettingsRow
            icon={<Sparkles className="h-4 w-4 text-amber-600" />}
            iconClassName="bg-amber-50"
            title="Autocomplete button"
            description="Quick-fill answers for demos and internal testing."
            htmlFor="entry-test-autocomplete"
            control={
              <Switch
                id="entry-test-autocomplete"
                checked={entryTestAutocomplete}
                disabled={savingKey !== null}
                onCheckedChange={(checked) => void handleEntryTestAutocompleteToggle(checked)}
              />
            }
          />

          <Separator className="my-2" />

          <SettingsGroupLabel>Speech recognition</SettingsGroupLabel>
          <SettingsRow
            icon={<Mic className="h-4 w-4" />}
            title="Whisper service"
            description="Transcribes speaking recordings after submission."
            control={
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                  speechOk
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700",
                )}
              >
                {speechOk ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {speechOk ? "Online" : "Offline"}
              </span>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
