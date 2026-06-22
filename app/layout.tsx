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
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Learnix — Achieve Your Dream IELTS Score",
    description: siteDescription,
    siteName: "Learnix",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 576,
        alt: "Learnix — English learning platform with home, learn, and homework screens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learnix — Achieve Your Dream IELTS Score",
    description: siteDescription,
    images: ["/og-image.png"],
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
