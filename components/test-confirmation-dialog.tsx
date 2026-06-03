"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle } from "lucide-react"

interface TestConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  unansweredCount: number
  totalQuestions: number
}

export function TestConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  unansweredCount,
  totalQuestions,
}: TestConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Incomplete Test
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>
              You have <span className="font-semibold text-foreground">{unansweredCount}</span> unanswered question
              {unansweredCount !== 1 ? "s" : ""} out of {totalQuestions}.
            </div>
            <div>Are you sure you want to submit your test? Unanswered questions will be marked as incorrect.</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <AlertDialogAction onClick={onConfirm} className="bg-[#C8102E] hover:bg-[#A00D25]">
            Submit Anyway
          </AlertDialogAction>
          <AlertDialogCancel>Go Back</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
