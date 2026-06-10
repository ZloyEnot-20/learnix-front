"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  emptyUzPhoneDisplay,
  formatUzPhoneInput,
  UZ_PHONE_PREFIX,
} from "@/lib/phone"

const PREFIX_LEN = UZ_PHONE_PREFIX.length + 1 // "+998 "

export function UzbekPhoneInput({
  id,
  value,
  onChange,
  className,
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}) {
  const display = value || emptyUzPhoneDisplay()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatUzPhoneInput(e.target.value))
  }

  const handleFocus = () => {
    if (!value.trim() || value.trim() === UZ_PHONE_PREFIX) {
      onChange(emptyUzPhoneDisplay())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      (start < PREFIX_LEN || (start === end && start <= PREFIX_LEN))
    ) {
      e.preventDefault()
    }
  }

  return (
    <Input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn("font-mono", className)}
    />
  )
}
