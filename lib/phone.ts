/** Strip everything except digits for consistent phone matching. */
export function normalizePhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (digits.startsWith("998")) return digits.slice(0, 12)
  if (digits.length === 9) return `998${digits}`
  return digits
}

export const UZ_PHONE_PREFIX = "+998"

const UZ_MOBILE_OPERATORS = new Set(["90", "91", "93", "94", "95", "97", "98", "99", "33", "88", "77"])

/** Local 9-digit part after country code 998. */
export function parseUzLocalDigits(input: string): string {
  const digits = normalizePhone(input)
  if (digits.startsWith("998")) return digits.slice(3, 12)
  return digits.replace(/^0+/, "").slice(0, 9)
}

export function toUzNormalizedPhone(input: string): string {
  const local = parseUzLocalDigits(input)
  return local ? `998${local}` : ""
}

export function emptyUzPhoneDisplay(): string {
  return `${UZ_PHONE_PREFIX} `
}

/** Format input as +998 XX XXX XX XX while typing. */
export function formatUzPhoneInput(input: string): string {
  const local = parseUzLocalDigits(input)
  if (!local) return emptyUzPhoneDisplay()

  let result = UZ_PHONE_PREFIX
  if (local.length > 0) result += ` ${local.slice(0, 2)}`
  if (local.length > 2) result += ` ${local.slice(2, 5)}`
  if (local.length > 5) result += ` ${local.slice(5, 7)}`
  if (local.length > 7) result += ` ${local.slice(7, 9)}`
  return result
}

export function isValidUzPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  if (!normalized.startsWith("998") || normalized.length !== 12) return false
  return UZ_MOBILE_OPERATORS.has(normalized.slice(3, 5))
}

export function isValidPhone(phone: string): boolean {
  return isValidUzPhone(phone)
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  if (digits.length >= 9) return `+${digits}`
  return phone
}
