/**
 * PM2: Next.js frontend.
 * Прод (foreground, без дублей): npm run prod
 * Первый деплой / после правок: npm run prod:deploy  (build + prod)
 * Остановка: npm run prod:stop
 *
 * Перед запуском: pnpm build (или prod:deploy).
 * Env: .env.production (NEXT_PUBLIC_API_URL, BACKEND_URL, PORT).
 */
module.exports = {
  apps: [
    {
      name: "learnix-front",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: "development", PORT: 3000 },
      env_production: { NODE_ENV: "production" },
    },
  ],
}
