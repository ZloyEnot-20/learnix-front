declare namespace NodeJS {
  interface ProcessEnv {
    /** Client API base URL, must include `/api` suffix. Required in production. */
    NEXT_PUBLIC_API_URL?: string
    /** Server rewrite target for `/api/*`, no `/api` suffix. Optional if NEXT_PUBLIC_API_URL is set. */
    BACKEND_URL?: string
    /** `next start` listen port (default 3000). */
    PORT?: string
  }
}
