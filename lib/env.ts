import { resolveBackendUrl, resolvePublicApiUrl } from "../env.config.mjs"

/** Browser-facing REST API base URL (with `/api` suffix). */
export const PUBLIC_API_URL = resolvePublicApiUrl()

/** Backend origin for Next.js `/api` rewrites (no `/api` suffix). */
export const BACKEND_URL = resolveBackendUrl()
