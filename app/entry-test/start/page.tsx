"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ClipboardList } from "lucide-react"
import { entryTestPublicApi } from "@/lib/api"
import { phoneEntryTestActions } from "@/lib/entry-test-actions"
import { EntryTestSession } from "@/components/entry-test/entry-test-session"
import { EntryTestLangToggle, useEntryTestLang } from "@/components/entry-test/entry-test-lang"
import type { EntryTestSubmission } from "@/lib/entry-test-storage"
import { formatPhoneDisplay, isValidPhone, normalizePhone, emptyUzPhoneDisplay } from "@/lib/phone"
import { UzbekPhoneInput } from "@/components/ui/uzbek-phone-input"
import { ValidationHint } from "@/components/ui/validation-hint"

const PHONE_SESSION_KEY = "entry-test-phone"

export default function EntryTestStartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
        </div>
      }
    >
      <EntryTestStartContent />
    </Suspense>
  )
}

function EntryTestStartContent() {
  const { t } = useEntryTestLang()
  const searchParams = useSearchParams()
  const orgId = searchParams.get("org") ?? undefined

  const [phoneInput, setPhoneInput] = useState(emptyUzPhoneDisplay())
  const [phone, setPhone] = useState<string | null>(null)
  const [test, setTest] = useState<EntryTestSubmission | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const lookup = useCallback(
    async (rawPhone: string) => {
      const normalized = normalizePhone(rawPhone)
      if (!isValidPhone(normalized)) {
        setError(t("invalidPhone"))
        return
      }
      setLoading(true)
      setError("")
      try {
        const found = await entryTestPublicApi.lookup(normalized, orgId)
        setPhone(normalized)
        setTest(found)
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(PHONE_SESSION_KEY, normalized)
        }
      } catch {
        setTest(null)
        setPhone(null)
        setError(t("testNotFound"))
      } finally {
        setLoading(false)
      }
    },
    [orgId, t],
  )

  const reload = useCallback(async () => {
    if (!phone) return
    try {
      setTest(await entryTestPublicApi.lookup(phone, orgId))
    } catch {
      /* keep current test on transient errors */
    }
  }, [phone, orgId])

  const actions = useMemo(
    () => (phone ? phoneEntryTestActions(phone) : null),
    [phone],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void lookup(phoneInput)
  }

  const resetPhone = () => {
    setPhone(null)
    setTest(null)
    setPhoneInput(emptyUzPhoneDisplay())
    setError("")
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PHONE_SESSION_KEY)
    }
  }

  if (test && phone && actions) {
    return (
      <div>
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs text-slate-500">{t("candidate")}</p>
              <p className="text-sm font-semibold text-slate-900">
                {test.studentName} · {formatPhoneDisplay(phone)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <EntryTestLangToggle />
              <Button variant="outline" size="sm" onClick={resetPhone}>
                {t("otherPhone")}
              </Button>
            </div>
          </div>
        </div>
        <EntryTestSession
          test={test}
          actions={actions}
          onReload={reload}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="mb-4 flex justify-end">
          <EntryTestLangToggle />
        </div>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">{t("pageTitle")}</CardTitle>
            <CardDescription>{t("startDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("phoneLabel")}</Label>
                <UzbekPhoneInput id="phone" value={phoneInput} onChange={setPhoneInput} />
              </div>
              {error && <ValidationHint>{error}</ValidationHint>}
              <Button
                type="submit"
                loading={loading}
                className="w-full bg-[#C8102E] hover:bg-[#A00D25]"
              >
                {t("continue")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
