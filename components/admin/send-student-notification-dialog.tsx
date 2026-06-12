"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Bell } from "lucide-react"
import type { Student } from "@/lib/admin-storage"
import { studentsApi } from "@/lib/api"
import {
  DEFAULT_STUDENT_NOTIFICATION_TYPE,
  STUDENT_NOTIFICATION_TYPE_OPTIONS,
  type StudentNotificationType,
} from "@/lib/notification-types"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface SendStudentNotificationDialogProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendStudentNotificationDialog({
  student,
  open,
  onOpenChange,
}: SendStudentNotificationDialogProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState<StudentNotificationType>(DEFAULT_STUDENT_NOTIFICATION_TYPE)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle("")
      setMessage("")
      setType(DEFAULT_STUDENT_NOTIFICATION_TYPE)
      setSending(false)
    }
  }, [open])

  const submit = async () => {
    if (!student) return
    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()
    if (!trimmedTitle || !trimmedMessage) {
      toast({
        title: "Missing fields",
        description: "Title and message are required.",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      await studentsApi.sendNotification(student.id, {
        title: trimmedTitle,
        message: trimmedMessage,
        type,
      })
      toast({
        title: "Notification sent",
        description: `${student.name} will see it on their home screen and in the bell.`,
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        title: "Could not send notification",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-600" />
            Send notification
          </DialogTitle>
          <DialogDescription>
            {student
              ? `This message will appear on ${student.name}'s home page banner and in their notifications.`
              : "Send a message to the student."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notify-title">Title</Label>
            <Input
              id="notify-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Group update"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notify-message">Message</Label>
            <Textarea
              id="notify-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the announcement for the student…"
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label>Notification type</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as StudentNotificationType)}
              className="gap-2"
            >
              {STUDENT_NOTIFICATION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`notify-type-${option.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    type === option.value
                      ? "border-slate-400 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <RadioGroupItem value={option.value} id={`notify-type-${option.value}`} />
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: option.color }}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-slate-800">{option.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={sending}
            className="bg-primary hover:bg-primary/90"
          >
            Send notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
