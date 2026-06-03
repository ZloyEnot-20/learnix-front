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
import { Spinner } from "@/components/ui/spinner"

interface TestConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  unansweredCount: number
  totalQuestions: number
  confirming?: boolean
}

export function TestConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  unansweredCount,
  totalQuestions,
  confirming = false,
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
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog open while the request is in flight.
              e.preventDefault()
              onConfirm()
            }}
            disabled={confirming}
            className="bg-[#C8102E] hover:bg-[#A00D25]"
          >
            {confirming ? <Spinner aria-label="Loading" /> : "Submit Anyway"}
          </AlertDialogAction>
          <AlertDialogCancel disabled={confirming}>Go Back</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
