"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { entryTestApi } from "@/lib/api"
import { studentEntryTestActions } from "@/lib/entry-test-actions"
import { EntryTestSession } from "@/components/entry-test/entry-test-session"
import { EntryTestLangToggle, useEntryTestLang } from "@/components/entry-test/entry-test-lang"
import type { EntryTestSubmission } from "@/lib/entry-test-storage"

export default function EntryTestPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { t } = useEntryTestLang()
  const [mounted, setMounted] = useState(false)
  const [test, setTest] = useState<EntryTestSubmission | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [user, isLoading, router])

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setTest(await entryTestApi.mine())
    } catch {
      setTest(null)
    }
  }, [user])

  useEffect(() => {
    if (user) reload()
  }, [user, reload])

  const actions = useMemo(() => studentEntryTestActions(), [])

  if (!mounted || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900">{t("headerTitle")}</h1>
            <EntryTestLangToggle />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">{t("noTestAssigned")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("noTestAssignedDesc")}</p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {t("dashboard")}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <EntryTestSession
      test={test}
      actions={actions}
      onReload={reload}
      backHref="/dashboard"
      backLabel={t("dashboard")}
    />
  )
}
