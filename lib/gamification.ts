/**
 * Shared gamification definitions (mirror the backend rules in
 * services/gamification.service.js). The backend is the source of truth for the
 * actual numbers; these helpers are only for labels/colours and CEFR gating.
 */

export interface StudentLevel {
  totalPoints: number
  level: number
  tier: TierId
  tierLabel: string
  levelName: string
  pointsIntoLevel: number
  pointsForNextLevel: number
  pointsToNextLevel: number
  breakdown: {
    homeworkPoints: number
    exercisePoints: number
    completedHomework: number
  }
  requirements: Record<string, number>
  unlockedCefrLevels: string[]
}

export type TierId = "bronze" | "silver" | "gold" | "diamond" | "master"

export interface TierMeta {
  id: TierId
  label: string
  minLevel: number
  maxLevel: number
  /** Tailwind classes for badges/icons. */
  badge: string
  ring: string
  bar: string
  /** Path to the tier badge image in /public, or null to fall back to an icon. */
  icon: string | null
  /** Short motivational tagline shown under the tier name. */
  tagline: string
  /** One-line prestige description for the "All levels" modal. */
  description: string
  /** Perks/rewards unlocked at this tier (drives engagement). */
  perks: string[]
}

export const TIERS: TierMeta[] = [
  {
    id: "bronze",
    label: "Bronze",
    minLevel: 1,
    maxLevel: 5,
    badge: "bg-amber-100 text-amber-800",
    ring: "from-amber-300 to-orange-400",
    bar: "bg-amber-500",
    icon: "/tiers/bronze.png",
    tagline: "Your journey begins",
    description: "Every great path starts with a first step. Here you build the foundations.",
    perks: ["A1 & A2 levels unlocked", "Daily practice", "First achievements"],
  },
  {
    id: "silver",
    label: "Silver",
    minLevel: 6,
    maxLevel: 10,
    badge: "bg-slate-200 text-slate-700",
    ring: "from-slate-300 to-slate-500",
    bar: "bg-slate-400",
    icon: "/tiers/silver.png",
    tagline: "Picking up pace",
    description: "You're no longer a beginner. Your knowledge is taking serious shape.",
    perks: ["B1 level unlocked", "Harder exercises", "Silver badge"],
  },
  {
    id: "gold",
    label: "Gold",
    minLevel: 11,
    maxLevel: 20,
    badge: "bg-yellow-100 text-yellow-800",
    ring: "from-yellow-300 to-amber-500",
    bar: "bg-yellow-500",
    icon: "/tiers/gold.png",
    tagline: "Among the best",
    description: "Gold is the fruit of effort and consistency. Few students reach this far.",
    perks: ["B2 level unlocked", "Advanced grammar", "Gold badge & ranking"],
  },
  {
    id: "diamond",
    label: "Diamond",
    minLevel: 21,
    maxLevel: 30,
    badge: "bg-cyan-100 text-cyan-800",
    ring: "from-cyan-300 to-sky-500",
    bar: "bg-cyan-500",
    icon: "/tiers/diamond.png",
    tagline: "Rare and valuable",
    description: "You polish like a diamond. Your discipline and knowledge are your true worth.",
    perks: ["C1 level unlocked", "IELTS-level materials", "Diamond badge"],
  },
  {
    id: "master",
    label: "Master",
    minLevel: 31,
    maxLevel: Number.POSITIVE_INFINITY,
    badge: "bg-fuchsia-100 text-fuchsia-800",
    ring: "from-fuchsia-400 to-purple-600",
    bar: "bg-fuchsia-500",
    icon: "/tiers/master.png",
    tagline: "Legendary tier",
    description: "The highest peak. You've elevated language learning to an art — a true Master.",
    perks: ["All levels open", "C2 exclusive content", "Master badge & top ranking"],
  },
]

export function tierForLevel(level: number): TierMeta {
  return TIERS.find((t) => level >= t.minLevel && level <= t.maxLevel) ?? TIERS[0]
}

/** Minimum student level required to unlock each CEFR folder. */
export const CEFR_LEVEL_REQUIREMENT: Record<string, number> = {
  A1: 1,
  A2: 3,
  B1: 6,
  B2: 11,
  C1: 16,
  C2: 21,
}

/** Whether a student of `level` can open a `cefr` folder. */
export function isCefrUnlocked(cefr: string, level: number): boolean {
  const required = CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
  return level >= required
}

export function requiredLevelFor(cefr: string): number {
  return CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
}
