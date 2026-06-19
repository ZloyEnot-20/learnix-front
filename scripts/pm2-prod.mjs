#!/usr/bin/env node
/**
 * PM2 production: daemon start/stop без дублирования процессов.
 *
 *   npm run prod        — pm2 delete ecosystem → start --env production (daemon, для VPS)
 *   npm run prod:stop   — pm2 delete all → pm2 kill
 */
import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const ecosystem = "ecosystem.config.cjs"

function pm2(args, { ignoreError = false } = {}) {
  const result = spawnSync("pm2", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  })
  if (!ignoreError && result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  return result
}

const command = process.argv[2]

if (command === "stop") {
  pm2(["delete", "all"], { ignoreError: true })
  pm2(["kill"], { ignoreError: true })
  process.exit(0)
}

if (command === "start") {
  if (!existsSync(join(root, ".next", "BUILD_ID"))) {
    console.error("[prod] Сначала соберите фронт: pnpm build  (или npm run prod:deploy)")
    process.exit(1)
  }
  pm2(["delete", ecosystem], { ignoreError: true })
  pm2(["start", ecosystem, "--env", "production"])
  process.exit(0)
}

console.error("Usage: node scripts/pm2-prod.mjs <start|stop>")
process.exit(1)
