"use client"

import { useCallback, useEffect, useState } from "react"
import { orgApi } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Camera, Shield } from "lucide-react"

function OrgSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
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
    </div>
  )
}

export default function OrgSettingsSection() {
  const [allowScreenshots, setAllowScreenshots] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const settings = await orgApi.settings()
      setAllowScreenshots(settings.allowScreenshots)
    } catch {
      setError("Failed to load settings. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = async (checked: boolean) => {
    const previous = allowScreenshots
    setAllowScreenshots(checked)
    setSaving(true)
    setError(null)
    try {
      const updated = await orgApi.updateSettings({ allowScreenshots: checked })
      setAllowScreenshots(updated.allowScreenshots)
    } catch {
      setAllowScreenshots(previous)
      setError("Could not save settings. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <OrgSettingsSkeleton />
  }

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
              disabled={saving}
              onCheckedChange={(checked) => void handleToggle(checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
