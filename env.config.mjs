/** @typedef {"development" | "production" | "test"} NodeEnv */

const DEV_BACKEND = "http://localhost:4000"
const DEV_PUBLIC_API = `${DEV_BACKEND}/api`

function trimSlash(url) {
  return url.replace(/\/$/, "")
}

function isProduction() {
  return process.env.NODE_ENV === "production"
}

/**
 * Browser-facing API base URL (with /api suffix).
 * Required in production via NEXT_PUBLIC_API_URL.
 */
export function resolvePublicApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return trimSlash(process.env.NEXT_PUBLIC_API_URL)
  }
  if (!isProduction()) {
    return DEV_PUBLIC_API
  }
  throw new Error(
    "[env] NEXT_PUBLIC_API_URL is required for production (e.g. https://api.example.com/api)",
  )
}

/**
 * Backend origin for Next.js /api rewrites (no /api suffix).
 * Falls back to NEXT_PUBLIC_API_URL without the /api path segment.
 */
export function resolveBackendUrl() {
  if (process.env.BACKEND_URL) {
    return trimSlash(process.env.BACKEND_URL)
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return trimSlash(process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, ""))
  }
  if (!isProduction()) {
    return DEV_BACKEND
  }
  throw new Error(
    "[env] Set BACKEND_URL or NEXT_PUBLIC_API_URL for production builds",
  )
}
