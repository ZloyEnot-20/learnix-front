import { cn } from "@/lib/utils"
import { TIERS, type TierId } from "@/lib/gamification"

interface TierIconProps {
  tierId: TierId
  size?: number
  dimmed?: boolean
  className?: string
}

export function TierIcon({ tierId, size = 48, dimmed = false, className }: TierIconProps) {
  const tier = TIERS.find((t) => t.id === tierId) ?? TIERS[0]
  if (!tier.icon) return null

  return (
    <img
      src={tier.icon}
      alt={`${tier.label} tier`}
      width={size}
      height={size}
      className={cn(
        "shrink-0 object-contain drop-shadow-sm",
        dimmed && "opacity-65 grayscale-[0.35]",
        className,
      )}
    />
  )
}
