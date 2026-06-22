import Link from "next/link"

export function IELTSLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Go to home page"
      className={`inline-block font-bold text-2xl rounded-sm transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      <span className="bg-primary text-primary-foreground px-3 py-1 tracking-tight">Learnix</span>
    </Link>
  )
}
