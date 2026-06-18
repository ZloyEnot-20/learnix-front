/** @type {import('next').NextConfig} */
const backendUrl = (
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "https://learnix-api.xyz")
).replace(/\/$/, "")

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
