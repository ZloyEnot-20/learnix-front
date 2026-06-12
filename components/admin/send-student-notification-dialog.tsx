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
import { Bell } from "lucide-react"
import type { Student } from "@/lib/admin-storage"
import { studentsApi } from "@/lib/api"
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
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle("")
      setMessage("")
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
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={sending}
            className="bg-[#C8102E] hover:bg-[#A00D25]"
          >
            Send notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
