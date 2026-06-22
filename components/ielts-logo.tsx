import Image from "next/image"
import Link from "next/link"

export function IELTSLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Go to home page"
      className={`inline-block rounded-sm transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    >
      <Image
        src="/logo.png"
        alt="Learnix"
        width={48}
        height={48}
        className="h-10 w-10 object-contain"
        priority
      />
    </Link>
  )
}
