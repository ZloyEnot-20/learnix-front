/**
 * Repair / display helpers for Cambridge listening markers (e.g. "D??").
 */

export function parseListeningTrack(v: unknown): number | null {
  if (v == null) return null
  const s = String(v).trim()
  const m = s.match(/^D?0*(\d+)$/i)
  if (!m) return null
  return Number(m[1])
}

/** Never show "D??" — return null if broken. */
export function displayListeningTrack(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  if (!s || /\?/.test(s)) return null
  const n = parseListeningTrack(s)
  if (n == null) return s
  return /^D/i.test(s) ? `D${String(n).padStart(2, "0")}` : String(n).padStart(2, "0")
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function valueOf(target: Record<string, unknown>): string | null {
  if (target.audio_track != null) return String(target.audio_track)
  if (target.audio != null) return String(target.audio)
  return null
}

function setValue(target: Record<string, unknown>, formatted: string) {
  if (target.audio_track != null) target.audio_track = formatted
  if (target.audio != null) target.audio = formatted
}

function formatTrack(n: number, preferD: boolean) {
  const body = String(n).padStart(2, "0")
  return preferD ? `D${body}` : body
}

function collectFromUnits(units: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const unit of units) {
    if (!isRecord(unit)) continue
    for (const section of Array.isArray(unit.sections) ? unit.sections : []) {
      if (!isRecord(section)) continue
      const exercises = Array.isArray(section.exercises) ? section.exercises : []
      let exerciseHasAudio = false
      for (const ex of exercises) {
        if (!isRecord(ex)) continue
        if (ex.audio_track == null && ex.audio == null) continue
        exerciseHasAudio = true
        out.push(ex)
      }
      if (!exerciseHasAudio && (section.audio_track != null || section.audio != null)) {
        out.push(section)
      }
    }
  }
  return out
}

/** Mutates units in place. Returns rewrite count. */
export function repairListeningAudioTracks(units: unknown[]): number {
  const list = collectFromUnits(units)
  if (!list.length) return 0

  let firstBad = -1
  let lastGood: number | null = null
  for (let i = 0; i < list.length; i++) {
    const n = parseListeningTrack(valueOf(list[i]))
    if (n == null) {
      firstBad = i
      break
    }
    lastGood = n
  }
  if (firstBad < 0 || lastGood == null) return 0

  let dVotes = 0
  let total = 0
  for (let i = firstBad; i < list.length; i++) {
    total++
    if (/^D/i.test(valueOf(list[i]) || "")) dVotes++
  }
  const preferD = dVotes >= total / 2

  let next = lastGood
  let prevRaw: string | null = null
  let prevAssigned: string | null = null
  let prevWasValid = false
  let changes = 0

  for (let i = firstBad; i < list.length; i++) {
    const raw = valueOf(list[i])
    const rawValid = parseListeningTrack(raw) != null
    let assigned: string
    if (prevWasValid && rawValid && prevRaw != null && raw === prevRaw && prevAssigned != null) {
      assigned = prevAssigned
    } else {
      next += 1
      assigned = formatTrack(next, preferD || /^D/i.test(raw || ""))
    }
    if (raw !== assigned) changes++
    setValue(list[i], assigned)
    prevRaw = raw
    prevAssigned = assigned
    prevWasValid = rawValid
  }
  return changes
}
