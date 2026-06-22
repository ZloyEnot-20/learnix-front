import type { Metadata } from "next"
import Link from "next/link"
import { IELTSLogo } from "@/components/ielts-logo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
} from "@/lib/privacy-policy-content"

export const metadata: Metadata = {
  title: "Privacy Policy — Learnix",
  description:
    "Learn how Learnix collects, uses, and protects your data — including how to delete your student account.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <IELTSLogo />
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {PRIVACY_POLICY_LAST_UPDATED}</p>
          <p className="text-base leading-relaxed text-slate-600">
            Learnix (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This policy
            explains what information we collect, how we use it, how we protect it, and the choices
            available to you — including how to delete your account.
          </p>
        </div>

        <div className="space-y-4">
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-slate-600">
                <p>{section.body}</p>
                {section.bullets && (
                  <ul className="list-disc space-y-2 pl-5">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
