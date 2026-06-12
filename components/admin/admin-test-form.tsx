"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Minus,
  Plus,
  FileJson,
  ClipboardList,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TestType = "reading" | "listening" | "writing" | "speaking"

const TEST_TYPES: Array<{
  key: TestType
  label: string
  icon: typeof BookOpen
  color: string
  hint: string
}> = [
  {
    key: "reading",
    label: "Reading",
    icon: BookOpen,
    color: "#c1bffd",
    hint: "Passages with Q&A",
  },
  {
    key: "listening",
    label: "Listening",
    icon: Headphones,
    color: "#ffcc3e",
    hint: "Audio comprehension",
  },
  {
    key: "writing",
    label: "Writing",
    icon: PenTool,
    color: "#a7e237",
    hint: "Task 1 and Task 2",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: Mic,
    color: "#9fcffb",
    hint: "Three-part interview",
  },
]

const PRESETS: Record<TestType, { partCount: number; totalTime: number }> = {
  reading: { partCount: 3, totalTime: 60 },
  listening: { partCount: 4, totalTime: 30 },
  writing: { partCount: 2, totalTime: 60 },
  speaking: { partCount: 3, totalTime: 15 },
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  ariaLabel,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  ariaLabel?: string
}) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={dec}
        aria-label={`${ariaLabel ?? "Value"} decrease`}
        disabled={value <= min}
        className="flex h-10 w-10 items-center justify-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex h-10 min-w-[5.5rem] items-center justify-center border-x border-slate-200 px-3 tabular-nums">
        <span className="font-semibold text-slate-900">{value}</span>
        {suffix && <span className="ml-1 text-xs text-slate-500">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={inc}
        aria-label={`${ariaLabel ?? "Value"} increase`}
        disabled={value >= max}
        className="flex h-10 w-10 items-center justify-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

interface AdminTestFormProps {
  onCreated?: () => void
}

export default function AdminTestForm({ onCreated }: AdminTestFormProps) {
  const { toast } = useToast()
  const [testType, setTestType] = useState<TestType | "">("")
  const [jsonInput, setJsonInput] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    partCount: 3,
    totalTime: 60,
  })

  const selectType = (type: TestType) => {
    setTestType(type)
    setFormData((prev) => ({
      ...prev,
      partCount: PRESETS[type].partCount,
      totalTime: PRESETS[type].totalTime,
    }))
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateTestConfig = (config: unknown): { valid: boolean; error: string } => {
    if (!config || typeof config !== "object") {
      return { valid: false, error: "Configuration must be a valid JSON object" }
    }
    const cfg = config as Record<string, unknown>
    if (!cfg.title || typeof cfg.title !== "string" || !cfg.title.trim()) {
      return { valid: false, error: 'Missing or invalid "title" field (must be a non-empty string)' }
    }
    if (!cfg.parts || !Array.isArray(cfg.parts) || cfg.parts.length === 0) {
      return { valid: false, error: 'Missing or invalid "parts" field (must be an array with at least 1 part)' }
    }
    for (let i = 0; i < cfg.parts.length; i++) {
      const part = cfg.parts[i]
      if (!part || typeof part !== "object") {
        return { valid: false, error: `Part ${i} is not a valid object` }
      }
      const p = part as Record<string, unknown>
      if (!p.partNumber || typeof p.partNumber !== "number") {
        return { valid: false, error: `Part ${i} missing "partNumber" (must be a number)` }
      }
      if (!p.questions || !Array.isArray(p.questions)) {
        return { valid: false, error: `Part ${i} missing "questions" field (must be an array)` }
      }
    }
    if (typeof cfg.totalTime === "number" && cfg.totalTime <= 0) {
      return { valid: false, error: '"totalTime" must be greater than 0' }
    }
    return { valid: true, error: "" }
  }

  const persistTest = (newTest: Record<string, unknown>) => {
    const existingTests = JSON.parse(localStorage.getItem("adminTests") || "{}")
    existingTests[newTest.testId as string] = newTest
    localStorage.setItem("adminTests", JSON.stringify(existingTests))
    onCreated?.()
  }

  const handleJsonImport = (e: React.FormEvent) => {
    e.preventDefault()
    setJsonError("")

    if (!testType) {
      toast({
        title: "Pick a test type",
        description: "Select Reading, Listening, Writing or Speaking first.",
        variant: "destructive",
      })
      return
    }

    if (!jsonInput.trim()) {
      setJsonError("JSON input cannot be empty")
      return
    }

    try {
      const testConfig = JSON.parse(jsonInput)
      const validation = validateTestConfig(testConfig)
      if (!validation.valid) {
        setJsonError(validation.error)
        return
      }

      const testId = `${testType}-${Date.now()}`
      const newTest = {
        testId,
        title: testConfig.title,
        ...testConfig,
        type: testType,
        createdAt: new Date().toISOString(),
      }

      persistTest(newTest)

      toast({
        title: "Test imported",
        description: `"${testConfig.title}" was created successfully.`,
      })

      setTestType("")
      setJsonInput("")
      setJsonError("")
    } catch (error) {
      setJsonError(
        `Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!testType) {
      toast({
        title: "Pick a test type",
        description: "Select Reading, Listening, Writing or Speaking first.",
        variant: "destructive",
      })
      return
    }
    if (!formData.title.trim()) {
      toast({
        title: "Title is required",
        description: "Give the test a clear name.",
        variant: "destructive",
      })
      return
    }
    if (formData.partCount < 1 || formData.partCount > 10) {
      toast({
        title: "Invalid number of parts",
        description: "Must be between 1 and 10.",
        variant: "destructive",
      })
      return
    }
    if (formData.totalTime < 10 || formData.totalTime > 180) {
      toast({
        title: "Invalid duration",
        description: "Total time must be between 10 and 180 minutes.",
        variant: "destructive",
      })
      return
    }

    const testId = `${testType}-${Date.now()}`
    const newTest = {
      testId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: testType,
      partCount: formData.partCount,
      totalTime: formData.totalTime,
      createdAt: new Date().toISOString(),
      parts: [],
    }
    persistTest(newTest)

    toast({
      title: "Test created",
      description: `"${formData.title}" added to ${testType}.`,
    })

    setTestType("")
    setFormData({ title: "", description: "", partCount: 3, totalTime: 60 })
  }

  const selectedMeta = testType ? TEST_TYPES.find((t) => t.key === testType) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Add New Test
        </CardTitle>
        <CardDescription>
          Create a new Reading, Listening, Writing or Speaking test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-900">Test type</Label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {TEST_TYPES.map((t) => {
              const Icon = t.icon
              const active = testType === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => selectType(t.key)}
                  aria-pressed={active}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-slate-900 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity",
                      active ? "opacity-50" : "opacity-30",
                    )}
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="relative flex items-center gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-black/5"
                      style={{ backgroundColor: t.color }}
                    >
                      <Icon className="h-4 w-4 text-slate-900/80" />
                    </span>
                    {active && (
                      <span className="ml-auto rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="relative mt-3 font-semibold text-slate-900">{t.label}</p>
                  <p className="relative text-xs text-slate-500">{t.hint}</p>
                </button>
              )
            })}
          </div>
        </div>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Quick form
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., IELTS Practice Test 5"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Short description visible to students"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Number of parts</span>
                    <span className="text-xs font-normal text-slate-400">1–10</span>
                  </Label>
                  <NumberStepper
                    value={formData.partCount}
                    onChange={(v) => setFormData((prev) => ({ ...prev, partCount: v }))}
                    min={1}
                    max={10}
                    ariaLabel="Number of parts"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Total time</span>
                    <span className="text-xs font-normal text-slate-400">10–180 min</span>
                  </Label>
                  <NumberStepper
                    value={formData.totalTime}
                    onChange={(v) => setFormData((prev) => ({ ...prev, totalTime: v }))}
                    min={10}
                    max={180}
                    step={5}
                    suffix="min"
                    ariaLabel="Total time"
                  />
                </div>
              </div>

              {selectedMeta && (
                <div
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  aria-live="polite"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-black/5"
                    style={{ backgroundColor: selectedMeta.color }}
                  >
                    {(() => {
                      const Icon = selectedMeta.icon
                      return <Icon className="h-4 w-4 text-slate-900/80" />
                    })()}
                  </span>
                  <div className="text-sm text-slate-700">
                    Creating a{" "}
                    <span className="font-semibold">{selectedMeta.label}</span> test with{" "}
                    <span className="font-semibold">{formData.partCount}</span> part
                    {formData.partCount === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold">{formData.totalTime}</span> min
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Create test
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="json" className="mt-6">
            <form onSubmit={handleJsonImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-input">Test Configuration (JSON)</Label>
                <Textarea
                  id="json-input"
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{
  "title": "IELTS Practice Test",
  "totalTime": 60,
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1",
      "instruction": "Answer these questions",
      "questions": [
        {
          "id": "q1",
          "text": "Question text",
          "type": "multiple-choice",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": "A"
        }
      ]
    }
  ]
}`}
                  rows={14}
                  className="font-mono text-xs"
                />
                {jsonError && (
                  <Alert variant="destructive">
                    <AlertDescription>{jsonError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Import test from JSON
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
