import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { OrgBlockedGuard } from "@/components/org-blocked-guard"
import { StudentWebBlockedGuard } from "@/components/student-web-blocked-guard"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { Suspense } from "react"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://learnix.space"

const siteDescription =
  "A modern platform for English learners. Study with your teachers, complete tasks, earn achievements, play educational games, and track your progress in one place."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Learnix — Achieve Your Dream IELTS Score",
  description: siteDescription,
  openGraph: {
    title: "Learnix — Achieve Your Dream IELTS Score",
    description: siteDescription,
    siteName: "Learnix",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Learnix — Achieve Your Dream IELTS Score",
    description: siteDescription,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <AuthProvider>
          <OrgBlockedGuard>
            <StudentWebBlockedGuard>
              <Suspense>{children}</Suspense>
            </StudentWebBlockedGuard>
          </OrgBlockedGuard>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
