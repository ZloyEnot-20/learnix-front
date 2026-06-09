import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { OrgBlockedGuard } from "@/components/org-blocked-guard"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Learnix — IELTS Test Platform",
  description: "Learnix · complete IELTS preparation and testing platform",
  generator: "v0.app",
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
            <Suspense>{children}</Suspense>
          </OrgBlockedGuard>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
