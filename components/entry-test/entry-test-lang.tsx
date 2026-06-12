"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  ENTRY_TEST_LANGS,
  entryTestT,
  type EntryTestLang,
  type EntryTestMessageKey,
} from "@/lib/entry-test-i18n"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "entry-test-lang"

type EntryTestLangContextValue = {
  lang: EntryTestLang
  setLang: (lang: EntryTestLang) => void
  t: (key: EntryTestMessageKey, vars?: Record<string, string | number>) => string
}

const EntryTestLangContext = createContext<EntryTestLangContextValue | null>(null)

export function EntryTestLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<EntryTestLang>("uz")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "ru" || stored === "uz") setLangState(stored)
  }, [])

  const setLang = (next: EntryTestLang) => {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: EntryTestMessageKey, vars?: Record<string, string | number>) =>
        entryTestT(lang, key, vars),
    }),
    [lang],
  )

  return <EntryTestLangContext.Provider value={value}>{children}</EntryTestLangContext.Provider>
}

export function useEntryTestLang() {
  const ctx = useContext(EntryTestLangContext)
  if (!ctx) throw new Error("useEntryTestLang must be used within EntryTestLangProvider")
  return ctx
}

export function EntryTestLangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useEntryTestLang()

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label={t("langToggleLabel")}
    >
      {ENTRY_TEST_LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          aria-pressed={lang === l.value}
          title={l.label}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
            lang === l.value
              ? "bg-primary text-primary-foreground"
              : "text-slate-500 hover:text-slate-900",
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
