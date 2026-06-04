import type { ExtraLevel } from "./api"

/** CEFR bands claimed by an extra level folder (via its `cefr` field in the DB). */
export function claimedCefrBands(extraLevels: ExtraLevel[]): Set<string> {
  const set = new Set<string>()
  for (const lvl of extraLevels) {
    const band = lvl.cefr?.trim().toUpperCase()
    if (band) set.add(band)
  }
  return set
}

/**
 * CEFR band used to bucket topics/vocab when a folder is open.
 * Extra levels (e.g. Advanced with cefr=C1) map to their band; CEFR keys pass through.
 */
export function contentCefrBand(
  selectedLevel: string | null,
  extraLevels: ExtraLevel[],
): string | null {
  if (!selectedLevel) return null
  const extra = extraLevels.find((l) => l.key === selectedLevel)
  if (extra?.cefr?.trim()) return extra.cefr.trim().toUpperCase()
  return selectedLevel
}
