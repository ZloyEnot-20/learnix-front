import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export function formatMoney(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  return `${moneyFormatter.format(Math.round(value))} som`
}

export function formatThousands(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  if (!value) return ''
  return moneyFormatter.format(Math.round(value))
}

export function parseDigits(input: string): number {
  const digits = input.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}
