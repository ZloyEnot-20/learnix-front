"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Headphones, ListChecks, Mic, PenTool } from "lucide-react"

const SKILLS = [
  { label: "Reading", icon: BookOpen, color: "#c1bffd" },
  { label: "Listening", icon: Headphones, color: "#ffcc3e" },
  { label: "Writing", icon: PenTool, color: "#a7e237" },
  { label: "Speaking", icon: Mic, color: "#9fcffb" },
] as const

export default function TestsList() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">IELTS Tests</h2>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold uppercase tracking-wide"
                >
                  Soon
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Full IELTS practice tests for Reading, Listening, Writing and Speaking are on the
                way. You&apos;ll be able to create and manage them here soon.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Coming soon
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((skill) => {
            const Icon = skill.icon
            return (
              <div
                key={skill.label}
                className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 opacity-60"
                  style={{ backgroundColor: skill.color }}
                />
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-70"
                    style={{ backgroundColor: skill.color }}
                  >
                    <Icon className="h-5 w-5 text-slate-900/70" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{skill.label}</p>
                    <p className="text-xs text-slate-400">Not available yet</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
